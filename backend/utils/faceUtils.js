// Calculate Euclidean distance between two face embeddings
// A distance < 0.6 is generally considered a match for face-api.js default models.
// A distance < 0.45 is considered a strong duplicate match.
function calculateDistance(embedding1, embedding2) {
  let sum = 0;
  for (let i = 0; i < embedding1.length; i++) {
    sum += Math.pow(embedding1[i] - embedding2[i], 2);
  }
  return Math.sqrt(sum);
}

module.exports = {
  calculateDistance
};
