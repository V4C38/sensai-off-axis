import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { HeadPose } from '../utils/headPose';

declare global {
  interface Window {
    FaceMesh: any;
    drawConnectors: any;
    drawLandmarks: any;
    Camera: any;
    FACEMESH_TESSELATION: any;
    FACEMESH_RIGHT_EYE: any;
    FACEMESH_LEFT_EYE: any;
    FACEMESH_RIGHT_EYEBROW: any;
    FACEMESH_LEFT_EYEBROW: any;
    FACEMESH_FACE_OVAL: any;
    FACEMESH_LIPS: any;
  }
}

interface FaceMeshViewProps {
  onHeadPoseUpdate?: (headPose: HeadPose | null) => void;
}

const FaceMeshView: React.FC<FaceMeshViewProps> = ({ onHeadPoseUpdate }) => {
  const webcamRef = useRef<Webcam | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceMeshRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [cdnAvailable, setCdnAvailable] = useState(true);

  // Check if MediaPipe is available
  useEffect(() => {
    const checkMediaPipeAvailability = () => {
      // Check if MediaPipe libraries are loaded
      const isAvailable = 
        typeof window.FaceMesh !== 'undefined' && 
        typeof window.Camera !== 'undefined' && 
        typeof window.drawConnectors !== 'undefined';
      
      setCdnAvailable(isAvailable);
      return isAvailable;
    };
    
    // Initial check
    checkMediaPipeAvailability();
    
    // Set up a periodic check
    const intervalId = setInterval(checkMediaPipeAvailability, 1000);
    
    // Wait a bit and retry if not available initially
    const timeoutId = setTimeout(() => {
      if (!checkMediaPipeAvailability()) {
        console.log("MediaPipe not available after timeout, reloading scripts");
        // Reload scripts if not available after delay
        const head = document.getElementsByTagName('head')[0];
        
        ['camera_utils', 'drawing_utils', 'face_mesh'].forEach(lib => {
          const script = document.createElement('script');
          script.src = `https://cdn.jsdelivr.net/npm/@mediapipe/${lib}/${lib}.js`;
          script.crossOrigin = 'anonymous';
          head.appendChild(script);
        });
      }
    }, 3000);
    
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);

  const handleWebcamLoad = () => {
    console.log("Webcam loaded");
    setCameraReady(true);
    setIsLoading(false);
  };

  const handleWebcamError = (error: string | DOMException) => {
    console.error("Webcam error:", error);
    const errorMessage = error instanceof DOMException
      ? error.message
      : (typeof error === 'string' ? error : 'Error accessing camera');

    setLastError(errorMessage);
    setIsLoading(false);
  };

  const onResults = (results: any) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      if (onHeadPoseUpdate) {
        const landmarks = results.multiFaceLandmarks[0];
        if (landmarks && landmarks.length >= 468) {
          const leftEyeInner = landmarks[133];
          const rightEyeInner = landmarks[362];
          const noseTip = landmarks[1];
          const leftEyeOuter = landmarks[33];
          const rightEyeOuter = landmarks[263];

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

          const depthProxy = (interOcularDist + eyeWidth * 0.5) / 0.15;

          onHeadPoseUpdate({
            x: faceX,
            y: faceY,
            z: Math.max(0.5, Math.min(2.0, depthProxy))
          });
        }
      }

      for (const landmarks of results.multiFaceLandmarks) {
        window.drawConnectors(ctx, landmarks, window.FACEMESH_TESSELATION,
          { color: 'rgba(255, 255, 255, 0.2)', lineWidth: 0.8 });

        window.drawConnectors(ctx, landmarks, window.FACEMESH_RIGHT_EYE,
          { color: 'rgba(255, 255, 255, 0.8)', lineWidth: 1.5 });

        window.drawConnectors(ctx, landmarks, window.FACEMESH_LEFT_EYE,
          { color: 'rgba(255, 255, 255, 0.8)', lineWidth: 1.5 });

        window.drawConnectors(ctx, landmarks, window.FACEMESH_RIGHT_EYEBROW,
          { color: 'rgba(255, 255, 255, 0.8)', lineWidth: 1.5 });

        window.drawConnectors(ctx, landmarks, window.FACEMESH_LEFT_EYEBROW,
          { color: 'rgba(255, 255, 255, 0.8)', lineWidth: 1.5 });

        window.drawConnectors(ctx, landmarks, window.FACEMESH_FACE_OVAL,
          { color: 'rgba(255, 255, 255, 0.8)', lineWidth: 1.5 });

        window.drawConnectors(ctx, landmarks, window.FACEMESH_LIPS,
          { color: 'rgba(255, 255, 255, 0.8)', lineWidth: 1.5 });

        window.drawLandmarks(ctx, landmarks,
          { color: 'rgba(255, 255, 255, 0.6)', lineWidth: 0.8, radius: 1.2 });
      }
    } else if (onHeadPoseUpdate) {
      onHeadPoseUpdate(null);
    }

    ctx.restore();
  };

  // Initialize and start FaceMesh
  const startFaceMesh = () => {
    if (!webcamRef.current || !webcamRef.current.video || !canvasRef.current || isRunning) return;
    
    try {
      setIsLoading(true);
      
      // Check if MediaPipe is available
      if (!cdnAvailable) {
        throw new Error('MediaPipe libraries are not available. Please check your internet connection and try again.');
      }
      
      console.log("Initializing FaceMesh");
      
      // Initialize face mesh
      faceMeshRef.current = new window.FaceMesh({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
      });
      
      // Set options
      faceMeshRef.current.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      // Set up results handler
      faceMeshRef.current.onResults(onResults);
      
      console.log("Creating camera instance");
      
      // Initialize camera
      cameraRef.current = new window.Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (faceMeshRef.current && webcamRef.current && webcamRef.current.video) {
            try {
              await faceMeshRef.current.send({ image: webcamRef.current.video });
            } catch (error) {
              console.error("Error sending frame to facemesh:", error);
            }
          }
        },
        width: 640,
        height: 480
      });
      
      // Start camera
      console.log("Starting camera");
      cameraRef.current.start()
        .then(() => {
          console.log("Camera started successfully");
          setIsRunning(true);
          setLastError(null);
        })
        .catch((error: any) => {
          console.error("Error starting camera:", error);
          setLastError(error.message || "Failed to start camera");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } catch (error: any) {
      console.error("Error in startFaceMesh:", error);
      setLastError(error.message || "Failed to initialize face mesh");
      setIsLoading(false);
    }
  };

  // Stop FaceMesh
  const stopFaceMesh = () => {
    try {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
      }
      
      setIsRunning(false);
    } catch (error) {
      console.error("Error stopping face mesh:", error);
    }
  };

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      stopFaceMesh();
    };
  }, []);

  useEffect(() => {
    if (cameraReady && !isRunning && webcamRef.current?.video) {
      console.log("Starting face detection");
      startFaceMesh();
    }
  }, [cameraReady, isRunning]);

  // Handle retry when there's an error
  const handleRetry = () => {
    setLastError(null);
    if (isRunning) {
      stopFaceMesh();
    }
    
    // Small delay to ensure everything is cleaned up
    setTimeout(() => {
      startFaceMesh();
    }, 500);
  };

  // Handle refresh page
  const handleRefreshPage = () => {
    window.location.reload();
  };

  return (
    <div className="relative w-full h-full">
      <>
          {isLoading && !cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30 text-white">
              <div className="text-center">
                <p className="text-sm">Loading camera...</p>
              </div>
            </div>
          )}

          {lastError && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-500 bg-opacity-80 z-40 text-white p-2">
              <div className="text-center">
                <p className="text-sm font-medium mb-2">Error</p>
                <p className="text-xs">{lastError}</p>
                <div className="mt-2 flex gap-2 justify-center">
                  <button
                    className="px-2 py-1 text-xs bg-white text-red-600 font-medium rounded hover:bg-gray-100"
                    onClick={handleRetry}
                  >
                    Retry
                  </button>
                  <button
                    className="px-2 py-1 text-xs bg-white text-red-600 font-medium rounded hover:bg-gray-100"
                    onClick={handleRefreshPage}
                  >
                    Reload
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="absolute top-0 left-0 w-full h-full overflow-hidden bg-black">
            <Webcam
              ref={webcamRef}
              width={640}
              height={480}
              mirrored={true}
              audio={false}
              screenshotFormat="image/jpeg"
              onUserMedia={handleWebcamLoad}
              onUserMediaError={handleWebcamError}
              className="w-full h-full object-cover"
              videoConstraints={{
                width: 640,
                height: 480,
                facingMode: "user"
              }}
            />

            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="absolute top-0 left-0 w-full h-full"
            />
          </div>
        </>
    </div>
  );
};

export default FaceMeshView;