import * as THREE from 'three';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import { HeadPose } from './headPose';
import { OffAxisCamera } from './offAxisCamera';
import { calibrationManager, CalibrationData } from './calibration';

const SINGLE_SPLAT_URL = '/media/demoSplat.ply';

export interface ThreeSceneOptions {
  container: HTMLElement;
  width?: number;
  height?: number;
}

const MAX_RENDER_PIXEL_RATIO = 1.25;
const LOD_SPLAT_COUNT = 1000000;
const LOD_RENDER_SCALE = 1.0;

export class ThreeSceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private sparkRenderer: SparkRenderer;
  private offAxisCamera: OffAxisCamera;
  private activeSplatMesh: SplatMesh | null = null;
  private splatForwardOffset = 0.0;
  private modelPosition = new THREE.Vector3(0, -0.02, this.splatForwardOffset);
  private modelScale = 0.05;
  private modelRotation = new THREE.Euler(0, 0, 0);
  private lodSplatCount = LOD_SPLAT_COUNT;
  private lodRenderScale = LOD_RENDER_SCALE;
  private renderAspect: number;
  private animationFrameId: number | null = null;
  private isRunning = false;
  private needsRender = true;
  private currentHeadPose: HeadPose = { x: 0.5, y: 0.5, z: 1 };
  private debugMode = false;
  private debugHelpers: THREE.Object3D[] = [];
  private disposed = false;

  constructor(options: ThreeSceneOptions) {
    const width = options.width || options.container.clientWidth;
    const height = options.height || options.container.clientHeight;

    this.container = options.container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    this.camera = new THREE.PerspectiveCamera(200, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, -25);

    const calibration = calibrationManager.getCalibration();
    this.renderAspect = this.getRenderAspect(calibration);

    calibration.pixelWidth = width;
    calibration.pixelHeight = height;
    calibrationManager.updatePixelDimensions(width, height);

    this.offAxisCamera = new OffAxisCamera(this.camera, calibration);

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0xffffff, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_RENDER_PIXEL_RATIO));
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.left = '50%';
    this.renderer.domElement.style.top = '50%';
    this.renderer.domElement.style.transform = 'translate(-50%, -50%)';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.maxWidth = 'none';
    this.renderer.domElement.style.maxHeight = 'none';
    options.container.appendChild(this.renderer.domElement);
    this.applyRendererLayout(width, height);

    this.sparkRenderer = new SparkRenderer({
      renderer: this.renderer,
      enableLod: true,
      lodSplatCount: this.lodSplatCount,
      lodRenderScale: this.lodRenderScale,
      sortRadial: false,
      behindFoveate: 0.2,
    });
    this.scene.add(this.sparkRenderer);

    this.createDebugHelpers();
    void this.mountSingleSplatWhenReady();
  }

  private async mountSingleSplatWhenReady(): Promise<void> {
    const mesh = new SplatMesh({
      url: SINGLE_SPLAT_URL,
      lod: true,
      lodScale: 1.0,
    });
    this.applyCurrentTransform(mesh);

    await mesh.initialized;

    if (this.disposed) {
      mesh.dispose();
      return;
    }

    this.scene.add(mesh);
    this.activeSplatMesh = mesh;
    this.needsRender = true;
  }

  updateHeadPose(headPose: HeadPose): void {
    this.currentHeadPose = headPose;
    this.needsRender = true;
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.debugHelpers.forEach((helper) => {
      helper.visible = enabled;
    });
    this.needsRender = true;
  }

  updateCalibration(calibration: CalibrationData): void {
    this.offAxisCamera.updateCalibration(calibration);
    this.renderAspect = this.getRenderAspect(calibration);
    this.applyRendererLayout(this.container.clientWidth, this.container.clientHeight);
    this.needsRender = true;
  }

  updateModelPosition(x: number, y: number, z: number): void {
    this.modelPosition.set(x, y, z);
    this.applyTransformsToVisibleSplats();
    this.needsRender = true;
  }

  updateModelScale(scale: number): void {
    this.modelScale = scale;
    this.applyTransformsToVisibleSplats();
    this.needsRender = true;
  }

  getModelPosition(): { x: number; y: number; z: number } {
    return {
      x: this.modelPosition.x,
      y: this.modelPosition.y,
      z: this.modelPosition.z,
    };
  }

  getModelScale(): number {
    return this.modelScale;
  }

  updateModelRotation(x: number, y: number, z: number): void {
    this.modelRotation.set(x, y, z);
    this.applyTransformsToVisibleSplats();
    this.needsRender = true;
  }

  getModelRotation(): { x: number; y: number; z: number } {
    return {
      x: this.modelRotation.x,
      y: this.modelRotation.y,
      z: this.modelRotation.z,
    };
  }

  private applyCurrentTransform(mesh: SplatMesh): void {
    mesh.position.copy(this.modelPosition);
    mesh.scale.setScalar(this.modelScale);
    mesh.rotation.copy(this.modelRotation);
  }

  private applyTransformsToVisibleSplats(): void {
    if (this.activeSplatMesh) {
      this.applyCurrentTransform(this.activeSplatMesh);
    }
  }

  private createDebugHelpers(): void {
    const axesHelper = new THREE.AxesHelper(0.1);
    axesHelper.visible = false;
    this.debugHelpers.push(axesHelper);
    this.scene.add(axesHelper);

    const headPositionMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff00ff })
    );
    headPositionMarker.visible = false;
    this.debugHelpers.push(headPositionMarker);
    this.scene.add(headPositionMarker);
  }

  private animate = (): void => {
    if (!this.isRunning) {
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.animate);
    if (!this.needsRender) {
      return;
    }

    this.offAxisCamera.updateFromHeadPose(this.currentHeadPose);

    if (this.debugMode && this.debugHelpers.length > 1) {
      const worldPos = this.offAxisCamera.headPoseToWorldPosition(this.currentHeadPose);
      this.debugHelpers[1].position.set(worldPos.x, worldPos.y, worldPos.z);
    }

    this.renderer.render(this.scene, this.camera);
    this.needsRender = false;
  };

  start(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.animate();
    }
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resize(width: number, height: number): void {
    this.applyRendererLayout(width, height);
    this.needsRender = true;
  }

  private getRenderAspect(calibration: CalibrationData): number {
    const aspect = calibration.screenWidthCm / calibration.screenHeightCm;
    if (!Number.isFinite(aspect) || aspect <= 0) {
      throw new Error('Invalid calibration aspect ratio');
    }

    return aspect;
  }

  private applyRendererLayout(containerWidth: number, containerHeight: number): void {
    if (containerWidth <= 0 || containerHeight <= 0) {
      return;
    }

    const containerAspect = containerWidth / containerHeight;
    let renderWidth = containerWidth;
    let renderHeight = containerHeight;

    if (containerAspect > this.renderAspect) {
      renderWidth = Math.round(containerHeight * this.renderAspect);
    } else {
      renderHeight = Math.round(containerWidth / this.renderAspect);
    }

    this.renderer.setSize(renderWidth, renderHeight, false);
    this.renderer.domElement.style.width = `${renderWidth}px`;
    this.renderer.domElement.style.height = `${renderHeight}px`;
  }

  dispose(): void {
    this.disposed = true;
    this.stop();

    if (this.activeSplatMesh) {
      this.scene.remove(this.activeSplatMesh);
      this.activeSplatMesh.dispose();
      this.activeSplatMesh = null;
    }
    this.sparkRenderer.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
