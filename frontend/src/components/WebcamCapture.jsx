import { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';

const WebcamCapture = ({ onCapture, mode = 'register', loading: parentLoading }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [error, setError] = useState('');
  const [faceDetected, setFaceDetected] = useState(false);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [blinkCount, setBlinkCount] = useState(0);
  const [currentEAR, setCurrentEAR] = useState(0); // Debug: show current EAR value
  const [isEyesClosed, setIsEyesClosed] = useState(false); // Debug: show eye state
  const [captureLoading, setCaptureLoading] = useState(false); // Missing state!
  
  // Liveness detection state
  const blinkStartTime = useRef(null);
  const lastBlinkTime = useRef(0);
  const blinkDetectedRef = useRef(false);
  const blinkStartTimeRef = useRef(0);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        setIsModelLoaded(true);
        console.log('Face-api models loaded');
      } catch (err) {
        console.error('Error loading models:', err);
        setError('Failed to load face recognition models. Please refresh the page.');
      }
    };
    loadModels();
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

  // Detect faces and liveness
  const detectFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isModelLoaded) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detections.length > 0) {
      setFaceDetected(true);
      
      const detection = detections[0];
      const landmarks = detection.landmarks;

      // Liveness detection: Blink detection
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      
      const leftEAR = calculateEyeAspectRatio(leftEye);
      const rightEAR = calculateEyeAspectRatio(rightEye);
      const avgEAR = (leftEAR + rightEAR) / 2;

      // Update debug state
      setCurrentEAR(avgEAR.toFixed(3));

      // EAR threshold for blink detection (0.20 is more sensitive than 0.25)
      const EAR_THRESHOLD = 0.20;
      const BLINK_COOLDOWN = 500; // ms between blinks (reduced from 1000)
      const MIN_BLINK_FRAMES = 2; // Minimum frames eyes must be closed
      const MAX_BLINK_FRAMES = 15; // Maximum frames for a valid blink

      const now = Date.now();
      const eyesClosed = avgEAR < EAR_THRESHOLD;
      setIsEyesClosed(eyesClosed);

      // State machine for blink detection
      if (eyesClosed && !blinkDetectedRef.current) {
        // Eyes just closed - start counting
        blinkDetectedRef.current = true;
        blinkStartTimeRef.current = now;
      } else if (!eyesClosed && blinkDetectedRef.current) {
        // Eyes just opened - check if it was a valid blink
        const blinkDuration = now - blinkStartTimeRef.current;
        const framesClosed = Math.round(blinkDuration / 50); // Approximate frames
        
        // Valid blink: between MIN_BLINK_FRAMES and MAX_BLINK_FRAMES
        // and outside cooldown period
        if (framesClosed >= MIN_BLINK_FRAMES && 
            framesClosed <= MAX_BLINK_FRAMES && 
            now - lastBlinkTime.current > BLINK_COOLDOWN) {
          
          setBlinkCount(prev => {
            const newCount = prev + 1;
            console.log(`Blink ${newCount} detected! EAR was ${avgEAR.toFixed(3)}`);
            if (newCount >= 2) {
              setLivenessPassed(true);
              console.log('Liveness check PASSED!');
            }
            return newCount;
          });
          lastBlinkTime.current = now;
        }
        blinkDetectedRef.current = false;
      }

      // Draw face box and landmarks
      faceapi.draw.drawDetections(canvas, detections);
      faceapi.draw.drawFaceLandmarks(canvas, detections);
    } else {
      setFaceDetected(false);
    }
  }, [isModelLoaded]);

  // Calculate Eye Aspect Ratio for blink detection
  const calculateEyeAspectRatio = (eye) => {
    const p2_p6 = distance(eye[1], eye[5]);
    const p3_p5 = distance(eye[2], eye[4]);
    const p1_p4 = distance(eye[0], eye[3]);
    return (p2_p6 + p3_p5) / (2.0 * p1_p4);
  };

  const distance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  // Run detection loop
  useEffect(() => {
    if (!isModelLoaded) return;

    const interval = setInterval(detectFace, 50); // 20 FPS for better blink detection
    return () => clearInterval(interval);
  }, [detectFace, isModelLoaded]);

  // Handle capture
  const handleCapture = async () => {
    if (!faceDetected) {
      setError('No face detected. Please position your face in the frame.');
      return;
    }

    if (mode === 'login' && !livenessPassed) {
      setError('Liveness check failed. Please blink your eyes naturally 2 times.');
      return;
    }

    setCaptureLoading(true);
    setError('');

    try {
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

      // Get face descriptor (128-dimensional array)
      const descriptor = detections[0].descriptor;
      
      // Convert Float32Array to regular array
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
        <div className={`status ${faceDetected ? 'active' : ''}`}>
          {faceDetected ? '✓ Face Detected' : '○ Looking for face...'}
        </div>
        
        {mode === 'login' && (
          <>
            <div className={`status ${livenessPassed ? 'active' : ''}`}>
              {livenessPassed 
                ? '✓ Liveness Verified' 
                : `○ Blink: ${blinkCount}/2 (EAR: ${currentEAR})`}
            </div>
            <div className={`status ${isEyesClosed ? 'active' : ''}`} style={{fontSize: '12px'}}>
              {isEyesClosed ? '👁️ Eyes Closed' : '👁️ Eyes Open'}
            </div>
          </>
        )}
      </div>

      {mode === 'login' && !livenessPassed && (
        <div style={{textAlign: 'center', marginTop: '10px', color: '#666', fontSize: '14px'}}>
          <p><strong>💡 Tip:</strong> Blink naturally 2 times (not too fast, not too slow)</p>
          <p>Wait 1 second between blinks</p>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <button 
        onClick={handleCapture} 
        disabled={loading || !faceDetected || (mode === 'login' && !livenessPassed)}
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
