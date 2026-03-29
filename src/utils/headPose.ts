export interface HeadPose {
  x: number;
  y: number;
  z: number;
}

export interface SmoothedHeadPose extends HeadPose {
  rawX: number;
  rawY: number;
  rawZ: number;
}

export class HeadPoseTracker {
  private smoothedPose: HeadPose = { x: 0, y: 0, z: 1 };
  private smoothingFactor = 0.3;
  private baseInterOcularDistance = 0.1;

  constructor(smoothingFactor: number = 0.3) {
    this.smoothingFactor = Math.max(0.1, Math.min(0.9, smoothingFactor));
  }

  extractHeadPoseFromLandmarks(landmarks: any[]): HeadPose | null {
    if (!landmarks || landmarks.length === 0) {
      return null;
    }

    const firstFace = landmarks[0];

    if (!firstFace || firstFace.length < 468) {
      return null;
    }

    const leftEyeInner = firstFace[133];
    const rightEyeInner = firstFace[362];
    const noseTip = firstFace[1];
    const leftEyeOuter = firstFace[33];
    const rightEyeOuter = firstFace[263];

    const faceX = (leftEyeInner.x + rightEyeInner.x + noseTip.x) / 3;
    const faceY = (leftEyeInner.y + rightEyeInner.y + noseTip.y) / 3;

    const interOcularDist = Math.sqrt(
      Math.pow(rightEyeInner.x - leftEyeInner.x, 2) +
      Math.pow(rightEyeInner.y - leftEyeInner.y, 2)
    );

    const eyeWidth = Math.sqrt(
      Math.pow(rightEyeOuter.x - leftEyeOuter.x, 2) +
      Math.pow(rightEyeOuter.y - leftEyeOuter.y, 2)
    );

    const depthProxy = (interOcularDist + eyeWidth * 0.5) / (this.baseInterOcularDistance * 1.5);

    const clampedX = Math.max(0.2, Math.min(0.8, faceX));
    const clampedY = Math.max(0.2, Math.min(0.8, faceY));
    const clampedZ = Math.max(0.5, Math.min(2.0, depthProxy));

    this.smoothedPose.x = this.smoothedPose.x + this.smoothingFactor * (clampedX - this.smoothedPose.x);
    this.smoothedPose.y = this.smoothedPose.y + this.smoothingFactor * (clampedY - this.smoothedPose.y);
    this.smoothedPose.z = this.smoothedPose.z + this.smoothingFactor * (clampedZ - this.smoothedPose.z);

    return { ...this.smoothedPose };
  }

  getSmoothedPose(): HeadPose {
    return { ...this.smoothedPose };
  }

  reset(): void {
    this.smoothedPose = { x: 0.5, y: 0.5, z: 1 };
  }
}

export function headPoseToCamera(
  headPose: HeadPose,
  strengthX: number = 3,
  strengthY: number = 3,
  strengthZ: number = 4,
  baseZ: number = 8
): { x: number; y: number; z: number } {
  const cameraX = (0.5 - headPose.x) * strengthX;
  const cameraY = (0.5 - headPose.y) * strengthY;
  const cameraZ = baseZ - (headPose.z - 1) * strengthZ;

  return { x: cameraX, y: cameraY, z: cameraZ };
}
