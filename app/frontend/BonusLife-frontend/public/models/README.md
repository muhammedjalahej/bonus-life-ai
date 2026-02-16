# Face recognition models (for "Sign in with your face")

**By default the app loads models from a CDN** — you don’t need to add any files here.

If you want to use **local models** (e.g. offline or custom path), add the required files to this `models` directory and set in your `.env`:

```
VITE_FACE_MODELS_URL=/models
```

Download model files from:

**https://github.com/justadudewhohacks/face-api.js** (see the `weights/` folder)

You need the manifest and shard files for:

- `ssd_mobilenetv1_model`
- `face_landmark_68_model`
- `face_recognition_model`
