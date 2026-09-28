export const PHOTO_MAX_COUNT = 5;
export const PHOTO_SOURCE_MAX_BYTES = 40 * 1024 * 1024;
export const PHOTO_UPLOAD_MAX_BYTES = 700 * 1024;

export function photoSourceLimitLabel() {
  return `${PHOTO_SOURCE_MAX_BYTES / (1024 * 1024)} MB`;
}
export const PHOTO_MAX_WIDTH = 1600;
export const PHOTO_MAX_HEIGHT = 2000;
export const PHOTO_MAX_LANDSCAPE_RATIO = 2;
export const PHOTO_MIN_PORTRAIT_RATIO = 3 / 4;

export const COVER_TARGET_WIDTH = 1600;
export const COVER_TARGET_HEIGHT = 400;
export const COVER_BANNER_DESKTOP_PX = 320;
export const COVER_BANNER_MOBILE_PX = 256;
const COVER_RATIO = COVER_TARGET_WIDTH / COVER_TARGET_HEIGHT;

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

export function clampCrop(crop: CropRect, width: number, height: number): CropRect {
  const maxW = Math.max(1, Math.floor(width));
  const maxH = Math.max(1, Math.floor(height));
  const left = Math.min(Math.max(0, Math.floor(crop.left)), maxW - 1);
  const top = Math.min(Math.max(0, Math.floor(crop.top)), maxH - 1);
  return {
    left,
    top,
    width: Math.min(Math.max(1, Math.floor(crop.width)), maxW - left),
    height: Math.min(Math.max(1, Math.floor(crop.height)), maxH - top),
  };
}

export function coverCropRect(width: number, height: number): CropRect {
  const safeW = Math.max(1, Math.floor(width));
  const safeH = Math.max(1, Math.floor(height));
  const ratio = safeW / safeH;
  if (Math.abs(ratio - COVER_RATIO) / COVER_RATIO <= 0.01) {
    return { left: 0, top: 0, width: safeW, height: safeH };
  }
  if (ratio > COVER_RATIO) {
    const cropW = Math.max(1, Math.min(safeW, Math.round(safeH * COVER_RATIO)));
    return { left: Math.floor((safeW - cropW) / 2), top: 0, width: cropW, height: safeH };
  }
  const cropH = Math.max(1, Math.min(safeH, Math.round(safeW / COVER_RATIO)));
  return { left: 0, top: Math.floor((safeH - cropH) / 2), width: safeW, height: cropH };
}

export function coverOutputSize(width: number, height: number) {
  const scale = Math.min(1, COVER_TARGET_WIDTH / Math.max(1, width), COVER_TARGET_HEIGHT / Math.max(1, height));
  const outW = Math.min(COVER_TARGET_WIDTH, Math.max(4, Math.round((width * scale) / 4) * 4));
  return { width: outW, height: outW / COVER_RATIO };
}

export function coverFrame(width: number, height: number, zoom: number, panX: number, panY: number): CropRect {
  const safeW = Math.max(1, Math.floor(width));
  const safeH = Math.max(1, Math.floor(height));
  const fittedH = Math.max(1, Math.floor(Math.min(safeH, Math.floor(safeW / COVER_RATIO) || 1)));
  let cropH = Math.max(1, Math.min(fittedH, Math.round(fittedH / Math.max(1, zoom))));
  let cropW = cropH * COVER_RATIO;
  if (cropW > safeW || cropH > safeH) {
    cropH = Math.max(1, Math.min(safeH, Math.floor(safeW / COVER_RATIO) || 1));
    cropW = Math.min(safeW, cropH * COVER_RATIO);
  }
  const spanX = Math.max(0, safeW - cropW);
  const spanY = Math.max(0, safeH - cropH);
  const left = Math.round(spanX * Math.min(1, Math.max(0, panX)));
  const top = Math.round(spanY * Math.min(1, Math.max(0, panY)));
  return { left, top, width: cropW, height: Math.min(safeH, cropH) };
}
