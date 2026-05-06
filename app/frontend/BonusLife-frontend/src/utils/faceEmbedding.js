/**
 * Face embedding for login (Option 2). Uses face-api.js to get a 128-d descriptor.
 * Uses tiny models for faster load and inference; loads from CDN by default.
 */

const MODELS_PATH = import.meta.env.VITE_FACE_MODELS_URL
  || 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights';

// Minimum detection confidence — filters out blurry or partial faces
const MIN_DETECTION_SCORE = 0.6;
// Minimum face box area as a fraction of frame area — rejects tiny/distant faces
const MIN_FACE_AREA_RATIO = 0.04;
// Frames averaged for enrollment (improves template quality)
const ENROLL_FRAMES = 5;
// Frames averaged for verification (improves matching stability)
const VERIFY_FRAMES = 3;

let modelsLoaded = false;

async function loadModels() {
  if (modelsLoaded) return;
  const faceapi = await import('face-api.js');
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
 * Detect a single face from a video frame and return embedding + bounding box.
 * Returns null if no qualifying face is found.
 * @param {HTMLVideoElement} video
 * @returns {Promise<{embedding: number[], box: {x,y,width,height}, score: number} | null>}
 */
export async function detectFace(video) {
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
  // inputSize 320 gives significantly better accuracy than 128 at modest cost
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: MIN_DETECTION_SCORE }))
    .withFaceLandmarks(true)
    .withFaceDescriptor();

  if (!detection || !detection.descriptor) return null;

  const { box } = detection.detection;
  const frameArea = video.videoWidth * video.videoHeight;
  const faceArea = box.width * box.height;
  if (faceArea / frameArea < MIN_FACE_AREA_RATIO) return null;

  return {
    embedding: Array.from(detection.descriptor),
    box: { x: box.x, y: box.y, width: box.width, height: box.height },
    score: detection.detection.score,
  };
}

function averageDescriptors(descriptors) {
  const len = descriptors[0].length;
  const avg = new Array(len).fill(0);
  for (const d of descriptors) {
    for (let i = 0; i < len; i++) avg[i] += d[i];
  }
  return avg.map((v) => v / descriptors.length);
}

/**
 * Capture N good frames and return an averaged embedding — use for enrollment.
 * @param {HTMLVideoElement} video
 * @param {number} [frames]
 * @param {(progress: number) => void} [onProgress]
 * @returns {Promise<number[] | null>}
 */
export async function getEnrollmentEmbedding(video, frames = ENROLL_FRAMES, onProgress) {
  const collected = [];
  const maxAttempts = frames * 8;
  let attempts = 0;
  while (collected.length < frames && attempts < maxAttempts) {
    attempts++;
    const result = await detectFace(video);
    if (result) {
      collected.push(result.embedding);
      onProgress?.(collected.length / frames);
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  if (collected.length < Math.ceil(frames / 2)) return null;
  return averageDescriptors(collected);
}

/**
 * Capture N frames quickly and return an averaged embedding — use for verification.
 * @param {HTMLVideoElement} video
 * @param {(result: {embedding:number[], box:object, score:number}|null) => void} [onDetect]
 * @returns {Promise<number[] | null>}
 */
export async function getVerificationEmbedding(video, onDetect) {
  const collected = [];
  const maxAttempts = VERIFY_FRAMES * 5;
  let attempts = 0;
  while (collected.length < VERIFY_FRAMES && attempts < maxAttempts) {
    attempts++;
    const result = await detectFace(video);
    if (result) {
      collected.push(result.embedding);
      onDetect?.(result);
    } else {
      onDetect?.(null);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!collected.length) return null;
  return averageDescriptors(collected);
}

// Backwards-compatible single-frame API
export async function getFaceEmbedding(video) {
  const result = await detectFace(video);
  return result ? result.embedding : null;
}
