import * as THREE from 'three';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import { HeadPose } from './headPose';
import { OffAxisCamera } from './offAxisCamera';
import { calibrationManager, CalibrationData } from './calibration';

export interface ThreeSceneOptions {
  container: HTMLElement;
  width?: number;
  height?: number;
}

export class ThreeSceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private sparkRenderer: SparkRenderer;
  private offAxisCamera: OffAxisCamera;
  private model: THREE.Object3D | null = null;
  private splatMesh: SplatMesh | null = null;
  private logoGroup: THREE.Group | null = null;
  private logoPanel: THREE.Mesh | null = null;
  private splatForwardOffset: number = 0.0;
  private lodSplatCount: number = 500000;
  private lodRenderScale: number = 2.0;
  private renderAspect: number;
  private animationFrameId: number | null = null;
  private isRunning = false;
  private currentHeadPose: HeadPose = { x: 0.5, y: 0.5, z: 1 };
  private debugMode: boolean = false;
  private debugHelpers: THREE.Object3D[] = [];

  constructor(options: ThreeSceneOptions) {
    const width = options.width || options.container.clientWidth;
    const height = options.height || options.container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

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
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
      behindFoveate: 0.2
    });
    this.scene.add(this.sparkRenderer);

    this.loadSplatModel();
    this.createLogoPanel();
    this.createDebugHelpers();
  }

  private loadSplatModel(): void {
    this.splatMesh = new SplatMesh({
      url: '/media/Whimsical Pink Candy Cafe.ply',
      lod: true,
      lodScale: 1.0
    });
    this.splatMesh.position.set(0, -0.02, this.splatForwardOffset);
    this.splatMesh.scale.setScalar(0.05);
    this.scene.add(this.splatMesh);
  }

  private createLogoPanel(): void {
    this.logoGroup = new THREE.Group();
    this.logoGroup.position.set(0, 0.03, 0.02);
    this.logoGroup.scale.setScalar(0.689);
    this.scene.add(this.logoGroup);

    const wrapperPanel = this.createCardPanel({
      worldWidth: 0.168,
      worldHeight: 0.094,
      backgroundColor: 'rgba(0, 0, 0, 0.28)',
      borderColor: 'rgba(255, 255, 255, 0.14)',
      borderRadius: 22,
    });
    wrapperPanel.position.set(0, -0.022, -0.001);
    this.logoGroup.add(wrapperPanel);

    const texture = new THREE.TextureLoader().load('/media/SensAI-logo.png', (tex) => {
      const aspect = tex.image.width / tex.image.height;
      const panelHeight = 0.06;
      const panelWidth = panelHeight * aspect;
      if (this.logoPanel) {
        this.logoPanel.geometry.dispose();
        this.logoPanel.geometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
      }
    });
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const geometry = new THREE.PlaneGeometry(0.12, 0.06);
    this.logoPanel = new THREE.Mesh(geometry, material);
    this.logoGroup.add(this.logoPanel);

    const titlePanel = this.createTextPanel({
      text: 'Worlds in Action',
      fontSize: 92,
      fontWeight: 700,
      textColor: '#ffffff',
      paddingX: 18,
      paddingY: 16,
      worldHeight: 0.022,
    });
    titlePanel.position.set(0, -0.036, 0);
    this.logoGroup.add(titlePanel);

    const statsPanel = this.createStatsPanel({
      leftValue: '50+',
      leftLabel: 'Teams',
      rightValue: '200+',
      rightLabel: 'hackers',
      worldHeight: 0.026,
    });
    statsPanel.position.set(0, -0.056, 0);
    this.logoGroup.add(statsPanel);
  }

  private createCardPanel(options: {
    worldWidth: number;
    worldHeight: number;
    backgroundColor: string;
    borderColor: string;
    borderRadius: number;
  }): THREE.Mesh {
    const logicalWidth = 720;
    const logicalHeight = Math.round((options.worldHeight / options.worldWidth) * logicalWidth);
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = logicalWidth * scale;
    canvas.height = logicalHeight * scale;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to create 2D canvas context for card panel');
    }

    context.scale(scale, scale);
    context.clearRect(0, 0, logicalWidth, logicalHeight);
    this.drawRoundedRect(
      context,
      0.5,
      0.5,
      logicalWidth - 1,
      logicalHeight - 1,
      options.borderRadius
    );
    context.fillStyle = options.backgroundColor;
    context.fill();
    context.strokeStyle = options.borderColor;
    context.lineWidth = 1;
    context.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    const geometry = new THREE.PlaneGeometry(options.worldWidth, options.worldHeight);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(geometry, material);
  }

  private createTextPanel(options: {
    text: string;
    fontSize: number;
    fontWeight: number;
    textColor: string;
    paddingX: number;
    paddingY: number;
    worldHeight: number;
    backgroundColor?: string;
    borderColor?: string;
    borderRadius?: number;
  }): THREE.Mesh {
    const measureCanvas = document.createElement('canvas');
    const measureContext = measureCanvas.getContext('2d');
    if (!measureContext) {
      throw new Error('Failed to create 2D canvas context for text measurement');
    }

    const font = `${options.fontWeight} ${options.fontSize}px Inter, sans-serif`;
    measureContext.font = font;
    const metrics = measureContext.measureText(options.text);
    const textWidth = Math.ceil(metrics.width);
    const textHeight = Math.ceil(options.fontSize * 1.2);
    const logicalWidth = textWidth + options.paddingX * 2;
    const logicalHeight = textHeight + options.paddingY * 2;

    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = logicalWidth * scale;
    canvas.height = logicalHeight * scale;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to create 2D canvas context for text panel');
    }

    context.scale(scale, scale);
    context.clearRect(0, 0, logicalWidth, logicalHeight);

    if (options.backgroundColor) {
      this.drawRoundedRect(
        context,
        0.5,
        0.5,
        logicalWidth - 1,
        logicalHeight - 1,
        options.borderRadius ?? 0
      );
      context.fillStyle = options.backgroundColor;
      context.fill();

      if (options.borderColor) {
        context.strokeStyle = options.borderColor;
        context.lineWidth = 1;
        context.stroke();
      }
    }

    context.font = font;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = options.textColor;
    context.fillText(options.text, logicalWidth / 2, logicalHeight / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    const worldWidth = options.worldHeight * (logicalWidth / logicalHeight);
    const geometry = new THREE.PlaneGeometry(worldWidth, options.worldHeight);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const panel = new THREE.Mesh(geometry, material);
    panel.userData.panelWidth = worldWidth;
    return panel;
  }

  private createStatsPanel(options: {
    leftValue: string;
    leftLabel: string;
    rightValue: string;
    rightLabel: string;
    worldHeight: number;
  }): THREE.Mesh {
    const logicalWidth = 620;
    const logicalHeight = 126;
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = logicalWidth * scale;
    canvas.height = logicalHeight * scale;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to create 2D canvas context for stats panel');
    }

    context.scale(scale, scale);
    context.clearRect(0, 0, logicalWidth, logicalHeight);

    const sections = [
      {
        centerX: logicalWidth * 0.28,
        value: options.leftValue,
        label: options.leftLabel,
      },
      {
        centerX: logicalWidth * 0.72,
        value: options.rightValue,
        label: options.rightLabel,
      },
    ];

    sections.forEach((section) => {
      context.textAlign = 'center';
      context.fillStyle = '#ffffff';
      context.font = '700 42px Inter, sans-serif';
      context.textBaseline = 'alphabetic';
      context.fillText(section.value, section.centerX, 56);

      context.fillStyle = 'rgba(255, 255, 255, 0.82)';
      context.font = '300 26px Inter, sans-serif';
      context.textBaseline = 'alphabetic';
      context.fillText(section.label, section.centerX, 92);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    const worldWidth = options.worldHeight * (logicalWidth / logicalHeight);
    const geometry = new THREE.PlaneGeometry(worldWidth, options.worldHeight);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const panel = new THREE.Mesh(geometry, material);
    panel.userData.panelWidth = worldWidth;
    return panel;
  }

  private drawRoundedRect(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    const clampedRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + clampedRadius, y);
    context.lineTo(x + width - clampedRadius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + clampedRadius);
    context.lineTo(x + width, y + height - clampedRadius);
    context.quadraticCurveTo(x + width, y + height, x + width - clampedRadius, y + height);
    context.lineTo(x + clampedRadius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - clampedRadius);
    context.lineTo(x, y + clampedRadius);
    context.quadraticCurveTo(x, y, x + clampedRadius, y);
    context.closePath();
  }

  private disposeObject3D(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();

        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if ('map' in material && material.map) {
            material.map.dispose();
          }
          material.dispose();
        });
      }
    });
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

  updateHeadPose(headPose: HeadPose): void {
    this.currentHeadPose = headPose;
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.debugHelpers.forEach(helper => {
      helper.visible = enabled;
    });
  }

  updateCalibration(calibration: CalibrationData): void {
    this.offAxisCamera.updateCalibration(calibration);
  }

  updateModelPosition(x: number, y: number, z: number): void {
    if (this.model) {
      this.model.position.set(x, y, z);
    }
  }

  updateModelScale(scale: number): void {
    if (this.model) {
      this.model.scale.set(scale, scale, scale);
    }
  }

  getModelPosition(): { x: number; y: number; z: number } {
    if (this.model) {
      return {
        x: this.model.position.x,
        y: this.model.position.y,
        z: this.model.position.z
      };
    }
    return { x: 0, y: -0.09, z: -0.03 };
  }

  getModelScale(): number {
    if (this.model) {
      return this.model.scale.x;
    }
    return 0.071;
  }

  updateModelRotation(x: number, y: number, z: number): void {
    if (this.model) {
      this.model.rotation.set(x, y, z);
    }
  }

  getModelRotation(): { x: number; y: number; z: number } {
    if (this.model) {
      return {
        x: this.model.rotation.x,
        y: this.model.rotation.y,
        z: this.model.rotation.z
      };
    }
    return { x: 0, y: -0.628, z: 0 };
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    this.offAxisCamera.updateFromHeadPose(this.currentHeadPose);

    if (this.debugMode && this.debugHelpers.length > 1) {
      const worldPos = this.offAxisCamera.headPoseToWorldPosition(this.currentHeadPose);
      this.debugHelpers[1].position.set(worldPos.x, worldPos.y, worldPos.z);
    }

    this.renderer.render(this.scene, this.camera);
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

    if (this.model) {
      this.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    }

    if (this.splatMesh) {
      this.splatMesh.dispose();
    }

    if (this.logoGroup) {
      this.disposeObject3D(this.logoGroup);
      this.scene.remove(this.logoGroup);
    }

    this.sparkRenderer.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
