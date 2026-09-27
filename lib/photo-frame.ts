export const PHOTO_MAX_COUNT = 5;
export const PHOTO_MAX_BYTES = 12 * 1024 * 1024;
export const PHOTO_MAX_WIDTH = 1600;
export const PHOTO_MAX_HEIGHT = 2000;
export const PHOTO_MAX_LANDSCAPE_RATIO = 2;
export const PHOTO_MIN_PORTRAIT_RATIO = 3 / 4;

export type CropRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function cropRect(width: number, height: number): CropRect {
  const safeW = Math.max(1, Math.floor(width));
  const safeH = Math.max(1, Math.floor(height));
  const ratio = safeW / safeH;
  let left = 0;
  let top = 0;
  let cropW = safeW;
  let cropH = safeH;

  if (ratio > PHOTO_MAX_LANDSCAPE_RATIO) {
    cropW = Math.max(1, Math.min(safeW, Math.round(safeH * PHOTO_MAX_LANDSCAPE_RATIO)));
    left = Math.floor((safeW - cropW) / 2);
  } else if (ratio < PHOTO_MIN_PORTRAIT_RATIO) {
    cropH = Math.max(1, Math.min(safeH, Math.round(safeW / PHOTO_MIN_PORTRAIT_RATIO)));
    top = Math.floor((safeH - cropH) / 2);
  }

  return { left, top, width: cropW, height: cropH };
}

export function outputSize(width: number, height: number) {
  const scale = Math.min(1, PHOTO_MAX_WIDTH / width, PHOTO_MAX_HEIGHT / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
