import React, { useState, useEffect } from 'react';
import { Sliders } from 'lucide-react';

interface ShoeControlPanelProps {
  onPositionChange: (x: number, y: number, z: number) => void;
  onScaleChange: (scale: number) => void;
  onRotationChange: (x: number, y: number, z: number) => void;
  initialPosition: { x: number; y: number; z: number };
  initialScale: number;
  initialRotation: { x: number; y: number; z: number };
}

const ShoeControlPanel: React.FC<ShoeControlPanelProps> = ({
  onPositionChange,
  onScaleChange,
  onRotationChange,
  initialPosition,
  initialScale,
  initialRotation
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [scale, setScale] = useState(initialScale);
  const [rotation, setRotation] = useState(initialRotation);
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    setPosition(initialPosition);
    setScale(initialScale);
    setRotation(initialRotation);
  }, [initialPosition, initialScale, initialRotation]);

  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newPosition = { ...position, [axis]: value };
    setPosition(newPosition);
    onPositionChange(newPosition.x, newPosition.y, newPosition.z);
  };

  const handleScaleChange = (value: number) => {
    setScale(value);
    onScaleChange(value);
  };

  const handleRotationChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newRotation = { ...rotation, [axis]: value };
    setRotation(newRotation);
    onRotationChange(newRotation.x, newRotation.y, newRotation.z);
  };

  return (
    <div className="absolute top-4 left-4 z-20">
      {isCollapsed ? (
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded transition-colors backdrop-blur-sm"
          aria-label="Open shoe controls"
          title="Shoe controls"
        >
          <Sliders size={14} />
        </button>
      ) : (
        <div className="bg-black bg-opacity-70 backdrop-blur-sm text-white rounded-lg shadow-lg max-w-xs">
          <div className="flex items-center justify-between p-4 pb-2">
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 hover:bg-white hover:bg-opacity-10 rounded transition-colors"
              aria-label="Close controls"
            >
              <Sliders size={14} />
            </button>
          </div>

          <div className="space-y-3 px-4 pb-4">
            <div>
              <label className="text-xs block mb-1">Position X: {position.x.toFixed(3)}</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={position.x}
                onChange={(e) => handlePositionChange('x', parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            <div>
              <label className="text-xs block mb-1">Position Y: {position.y.toFixed(3)}</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={position.y}
                onChange={(e) => handlePositionChange('y', parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            <div>
              <label className="text-xs block mb-1">Position Z: {position.z.toFixed(3)}</label>
              <input
                type="range"
                min="-2"
                max="1"
                step="0.01"
                value={position.z}
                onChange={(e) => handlePositionChange('z', parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            <div className="pt-2 border-t border-gray-600">
              <label className="text-xs block mb-1">Scale: {scale.toFixed(3)}</label>
              <input
                type="range"
                min="0.01"
                max="0.3"
                step="0.001"
                value={scale}
                onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            <div className="pt-2 border-t border-gray-600">
              <label className="text-xs block mb-1">Rotation: {(rotation.y * 180 / Math.PI).toFixed(0)}°</label>
              <input
                type="range"
                min={-Math.PI}
                max={Math.PI}
                step="0.01"
                value={rotation.y}
                onChange={(e) => handleRotationChange('y', parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoeControlPanel;
