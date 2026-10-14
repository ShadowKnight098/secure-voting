import * as faceapi from '@vladmandic/face-api';

let modelsPromise = null;

export const loadFaceApiModels = async () => {
  // If already loaded in memory, return immediately
  if (
    faceapi.nets.tinyFaceDetector.isLoaded &&
    faceapi.nets.faceLandmark68Net.isLoaded &&
    faceapi.nets.faceRecognitionNet.isLoaded
  ) {
    return true;
  }

  // If loading is currently in progress, return the existing shared promise
  if (modelsPromise) {
    return modelsPromise;
  }

  modelsPromise = (async () => {
    try {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      return true;
    } catch (err) {
      modelsPromise = null; // allow retry on failure
      console.error('Failed to load Face-API neural network models:', err);
      throw err;
    }
  })();

  return modelsPromise;
};

export const areModelsLoaded = () => {
  return (
    faceapi.nets.tinyFaceDetector.isLoaded &&
    faceapi.nets.faceLandmark68Net.isLoaded &&
    faceapi.nets.faceRecognitionNet.isLoaded
  );
};

export default loadFaceApiModels;
