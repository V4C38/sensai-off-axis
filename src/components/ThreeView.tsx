import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ThreeSceneManager } from '../utils/threeScene';
import { HeadPose } from '../utils/headPose';
import { CalibrationData } from '../utils/calibration';

interface ThreeViewProps {
  headPose: HeadPose | null;
}

export interface ThreeViewHandle {
  updateCalibration: (calibration: CalibrationData) => void;
  setDebugMode: (enabled: boolean) => void;
  updateModelPosition: (x: number, y: number, z: number) => void;
  updateModelScale: (scale: number) => void;
  updateModelRotation: (x: number, y: number, z: number) => void;
  getModelPosition: () => { x: number; y: number; z: number };
  getModelScale: () => number;
  getModelRotation: () => { x: number; y: number; z: number };
}

const ThreeView = forwardRef<ThreeViewHandle, ThreeViewProps>(({ headPose }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<ThreeSceneManager | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    sceneManagerRef.current = new ThreeSceneManager({
      container: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight
    });

    sceneManagerRef.current.start();

    const handleResize = () => {
      if (containerRef.current && sceneManagerRef.current) {
        sceneManagerRef.current.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (sceneManagerRef.current) {
        sceneManagerRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (headPose && sceneManagerRef.current) {
      sceneManagerRef.current.updateHeadPose(headPose);
    }
  }, [headPose]);

  useImperativeHandle(ref, () => ({
    updateCalibration: (calibration: CalibrationData) => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.updateCalibration(calibration);
      }
    },
    setDebugMode: (enabled: boolean) => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.setDebugMode(enabled);
      }
    },
    updateModelPosition: (x: number, y: number, z: number) => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.updateModelPosition(x, y, z);
      }
    },
    updateModelScale: (scale: number) => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.updateModelScale(scale);
      }
    },
    getModelPosition: () => {
      if (sceneManagerRef.current) {
        return sceneManagerRef.current.getModelPosition();
      }
      return { x: 0, y: -0.09, z: -0.03 };
    },
    getModelScale: () => {
      if (sceneManagerRef.current) {
        return sceneManagerRef.current.getModelScale();
      }
      return 0.071;
    },
    updateModelRotation: (x: number, y: number, z: number) => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.updateModelRotation(x, y, z);
      }
    },
    getModelRotation: () => {
      if (sceneManagerRef.current) {
        return sceneManagerRef.current.getModelRotation();
      }
      return { x: 0, y: -0.628, z: 0 };
    },
  }));

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black"
      style={{ touchAction: 'none' }}
    />
  );
});

ThreeView.displayName = 'ThreeView';

export default ThreeView;
