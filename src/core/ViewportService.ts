export interface SafeAreaInsets {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

export type ViewportOrientation = 'landscape' | 'portrait';

export interface ViewportSnapshot {
  readonly height: number;
  readonly orientation: ViewportOrientation;
  readonly safeArea: Readonly<SafeAreaInsets>;
  readonly width: number;
}

const ZERO_SAFE_AREA: Readonly<SafeAreaInsets> = Object.freeze({
  bottom: 0,
  left: 0,
  right: 0,
  top: 0,
});

const sanitizeDimension = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

export class ViewportService {
  private snapshot: Readonly<ViewportSnapshot>;

  constructor(width: number, height: number, safeArea: SafeAreaInsets = ZERO_SAFE_AREA) {
    this.snapshot = this.createSnapshot(width, height, safeArea);
  }

  resize(width: number, height: number, safeArea: SafeAreaInsets = this.snapshot.safeArea): void {
    this.snapshot = this.createSnapshot(width, height, safeArea);
  }

  getSnapshot(): Readonly<ViewportSnapshot> {
    return this.snapshot;
  }

  private createSnapshot(
    width: number,
    height: number,
    safeArea: SafeAreaInsets,
  ): Readonly<ViewportSnapshot> {
    const safeWidth = sanitizeDimension(width);
    const safeHeight = sanitizeDimension(height);

    return Object.freeze({
      width: safeWidth,
      height: safeHeight,
      orientation: safeWidth >= safeHeight ? 'landscape' : 'portrait',
      safeArea: Object.freeze({
        top: sanitizeDimension(safeArea.top),
        right: sanitizeDimension(safeArea.right),
        bottom: sanitizeDimension(safeArea.bottom),
        left: sanitizeDimension(safeArea.left),
      }),
    });
  }
}

const parseInset = (value: string): number => sanitizeDimension(Number.parseFloat(value));

export const readSafeAreaInsets = (element: HTMLElement | null): SafeAreaInsets => {
  if (!element) {
    return { ...ZERO_SAFE_AREA };
  }

  const style = window.getComputedStyle(element);

  return {
    top: parseInset(style.paddingTop),
    right: parseInset(style.paddingRight),
    bottom: parseInset(style.paddingBottom),
    left: parseInset(style.paddingLeft),
  };
};
