import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Maximize, Minimize, Settings, Bug, X, Camera } from 'lucide-react';
import FaceMeshView from './components/FaceMeshView';
import ThreeView, { ThreeViewHandle } from './components/ThreeView';
import CalibrationWizard from './components/CalibrationWizard';
import ShoeControlPanel from './components/ShoeControlPanel';
import { HeadPose, HeadPoseTracker } from './utils/headPose';
import { calibrationManager, CalibrationData } from './utils/calibration';

function App() {
  const [isCdnAvailable, setIsCdnAvailable] = useState(true);
  const [isCheckingCdn, setIsCheckingCdn] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [shoePosition, setShoePosition] = useState({ x: 0, y: -0.09, z: -0.03 });
  const [shoeScale, setShoeScale] = useState(0.071);
  const [shoeRotation, setShoeRotation] = useState({ x: 0, y: -0.628, z: 0 });
  const [isCameraViewCollapsed, setIsCameraViewCollapsed] = useState(false);
  const headPoseTrackerRef = useRef(new HeadPoseTracker(0.3));
  const syntheticFaceLandmarksRef = useRef(
    Array.from({ length: 468 }, () => ({ x: 0, y: 0, z: 0 }))
  );
  const landmarkBatchRef = useRef([syntheticFaceLandmarksRef.current]);
  const threeViewRef = useRef<ThreeViewHandle>(null);

  useEffect(() => {
    const checkCdnAvailability = async () => {
      setIsCheckingCdn(true);
      try {
        const faceMeshResponse = await fetch(
          'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js',
          { method: 'HEAD' }
        );

        const cameraResponse = await fetch(
          'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
          { method: 'HEAD' }
        );

        const drawingResponse = await fetch(
          'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
          { method: 'HEAD' }
        );

        setIsCdnAvailable(faceMeshResponse.ok && cameraResponse.ok && drawingResponse.ok);
      } catch (error) {
        console.error('Error checking CDN availability:', error);
        setIsCdnAvailable(false);
      } finally {
        setIsCheckingCdn(false);
      }
    };

    checkCdnAvailability();

    const intervalId = setInterval(checkCdnAvailability, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const handleHeadPoseUpdate = useCallback((rawPose: HeadPose | null) => {
    if (rawPose) {
      const landmarks = syntheticFaceLandmarksRef.current;
      landmarks[133].x = rawPose.x - 0.05;
      landmarks[133].y = rawPose.y;
      landmarks[362].x = rawPose.x + 0.05;
      landmarks[362].y = rawPose.y;
      landmarks[1].x = rawPose.x;
      landmarks[1].y = rawPose.y;
      landmarks[33].x = rawPose.x - 0.08;
      landmarks[33].y = rawPose.y;
      landmarks[263].x = rawPose.x + 0.08;
      landmarks[263].y = rawPose.y;

      const smoothedPose = headPoseTrackerRef.current.extractHeadPoseFromLandmarks(
        landmarkBatchRef.current
      );
      if (smoothedPose) {
        threeViewRef.current?.updateHeadPose(smoothedPose);
      }
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch (error) {
        console.error('Error entering fullscreen:', error);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (error) {
        console.error('Error exiting fullscreen:', error);
      }
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!calibrationManager.isCalibrated()) {
      setShowCalibration(true);
    }
  }, []);

  const handleCalibrationComplete = (newCalibration: CalibrationData) => {
    if (threeViewRef.current) {
      threeViewRef.current.updateCalibration(newCalibration);
    }
  };

  const toggleDebugMode = () => {
    const newDebugMode = !debugMode;
    setDebugMode(newDebugMode);
    if (threeViewRef.current) {
      threeViewRef.current.setDebugMode(newDebugMode);
    }
  };

  const handleShoePositionChange = (x: number, y: number, z: number) => {
    setShoePosition({ x, y, z });
    if (threeViewRef.current) {
      threeViewRef.current.updateModelPosition(x, y, z);
    }
  };

  const handleShoeScaleChange = (scale: number) => {
    setShoeScale(scale);
    if (threeViewRef.current) {
      threeViewRef.current.updateModelScale(scale);
    }
  };

  const handleShoeRotationChange = (x: number, y: number, z: number) => {
    setShoeRotation({ x, y, z });
    if (threeViewRef.current) {
      threeViewRef.current.updateModelRotation(x, y, z);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (threeViewRef.current) {
        const pos = threeViewRef.current.getModelPosition();
        const scale = threeViewRef.current.getModelScale();
        const rot = threeViewRef.current.getModelRotation();
        setShoePosition(pos);
        setShoeScale(scale);
        setShoeRotation(rot);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col relative">
      <main className="flex-1 relative">
        {!isCheckingCdn && !isCdnAvailable && (
          <div className="absolute top-4 left-4 right-4 z-30 max-w-2xl mx-auto p-3 bg-yellow-50 text-yellow-800 rounded-md">
            <p className="text-sm text-center">
              We're having trouble connecting to the required resources. Please check your internet connection.
            </p>
          </div>
        )}

        <div className="absolute inset-0">
          <ThreeView ref={threeViewRef} />
        </div>

        <ShoeControlPanel
          onPositionChange={handleShoePositionChange}
          onScaleChange={handleShoeScaleChange}
          onRotationChange={handleShoeRotationChange}
          initialPosition={shoePosition}
          initialScale={shoeScale}
          initialRotation={shoeRotation}
        />

        <div className="absolute bottom-4 right-4 z-10">
          {isCameraViewCollapsed && (
            <button
              onClick={() => setIsCameraViewCollapsed(false)}
              className="absolute bottom-0 right-0 z-20 p-1.5 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded transition-colors backdrop-blur-sm shadow-lg border border-white border-opacity-20"
              aria-label="Show camera view"
              title="Show camera view"
            >
              <Camera size={14} />
            </button>
          )}

          <div
            className={`relative overflow-hidden transition-all duration-200 ${
              isCameraViewCollapsed
                ? 'w-64 h-48 opacity-0 pointer-events-none'
                : 'w-64 h-48 opacity-100 rounded-lg shadow-2xl border-2 border-white'
            }`}
          >
            <button
              onClick={() => setIsCameraViewCollapsed(true)}
              className={`absolute top-2 right-2 z-10 p-1 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded transition-colors backdrop-blur-sm ${
                isCameraViewCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
              aria-label="Hide camera view"
              title="Hide camera view"
            >
              <X size={12} />
            </button>

            <FaceMeshView
              onHeadPoseUpdate={handleHeadPoseUpdate}
              showPreview={!isCameraViewCollapsed}
            />
          </div>
        </div>

        <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded transition-colors backdrop-blur-sm"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </button>

          <button
            onClick={() => setShowCalibration(true)}
            className="p-1.5 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded transition-colors backdrop-blur-sm"
            aria-label="Calibration settings"
            title="Calibration settings"
          >
            <Settings size={14} />
          </button>

          <button
            onClick={toggleDebugMode}
            className={`p-1.5 ${debugMode ? 'bg-blue-600' : 'bg-black bg-opacity-50'} hover:bg-opacity-70 text-white rounded transition-colors backdrop-blur-sm`}
            aria-label="Toggle debug mode"
            title="Toggle debug mode"
          >
            <Bug size={14} />
          </button>
        </div>
      </main>

      {showCalibration && (
        <CalibrationWizard
          onComplete={handleCalibrationComplete}
          onSkip={() => setShowCalibration(false)}
          onClose={() => setShowCalibration(false)}
        />
      )}
    </div>
  );
}

export default App;
