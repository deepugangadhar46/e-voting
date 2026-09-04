import { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';

// State Enum for Liveness
const LIVENESS_STATE = {
  INITIALIZING: 'INITIALIZING',
  NO_FACE: 'NO_FACE',
  MULTIPLE_FACES: 'MULTIPLE_FACES',
  LOOK_FORWARD: 'LOOK_FORWARD', // Establishing baseline
  CHALLENGE: 'CHALLENGE', // Active challenge
  PASSED: 'PASSED',
  FAILED: 'FAILED'
};

const CHALLENGE_DIR = {
  LEFT: 'LEFT',
  RIGHT: 'RIGHT'
};

const CHALLENGE_TIMEOUT_MS = 15000; // 15 seconds

const WebcamCapture = ({ onCapture, mode = 'register', loading: parentLoading }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [error, setError] = useState('');
  const [captureLoading, setCaptureLoading] = useState(false);
  
  // Liveness states
  const [livenessState, setLivenessState] = useState(LIVENESS_STATE.INITIALIZING);
  const [challengeDir, setChallengeDir] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const baselineRatioRef = useRef(null);
  const challengeStartTimeRef = useRef(null);
  const faceDetectedRef = useRef(false);

  // Helper for distance
  const distance = (p1, p2) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

  // Load face-api models
  useEffect(() => {
    let isMounted = true;
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        if (isMounted) setIsModelLoaded(true);
        console.log('Face-api models loaded');
      } catch (err) {
        console.error('Error loading models:', err);
        if (isMounted) setError('Failed to load face recognition models.');
      }
    };
    loadModels();
    return () => { isMounted = false; };
  }, []);

  // Start webcam
  useEffect(() => {
    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing webcam:', err);
        setError('Cannot access webcam. Please allow camera permissions.');
      }
    };

    if (isModelLoaded) {
      startVideo();
    }

    return () => {
      // Cleanup: stop video stream
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [isModelLoaded]);

  // Handle retry
  const handleRetry = () => {
    setLivenessState(LIVENESS_STATE.INITIALIZING);
    setChallengeDir(null);
    baselineRatioRef.current = null;
    challengeStartTimeRef.current = null;
    setError('');
  };

  // Timer effect for challenge timeout
  useEffect(() => {
    if (livenessState === LIVENESS_STATE.CHALLENGE) {
      const interval = setInterval(() => {
        if (!challengeStartTimeRef.current) return;
        const elapsed = Date.now() - challengeStartTimeRef.current;
        const remaining = Math.max(0, CHALLENGE_TIMEOUT_MS - elapsed);
        setTimeLeft(Math.ceil(remaining / 1000));
        
        if (remaining === 0) {
          setLivenessState(LIVENESS_STATE.FAILED);
          setError('Liveness challenge timed out. Please try again.');
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [livenessState]);

  // Main detection loop
  const detectFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isModelLoaded) return;
    
    // Stop processing if passed or failed
    if (livenessState === LIVENESS_STATE.PASSED || livenessState === LIVENESS_STATE.FAILED) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Use fast detection without descriptors for liveness loop
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detections.length === 0) {
      faceDetectedRef.current = false;
      if (livenessState !== LIVENESS_STATE.NO_FACE) {
        setLivenessState(LIVENESS_STATE.NO_FACE);
      }
      return;
    }

    if (detections.length > 1) {
      faceDetectedRef.current = true;
      if (livenessState !== LIVENESS_STATE.MULTIPLE_FACES) {
        setLivenessState(LIVENESS_STATE.MULTIPLE_FACES);
      }
      return;
    }

    faceDetectedRef.current = true;

    const detection = detections[0];
    const landmarks = detection.landmarks;

    // Draw face box and landmarks
    faceapi.draw.drawDetections(canvas, detections);
    faceapi.draw.drawFaceLandmarks(canvas, detections);

    // Calculate ratio
    // We use the outer eye corners and nose tip for robust orientation
    const leftEye = landmarks.getLeftEye()[0];
    const rightEye = landmarks.getRightEye()[3];
    const nose = landmarks.getNose()[3];
    
    const distLeft = distance(leftEye, nose);
    const distRight = distance(rightEye, nose);
    const ratio = distLeft / distRight;

    // State machine logic
    setLivenessState(prevState => {
      // If we were recovering from no face or initializing, try to establish baseline
      if (prevState === LIVENESS_STATE.INITIALIZING || prevState === LIVENESS_STATE.NO_FACE || prevState === LIVENESS_STATE.MULTIPLE_FACES) {
        return LIVENESS_STATE.LOOK_FORWARD;
      }

      if (prevState === LIVENESS_STATE.LOOK_FORWARD) {
        // Assume user is looking forward if ratio is roughly between 0.8 and 1.2
        if (ratio > 0.8 && ratio < 1.2) {
          baselineRatioRef.current = ratio;
          
          // Start challenge
          const randomDir = Math.random() > 0.5 ? CHALLENGE_DIR.LEFT : CHALLENGE_DIR.RIGHT;
          setChallengeDir(randomDir);
          challengeStartTimeRef.current = Date.now();
          return LIVENESS_STATE.CHALLENGE;
        }
      }

      if (prevState === LIVENESS_STATE.CHALLENGE) {
        // Evaluate challenge
        // Thresholds: to pass left, ratio must increase significantly. To pass right, ratio must decrease significantly.
        // E.g., if asked to turn left, the distance to the right eye decreases (ratio increases > 1.4)
        if (challengeDir === CHALLENGE_DIR.LEFT && ratio > 1.4) {
          return LIVENESS_STATE.PASSED;
        }
        if (challengeDir === CHALLENGE_DIR.RIGHT && ratio < 0.6) {
          return LIVENESS_STATE.PASSED;
        }
      }

      return prevState;
    });

  }, [isModelLoaded, livenessState, challengeDir]);

  // Run detection interval
  useEffect(() => {
    if (!isModelLoaded) return;
    const interval = setInterval(detectFace, 100); // 10 FPS is enough for head movement
    return () => clearInterval(interval);
  }, [detectFace, isModelLoaded]);

  // Handle capture
  const handleCapture = async () => {
    if (!faceDetectedRef.current) {
      setError('No face detected. Please position your face in the frame.');
      return;
    }

    if (mode === 'login' && livenessState !== LIVENESS_STATE.PASSED) {
      setError('Liveness check not passed.');
      return;
    }

    setCaptureLoading(true);
    setError('');

    try {
      // Re-detect with descriptors for the final capture
      const video = videoRef.current;
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length === 0) {
        setError('Face lost during capture. Please try again.');
        setCaptureLoading(false);
        return;
      }

      const descriptor = detections[0].descriptor;
      const faceEmbedding = Array.from(descriptor);
      
      onCapture(faceEmbedding);
    } catch (err) {
      console.error('Capture error:', err);
      setError('Failed to capture face. Please try again.');
    } finally {
      setCaptureLoading(false);
    }
  };

  const loading = captureLoading || parentLoading;
  
  // Helpers for UI display
  const getStatusText = () => {
    if (!isModelLoaded) return 'Loading models...';
    switch (livenessState) {
      case LIVENESS_STATE.INITIALIZING: return 'Initializing...';
      case LIVENESS_STATE.NO_FACE: return 'No face detected';
      case LIVENESS_STATE.MULTIPLE_FACES: return 'Multiple faces detected! Please ensure only one face is visible.';
      case LIVENESS_STATE.LOOK_FORWARD: return 'Please look straight forward...';
      case LIVENESS_STATE.CHALLENGE: 
        return challengeDir === CHALLENGE_DIR.LEFT 
          ? `Turn your head slightly to your LEFT (${timeLeft}s)` 
          : `Turn your head slightly to your RIGHT (${timeLeft}s)`;
      case LIVENESS_STATE.PASSED: return 'Liveness Verified ✓';
      case LIVENESS_STATE.FAILED: return 'Liveness Failed';
      default: return 'Processing...';
    }
  };

  const isPassed = livenessState === LIVENESS_STATE.PASSED || mode === 'register';

  return (
    <div className="webcam-capture">
      <div className="webcam-container">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="webcam-video"
          width="640"
          height="480"
        />
        <canvas
          ref={canvasRef}
          className="webcam-canvas"
          width="640"
          height="480"
        />
      </div>

      <div className="status-indicators">
        <div className={`status ${livenessState === LIVENESS_STATE.PASSED ? 'active' : ''}`}>
          {getStatusText()}
        </div>
      </div>

      {livenessState === LIVENESS_STATE.FAILED && (
        <button type="button" onClick={handleRetry} className="btn-secondary" style={{ marginTop: '10px' }}>
          Retry Liveness Challenge
        </button>
      )}

      {error && <div className="error">{error}</div>}

      <button 
        onClick={handleCapture} 
        disabled={loading || !faceDetectedRef.current || (mode === 'login' && !isPassed)}
        className="btn-primary"
        style={{ marginTop: '16px' }}
      >
        {loading ? 'Processing...' : mode === 'register' ? 'Capture Face' : 'Verify Identity'}
      </button>

      {!isModelLoaded && <div className="loading">Loading face recognition models...</div>}
    </div>
  );
};

export default WebcamCapture;
