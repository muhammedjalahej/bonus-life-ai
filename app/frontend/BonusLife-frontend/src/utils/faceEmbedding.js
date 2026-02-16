/**
 * Face embedding for login (Option 2). Uses face-api.js to get a 128-d descriptor.
 * Uses tiny models for faster load and inference; loads from CDN by default.
 */

const MODELS_PATH = import.meta.env.VITE_FACE_MODELS_URL
  || 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights';
let modelsLoaded = false;

async function loadModels() {
  if (modelsLoaded) return;
  const faceapi = await import('face-api.js');
  // Tiny models: smaller download and much faster inference than ssd_mobilenetv1 + faceLandmark68Net
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_PATH),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_PATH),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_PATH),
  ]);
  modelsLoaded = true;
}

/** Call when the face modal opens so models are ready before user clicks Capture. */
export function preloadFaceModels() {
  return loadModels().catch((e) => {
    console.warn('Face models preload failed.', e);
  });
}

/** True if models are already loaded (no wait when calling getFaceEmbedding). */
export function areModelsLoaded() {
  return modelsLoaded;
}

/**
 * Get 128-d face descriptor from a video element (current frame).
 * @param {HTMLVideoElement} video
 * @returns {Promise<number[] | null>} descriptor array or null if no face
 */
export async function getFaceEmbedding(video) {
  if (!video || !video.videoWidth) return null;
  try {
    await loadModels();
  } catch (e) {
    console.warn('Face models failed to load.', e);
    throw new Error(
      'Face recognition models could not be loaded. Check your connection or set VITE_FACE_MODELS_URL to /models and add model files to public/models.'
    );
  }
  const faceapi = await import('face-api.js');
  // Smaller inputSize = faster inference (128 is enough for face login)
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 128 }))
    .withFaceLandmarks(true)
    .withFaceDescriptor();
  if (!detection || !detection.descriptor) return null;
  return Array.from(detection.descriptor);
}
