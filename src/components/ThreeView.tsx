import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ThreeSceneManager } from '../utils/threeScene';
import { HeadPose } from '../utils/headPose';
import { CalibrationData } from '../utils/calibration';
import { SplatIndex } from '../utils/sceneConfig';

export interface ThreeViewHandle {
  preloadAllSplats: () => Promise<void>;
  prepareSplat: (index: SplatIndex) => Promise<void>;
  updateHeadPose: (headPose: HeadPose) => void;
  updateCalibration: (calibration: CalibrationData) => void;
  setDebugMode: (enabled: boolean) => void;
  showSplat: (index: SplatIndex, crossfade?: boolean) => Promise<void>;
  updateModelPosition: (x: number, y: number, z: number) => void;
  updateModelScale: (scale: number) => void;
  updateModelRotation: (x: number, y: number, z: number) => void;
  getModelPosition: () => { x: number; y: number; z: number };
  getModelScale: () => number;
  getModelRotation: () => { x: number; y: number; z: number };
}

const ThreeView = forwardRef<ThreeViewHandle>((_, ref) => {
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

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !sceneManagerRef.current) {
        return;
      }

      sceneManagerRef.current.resize(
        entry.contentRect.width,
        entry.contentRect.height
      );
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (sceneManagerRef.current) {
        sceneManagerRef.current.dispose();
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    preloadAllSplats: async () => {
      if (sceneManagerRef.current) {
        await sceneManagerRef.current.preloadAllSplats();
      }
    },
    prepareSplat: async (index: SplatIndex) => {
      if (sceneManagerRef.current) {
        await sceneManagerRef.current.prepareSplat(index);
      }
    },
    updateHeadPose: (headPose: HeadPose) => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.updateHeadPose(headPose);
      }
    },
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
    showSplat: async (index: SplatIndex, crossfade: boolean = true) => {
      if (sceneManagerRef.current) {
        await sceneManagerRef.current.showSplat(index, crossfade);
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
      className="relative w-full h-full bg-white overflow-hidden"
      style={{ touchAction: 'none' }}
    />
  );
});

ThreeView.displayName = 'ThreeView';

export default ThreeView;
