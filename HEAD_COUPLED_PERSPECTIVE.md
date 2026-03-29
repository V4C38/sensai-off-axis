# Head-Coupled Perspective Implementation

This document describes the head-coupled perspective feature implemented in this application.

## Overview

The application uses MediaPipe FaceMesh to track your head position in real-time and adjusts the Three.js camera perspective accordingly, creating a "Johnny Chung Lee" style head-coupled display effect. Your face tracking appears in a small window in the bottom right corner, while the main view shows a 3D scene that responds to your head movements.

## Current Implementation

### Architecture

1. **MediaPipe FaceMesh Tracking** (`src/components/FaceMeshView.tsx`)
   - Captures webcam video and detects facial landmarks
   - Extracts key points (eyes, nose) to compute head position
   - Reports normalized x, y, z coordinates via callback

2. **Head Pose Extraction** (`src/utils/headPose.ts`)
   - Converts facial landmarks to stable head position
   - Uses inter-ocular distance as depth proxy
   - Applies exponential moving average smoothing
   - Clamps values to prevent extreme movements

3. **Three.js Scene** (`src/utils/threeScene.ts`)
   - Renders a rotating cube with proper lighting
   - Updates camera position based on head pose each frame
   - Maintains camera looking at scene origin

4. **Integration** (`src/App.tsx`)
   - Full-screen Three.js scene as background
   - Small face tracking window in bottom right corner
   - Smooth head pose updates flowing from MediaPipe to Three.js

### Head Position Mapping

- **X-axis**: Horizontal head movement maps to horizontal camera translation
- **Y-axis**: Vertical head movement maps to vertical camera translation (inverted)
- **Z-axis**: Depth estimate from face size maps to camera distance

### Smoothing

The implementation uses exponential moving average (EMA) with a smoothing factor of 0.3 to reduce jitter while maintaining responsiveness.

## Upgrade Path: True Off-Axis Projection

The current implementation uses simple camera translation (parallax effect). For geometrically-correct perspective rendering, follow these steps:

### 1. Physical Calibration

Measure and configure:
- Screen width and height in meters
- Typical viewing distance
- Pixels per meter for conversion

### 2. Coordinate System Setup

Define the screen as a rectangle in 3D world space:
- Center at origin
- Screen corners in world coordinates
- Eye position relative to screen center

### 3. Off-Axis Frustum Calculation

Replace perspective projection with custom frustum:

```typescript
function computeOffAxisFrustum(
  eyePosition: Vector3,
  screenWidth: number,
  screenHeight: number,
  nearPlane: number,
  farPlane: number
): Matrix4 {
  const left = -screenWidth / 2 - eyePosition.x;
  const right = screenWidth / 2 - eyePosition.x;
  const bottom = -screenHeight / 2 - eyePosition.y;
  const top = screenHeight / 2 - eyePosition.y;
  const depth = eyePosition.z;

  const n = nearPlane;
  const f = farPlane;

  // Scale frustum sides by near plane distance
  const scale = n / depth;

  return new Matrix4().makePerspective(
    left * scale,
    right * scale,
    top * scale,
    bottom * scale,
    n,
    f
  );
}
```

### 4. Enhanced Pose Estimation

For full 6-DOF tracking:
- Use solvePnP to get rotation matrix and translation vector
- Apply both rotation and translation to camera
- Adjust frustum based on eye position and orientation

### 5. Integration

Replace in `ThreeSceneManager.animate()`:
```typescript
// Instead of:
this.camera.position.set(x, y, z);
this.camera.lookAt(0, 0, 0);

// Use:
const eyePos = new THREE.Vector3(x, y, z);
this.camera.projectionMatrix = computeOffAxisFrustum(
  eyePos,
  this.screenWidth,
  this.screenHeight,
  0.1,
  1000
);
```

## Performance Notes

- MediaPipe and Three.js run in independent render loops
- No blocking between face tracking and 3D rendering
- Head pose updates are non-blocking via React state
- Typical frame rate: 30-60 FPS depending on device

## Customization

Adjust sensitivity in `src/utils/headPose.ts`:
- `strengthX`: Horizontal movement sensitivity (default: 4)
- `strengthY`: Vertical movement sensitivity (default: 3)
- `strengthZ`: Depth movement sensitivity (default: 2)
- `smoothingFactor`: Smoothing amount 0-1 (default: 0.3)
