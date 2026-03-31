import * as THREE from 'three';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import { HeadPose } from './headPose';
import { OffAxisCamera } from './offAxisCamera';
import { calibrationManager, CalibrationData } from './calibration';
import { GaussianSplatAnimator } from './gaussianSplatAnimator';
import { ALL_SPLAT_INDICES, assertValidSplatIndex, SplatIndex } from './sceneConfig';
import { SPLAT_CROSSFADE_DURATION_SECONDS } from './presentationScript';

export interface ThreeSceneOptions {
  container: HTMLElement;
  width?: number;
  height?: number;
}

interface CachedSplatEntry {
  mesh: SplatMesh;
  animator: GaussianSplatAnimator;
  initialized: Promise<void>;
}

const MAX_RENDER_PIXEL_RATIO = 1.25;
const LOD_SPLAT_COUNT = 1000000;
const LOD_RENDER_SCALE = 1.0;

export class ThreeSceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private sparkRenderer: SparkRenderer;
  private offAxisCamera: OffAxisCamera;
  private activeSplatMesh: SplatMesh | null = null;
  private outgoingSplatMesh: SplatMesh | null = null;
  private activeSplatAnimator: GaussianSplatAnimator | null = null;
  private outgoingSplatAnimator: GaussianSplatAnimator | null = null;
  private currentSplatIndex: SplatIndex = 1;
  private splatForwardOffset = 0.0;
  private modelPosition = new THREE.Vector3(0, -0.02, this.splatForwardOffset);
  private modelScale = 0.05;
  private modelRotation = new THREE.Euler(0, 0, 0);
  private readonly splatCache = new Map<SplatIndex, CachedSplatEntry>();
  private preloadAllSplatsPromise: Promise<void> | null = null;
  private loadRequestId = 0;
  private lodSplatCount = LOD_SPLAT_COUNT;
  private lodRenderScale = LOD_RENDER_SCALE;
  private renderAspect: number;
  private animationFrameId: number | null = null;
  private isRunning = false;
  private needsRender = true;
  private currentHeadPose: HeadPose = { x: 0.5, y: 0.5, z: 1 };
  private debugMode = false;
  private debugHelpers: THREE.Object3D[] = [];

  constructor(options: ThreeSceneOptions) {
    const width = options.width || options.container.clientWidth;
    const height = options.height || options.container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    this.camera = new THREE.PerspectiveCamera(200, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, -25);

    const calibration = calibrationManager.getCalibration();
    this.renderAspect = calibration.screenWidthCm / calibration.screenHeightCm;
    if (!Number.isFinite(this.renderAspect) || this.renderAspect <= 0) {
      throw new Error('Invalid calibration aspect ratio');
    }

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
    void this.preloadAllSplats();
  }

  async preloadAllSplats(): Promise<void> {
    if (this.preloadAllSplatsPromise) {
      return this.preloadAllSplatsPromise;
    }

    this.preloadAllSplatsPromise = Promise.all(
      ALL_SPLAT_INDICES.map(async (index) => {
        const entry = this.getOrCreateSplatEntry(index);
        await entry.initialized;
      })
    ).then(() => {
      this.needsRender = true;
    });

    return this.preloadAllSplatsPromise;
  }

  async prepareSplat(index: SplatIndex): Promise<void> {
    assertValidSplatIndex(index);

    const entry = this.getOrCreateSplatEntry(index);
    await entry.initialized;

    this.needsRender = true;
  }

  async showSplat(index: SplatIndex, crossfade: boolean = true): Promise<void> {
    assertValidSplatIndex(index);

    if (this.activeSplatMesh && this.currentSplatIndex === index) {
      if (!crossfade && this.activeSplatAnimator) {
        this.activeSplatAnimator.setProgress(1);
      }
      return;
    }

    const requestId = ++this.loadRequestId;
    const entry = this.getOrCreateSplatEntry(index);
    await entry.initialized;

    if (requestId !== this.loadRequestId) {
      return;
    }

    if (this.outgoingSplatMesh === entry.mesh) {
      this.scene.remove(this.outgoingSplatMesh);
      this.outgoingSplatAnimator?.stop();
      this.outgoingSplatMesh = null;
      this.outgoingSplatAnimator = null;
    }

    this.applyCurrentTransform(entry.mesh);
    entry.animator.setProgress(1);
    this.needsRender = true;
    await this.promoteSplat(entry.mesh, entry.animator, index, crossfade);
  }

  private async promoteSplat(
    nextMesh: SplatMesh,
    nextAnimator: GaussianSplatAnimator,
    index: SplatIndex,
    crossfade: boolean
  ): Promise<void> {
    this.disposeOutgoingSplat();

    if (crossfade && this.activeSplatMesh && this.activeSplatAnimator) {
      this.outgoingSplatMesh = this.activeSplatMesh;
      this.outgoingSplatAnimator = this.activeSplatAnimator;
      this.activeSplatMesh = null;
      this.activeSplatAnimator = null;
      await this.outgoingSplatAnimator.animateOut(SPLAT_CROSSFADE_DURATION_SECONDS);
      this.disposeOutgoingSplat();
    } else if (this.activeSplatMesh) {
      this.scene.remove(this.activeSplatMesh);
      this.activeSplatMesh = null;
      this.activeSplatAnimator = null;
    }

    this.activeSplatMesh = nextMesh;
    this.activeSplatAnimator = nextAnimator;
    this.currentSplatIndex = index;

    this.scene.add(nextMesh);
    this.activeSplatAnimator.setProgress(1);

    this.needsRender = true;
  }

  private getSplatUrl(index: SplatIndex): string {
    return `/media/${index}.ply`;
  }

  private getOrCreateSplatEntry(index: SplatIndex): CachedSplatEntry {
    const cachedEntry = this.splatCache.get(index);
    if (cachedEntry) {
      return cachedEntry;
    }

    const mesh = new SplatMesh({
      url: this.getSplatUrl(index),
      lod: true,
      lodScale: 1.0,
    });
    this.applyCurrentTransform(mesh);

    const animator = new GaussianSplatAnimator(mesh, {
      duration: SPLAT_CROSSFADE_DURATION_SECONDS,
    });
    animator.apply();
    animator.setProgress(0);

    const entry: CachedSplatEntry = {
      mesh,
      animator,
      initialized: mesh.initialized.then(() => undefined),
    };
    this.splatCache.set(index, entry);
    return entry;
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

    if (this.outgoingSplatMesh) {
      this.applyCurrentTransform(this.outgoingSplatMesh);
    }
  }

  private updateSplatAnimations(): void {
    this.activeSplatAnimator?.tick();
    this.outgoingSplatAnimator?.tick();

    if (this.outgoingSplatAnimator && !this.outgoingSplatAnimator.isAnimating && this.outgoingSplatAnimator.getProgress() <= 0) {
      this.disposeOutgoingSplat();
    }
  }

  private disposeOutgoingSplat(): void {
    if (!this.outgoingSplatMesh) {
      return;
    }

    this.scene.remove(this.outgoingSplatMesh);
    this.outgoingSplatMesh = null;
    this.outgoingSplatAnimator = null;
    this.needsRender = true;
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
    const hadActiveAnimations = Boolean(
      this.activeSplatAnimator?.isAnimating || this.outgoingSplatAnimator?.isAnimating
    );

    if (!this.needsRender && !hadActiveAnimations) {
      return;
    }

    this.updateSplatAnimations();
    this.offAxisCamera.updateFromHeadPose(this.currentHeadPose);

    if (this.debugMode && this.debugHelpers.length > 1) {
      const worldPos = this.offAxisCamera.headPoseToWorldPosition(this.currentHeadPose);
      this.debugHelpers[1].position.set(worldPos.x, worldPos.y, worldPos.z);
    }

    this.renderer.render(this.scene, this.camera);
    this.needsRender = Boolean(
      this.activeSplatAnimator?.isAnimating || this.outgoingSplatAnimator?.isAnimating
    );
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
    this.stop();

    if (this.activeSplatMesh) {
      this.scene.remove(this.activeSplatMesh);
      this.activeSplatMesh = null;
      this.activeSplatAnimator = null;
    }

    this.disposeOutgoingSplat();
    this.splatCache.forEach((entry) => {
      entry.animator.dispose();
      entry.mesh.dispose();
    });
    this.splatCache.clear();
    this.sparkRenderer.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
