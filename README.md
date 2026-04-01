# Head-coupled perspective viewer (Gaussian splat fork)

This is a fork of Ian Curtis's original off-axis sneaker project, which takes the classic head-coupled perspective trick and makes it feel surprisingly solid in the browser. The original version renders a 3D model; this fork keeps the same general idea but swaps the mesh out for a **Gaussian splat**, rendered with **SparkJS** from a **Worldlabs Marble** capture.

> Same webcam-driven off-axis illusion, different scene representation: **Gaussian Splat**  
> Original project credit goes to **Ian Curtis**.

![Demo](assets/demo_1.gif)

**Live demo:** [off-axis-sneaker.bolt.host](https://off-axis-sneaker.bolt.host)

---

## This repo contains

- A **Vite + React + TypeScript** web app
- **MediaPipe** face landmarks for head pose
- **Three.js** for the WebGL view, with **Spark** for **splat** rendering (`SplatMesh` / `SparkRenderer`)
- A **calibration wizard** for physical screen size and viewing distance
- Debug helpers, face preview, and a control panel for splat transform

## Features

- Real-time head tracking (MediaPipe Face Mesh / Tasks)
- Off-axis style camera response to head movement
- **3D Gaussian splat** scene content (demo asset: `public/media/demoSplat.ply`)
- Calibration and sensitivity tuning for a convincing “window into a world” effect
- Optional debug visualization and MediaPipe CDN connectivity checks

## Getting started

**Prerequisites:** a modern browser with WebGL2, WebAssembly, and webcam access.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Open the app, allow the camera, and complete the **calibration wizard** for best results.
4. Move your head: the splat should stay locked in depth the way the original mesh viewer did—only the **representation** of the object has changed.

> **Note:** `@vitejs/plugin-react` **4.7+** is required if you use **Vite 7** (peer dependency range). If `npm install` fails on peers, upgrade the plugin or use `npm install --legacy-peer-deps` only as a last resort.

## Performance

- Separate update paths for tracking vs rendering where possible.
- GPU-side splat rendering via Spark; keep an eye on splat count and resolution on low-end GPUs.
- Typical framing lands in a ~30–60 FPS band depending on device and LOD.

## Acknowledgments

- [MediaPipe](https://developers.google.com/mediapipe)
- [three.js](https://threejs.org/)
- [Spark](https://github.com/sparkjsdev/spark) (splat rendering)
- [Johnny Chung Lee](http://johnnylee.net/)
- [Ian Curtis](https://github.com/icurtis1/off-axis-sneaker) — original head-coupled viewer concept and UX this fork builds on
