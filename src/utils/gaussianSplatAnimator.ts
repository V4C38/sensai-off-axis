import { SplatMesh, dyno } from '@sparkjsdev/spark';

export const DEFAULT_ANIMATION_DURATION = 0.33;
export const MIN_FADE_IN_PROGRESS = 0.08;

export interface SplatAnimationOptions {
  duration?: number;
}

export class GaussianSplatAnimator {
  readonly splat: SplatMesh;
  duration: number;

  get isAnimating(): boolean {
    return this.animating;
  }

  private readonly opacityProgress = dyno.dynoFloat(1.0);
  private animating = false;
  private startTime = 0;
  private activeDuration = 0;
  private startProgress = 1;
  private targetProgress = 1;
  private resolveAnimation: (() => void) | null = null;

  constructor(splat: SplatMesh, options?: SplatAnimationOptions) {
    this.splat = splat;
    this.duration = options?.duration ?? DEFAULT_ANIMATION_DURATION;
  }

  apply(): void {
    this.splat.objectModifier = this.createOpacityModifier();
    this.splat.updateGenerator();
    this.splat.updateVersion();
  }

  animateIn(duration?: number): Promise<void> {
    if (this.opacityProgress.value < MIN_FADE_IN_PROGRESS) {
      this.setProgress(MIN_FADE_IN_PROGRESS);
    }

    return this.animateTo(1, duration ?? this.duration);
  }

  animateOut(duration?: number): Promise<void> {
    return this.animateTo(0, duration ?? this.duration);
  }

  stop(): void {
    if (!this.animating) {
      return;
    }

    this.animating = false;
    if (this.resolveAnimation) {
      const resolve = this.resolveAnimation;
      this.resolveAnimation = null;
      resolve();
    }
  }

  dispose(): void {
    this.stop();
  }

  tick(): void {
    if (!this.animating) {
      return;
    }

    const elapsed = (performance.now() - this.startTime) / 1000;
    const duration = Math.max(this.activeDuration, 0);
    const t = duration === 0 ? 1 : Math.min(elapsed / duration, 1);
    const easedT = this.easeInOutSine(t);

    this.setProgress(this.startProgress + (this.targetProgress - this.startProgress) * easedT);

    if (t >= 1) {
      this.finishAnimation();
    }
  }

  setProgress(value: number): void {
    const clampedValue = Math.max(0, Math.min(1, value));
    if (this.opacityProgress.value === clampedValue) {
      return;
    }

    this.opacityProgress.value = clampedValue;
    this.splat.updateVersion();
  }

  getProgress(): number {
    return this.opacityProgress.value;
  }

  private animateTo(targetProgress: number, duration: number): Promise<void> {
    this.stop();
    this.activeDuration = Math.max(duration, 0);
    this.startTime = performance.now();
    this.startProgress = this.opacityProgress.value;
    this.targetProgress = Math.max(0, Math.min(1, targetProgress));
    this.animating = true;

    if (this.activeDuration === 0) {
      this.setProgress(this.targetProgress);
      this.animating = false;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.resolveAnimation = resolve;
    });
  }

  private finishAnimation(): void {
    this.animating = false;
    if (this.resolveAnimation) {
      const resolve = this.resolveAnimation;
      this.resolveAnimation = null;
      resolve();
    }
  }

  private easeInOutSine(t: number): number {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  private createOpacityModifier() {
    const progress = this.opacityProgress;

    return dyno.dynoBlock(
      { gsplat: dyno.Gsplat },
      { gsplat: dyno.Gsplat },
      ({ gsplat }) => {
        const opacityDyno = new dyno.Dyno({
          inTypes: {
            gsplat: dyno.Gsplat,
            progress: 'float',
          },
          outTypes: { gsplat: dyno.Gsplat },
          statements: ({ inputs, outputs }) =>
            dyno.unindentLines(`
              ${outputs.gsplat} = ${inputs.gsplat};
              ${outputs.gsplat}.rgba.a *= ${inputs.progress};
            `),
        });

        const result = opacityDyno.apply({ gsplat, progress });
        return { gsplat: result.gsplat };
      }
    );
  }
}
