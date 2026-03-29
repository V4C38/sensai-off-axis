export interface CalibrationData {
  screenWidthCm: number;
  screenHeightCm: number;
  viewingDistanceCm: number;
  pixelWidth: number;
  pixelHeight: number;
  isCalibrated: boolean;
}

const CALIBRATION_STORAGE_KEY = 'parallax_calibration_v1';

const DEFAULT_CALIBRATION: CalibrationData = {
  screenWidthCm: 34,
  screenHeightCm: 19,
  viewingDistanceCm: 60,
  pixelWidth: 1920,
  pixelHeight: 1080,
  isCalibrated: false,
};

export class CalibrationManager {
  private data: CalibrationData;

  constructor() {
    this.data = this.loadCalibration();
  }

  private loadCalibration(): CalibrationData {
    try {
      const stored = localStorage.getItem(CALIBRATION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_CALIBRATION, ...parsed };
      }
    } catch (error) {
      console.error('Error loading calibration:', error);
    }
    return { ...DEFAULT_CALIBRATION };
  }

  saveCalibration(data: Partial<CalibrationData>): void {
    this.data = { ...this.data, ...data, isCalibrated: true };
    try {
      localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(this.data));
    } catch (error) {
      console.error('Error saving calibration:', error);
    }
  }

  getCalibration(): CalibrationData {
    return { ...this.data };
  }

  isCalibrated(): boolean {
    return this.data.isCalibrated;
  }

  resetCalibration(): void {
    this.data = { ...DEFAULT_CALIBRATION };
    try {
      localStorage.removeItem(CALIBRATION_STORAGE_KEY);
    } catch (error) {
      console.error('Error resetting calibration:', error);
    }
  }

  updateScreenDimensions(widthCm: number, heightCm: number): void {
    this.saveCalibration({ screenWidthCm: widthCm, screenHeightCm: heightCm });
  }

  updateViewingDistance(distanceCm: number): void {
    this.saveCalibration({ viewingDistanceCm: distanceCm });
  }

  updatePixelDimensions(width: number, height: number): void {
    this.saveCalibration({ pixelWidth: width, pixelHeight: height });
  }

  getCmPerPixel(): { x: number; y: number } {
    return {
      x: this.data.screenWidthCm / this.data.pixelWidth,
      y: this.data.screenHeightCm / this.data.pixelHeight,
    };
  }

  getScreenAspectRatio(): number {
    return this.data.screenWidthCm / this.data.screenHeightCm;
  }

  estimateViewingDistanceFromFaceWidth(faceWidthNormalized: number, assumedRealFaceWidthCm: number = 15): number {
    const faceWidthPixels = faceWidthNormalized * this.data.pixelWidth;
    const cmPerPixel = this.getCmPerPixel();
    const faceWidthCm = faceWidthPixels * cmPerPixel.x;

    const estimatedDistance = (assumedRealFaceWidthCm * this.data.screenWidthCm) / faceWidthCm;

    return Math.max(20, Math.min(150, estimatedDistance));
  }
}

export const calibrationManager = new CalibrationManager();
