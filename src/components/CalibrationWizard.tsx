import React, { useState, useEffect } from 'react';
import { X, Ruler, Monitor, Eye, Check } from 'lucide-react';
import { calibrationManager, CalibrationData } from '../utils/calibration';

interface CalibrationWizardProps {
  onComplete: (calibration: CalibrationData) => void;
  onSkip: () => void;
  onClose: () => void;
}

type Step = 'intro' | 'screen-size' | 'viewing-distance' | 'test';

const CalibrationWizard: React.FC<CalibrationWizardProps> = ({ onComplete, onSkip, onClose }) => {
  const [step, setStep] = useState<Step>('intro');
  const [screenWidthCm, setScreenWidthCm] = useState(34);
  const [screenHeightCm, setScreenHeightCm] = useState(19);
  const [viewingDistanceCm, setViewingDistanceCm] = useState(60);
  const [useInches, setUseInches] = useState(false);

  useEffect(() => {
    const calibration = calibrationManager.getCalibration();
    setScreenWidthCm(calibration.screenWidthCm);
    setScreenHeightCm(calibration.screenHeightCm);
    setViewingDistanceCm(calibration.viewingDistanceCm);
  }, []);

  const handleComplete = () => {
    const calibration: Partial<CalibrationData> = {
      screenWidthCm,
      screenHeightCm,
      viewingDistanceCm,
      isCalibrated: true,
    };
    calibrationManager.saveCalibration(calibration);
    onComplete(calibrationManager.getCalibration());
  };

  const handleSkip = () => {
    calibrationManager.saveCalibration({ isCalibrated: true });
    onSkip();
  };

  const cmToInches = (cm: number) => (cm / 2.54).toFixed(1);
  const inchesToCm = (inches: number) => inches * 2.54;

  const renderIntro = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-light text-white">Parallax Calibration</h2>
      <p className="text-gray-400 text-sm leading-relaxed">
        To create the best head-tracked parallax effect, we need to calibrate your screen dimensions and viewing distance.
      </p>
      <div className="space-y-3 text-sm text-gray-400">
        <div className="flex items-center gap-3">
          <Ruler className="w-4 h-4 text-orange-500" />
          <span>Ruler or measuring tape</span>
        </div>
        <div className="flex items-center gap-3">
          <Monitor className="w-4 h-4 text-orange-500" />
          <span>Screen dimensions</span>
        </div>
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 text-orange-500" />
          <span>Distance from screen</span>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => setStep('screen-size')}
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 px-4 rounded transition-colors text-sm"
        >
          Start
        </button>
        <button
          onClick={handleSkip}
          className="text-gray-400 hover:text-white py-2.5 px-4 rounded transition-colors text-sm"
        >
          Skip
        </button>
      </div>
    </div>
  );

  const renderScreenSize = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-light text-white">Screen Dimensions</h2>
      <p className="text-gray-400 text-sm leading-relaxed">
        Measure the visible screen area (not including bezels).
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setUseInches(false)}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${!useInches ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          cm
        </button>
        <button
          onClick={() => setUseInches(true)}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${useInches ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          in
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-2">
            Width {useInches ? '(inches)' : '(cm)'}
          </label>
          <input
            type="number"
            value={useInches ? Number(cmToInches(screenWidthCm)) : screenWidthCm}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              setScreenWidthCm(useInches ? inchesToCm(value) : value);
            }}
            onFocus={(e) => e.target.select()}
            className="w-full bg-transparent text-white border-b border-gray-700 focus:border-orange-500 focus:outline-none py-2 text-sm transition-colors"
            step="0.1"
            min="10"
            max="200"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-2">
            Height {useInches ? '(inches)' : '(cm)'}
          </label>
          <input
            type="number"
            value={useInches ? Number(cmToInches(screenHeightCm)) : screenHeightCm}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              setScreenHeightCm(useInches ? inchesToCm(value) : value);
            }}
            onFocus={(e) => e.target.select()}
            className="w-full bg-transparent text-white border-b border-gray-700 focus:border-orange-500 focus:outline-none py-2 text-sm transition-colors"
            step="0.1"
            min="10"
            max="200"
          />
        </div>

        <div className="text-xs text-gray-500 pt-2">
          Aspect Ratio: {(screenWidthCm / screenHeightCm).toFixed(2)}:1
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => setStep('intro')}
          className="text-gray-400 hover:text-white py-2.5 px-4 rounded transition-colors text-sm"
        >
          Back
        </button>
        <button
          onClick={() => setStep('viewing-distance')}
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 px-4 rounded transition-colors text-sm"
        >
          Next
        </button>
      </div>
    </div>
  );

  const renderViewingDistance = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-light text-white">Viewing Distance</h2>
      <p className="text-gray-400 text-sm leading-relaxed">
        Enter the typical distance between your eyes and the screen.
      </p>

      <div>
        <label className="block text-xs text-gray-400 mb-2">
          Distance from Screen {useInches ? '(inches)' : '(cm)'}
        </label>
        <input
          type="number"
          value={useInches ? Number(cmToInches(viewingDistanceCm)) : viewingDistanceCm}
          onChange={(e) => {
            const value = parseFloat(e.target.value) || 0;
            setViewingDistanceCm(useInches ? inchesToCm(value) : value);
          }}
          onFocus={(e) => e.target.select()}
          className="w-full bg-transparent text-white border-b border-gray-700 focus:border-orange-500 focus:outline-none py-2 text-sm transition-colors"
          step="1"
          min="20"
          max="200"
        />
        <p className="mt-3 text-xs text-gray-500">
          Typical: {useInches ? '20-24 in (laptop) / 24-32 in (desktop)' : '50-60 cm (laptop) / 60-80 cm (desktop)'}
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => setStep('screen-size')}
          className="text-gray-400 hover:text-white py-2.5 px-4 rounded transition-colors text-sm"
        >
          Back
        </button>
        <button
          onClick={() => setStep('test')}
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 px-4 rounded transition-colors text-sm"
        >
          Next
        </button>
      </div>
    </div>
  );

  const renderTest = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-light text-white">Test Your Setup</h2>
      <p className="text-gray-400 text-sm leading-relaxed">
        Move your head around. The 3D scene should respond as if you're looking through a window.
      </p>

      <div className="space-y-2 text-xs text-gray-400">
        <p>• Moving left reveals the right side</p>
        <p>• Moving right reveals the left side</p>
        <p>• Moving up/down changes vertical perspective</p>
      </div>

      <p className="text-xs text-orange-400">
        Tip: Use fullscreen mode for the best experience
      </p>

      <div className="pt-2 border-t border-gray-800">
        <div className="space-y-1 text-xs text-gray-500">
          <p>Screen: {screenWidthCm.toFixed(1)} × {screenHeightCm.toFixed(1)} cm</p>
          <p>Distance: {viewingDistanceCm.toFixed(1)} cm</p>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => setStep('viewing-distance')}
          className="text-gray-400 hover:text-white py-2.5 px-4 rounded transition-colors text-sm"
        >
          Adjust
        </button>
        <button
          onClick={() => {
            handleComplete();
            onClose();
          }}
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 px-4 rounded transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Check size={16} />
          Complete
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-black max-w-md w-full p-8 relative border border-gray-800 rounded-sm">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X size={18} />
        </button>

        {step === 'intro' && renderIntro()}
        {step === 'screen-size' && renderScreenSize()}
        {step === 'viewing-distance' && renderViewingDistance()}
        {step === 'test' && renderTest()}
      </div>
    </div>
  );
};

export default CalibrationWizard;
