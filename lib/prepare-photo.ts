import {
  clampCrop,
  coverOutputSize,
  cropRect,
  outputSize,
  PHOTO_SOURCE_MAX_BYTES,
  PHOTO_UPLOAD_MAX_BYTES,
  photoSourceLimitLabel,
  type CropRect,
} from "@/lib/photo-frame";

const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function preparePhotoFile(file: File, crop?: CropRect) {
  if (!ACCEPTED.has(file.type)) {
    throw new Error("Use a JPEG, PNG, WebP, or GIF photo.");
  }
  if (file.size > PHOTO_SOURCE_MAX_BYTES) {
    throw new Error(`Each photo must be under ${photoSourceLimitLabel()}.`);
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Could not read that photo.");
  }

  try {
    const frame = crop ? clampCrop(crop, bitmap.width, bitmap.height) : cropRect(bitmap.width, bitmap.height);
    const size = crop ? coverOutputSize(frame.width, frame.height) : outputSize(frame.width, frame.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare that photo.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, frame.left, frame.top, frame.width, frame.height, 0, 0, size.width, size.height);

    const encoded = await encodeUnderLimit(canvas);
    if (!encoded) throw new Error("Could not prepare that photo.");
    const extension = encoded.type === "image/webp" ? "webp" : "jpg";
    return new File([encoded], `photo.${extension}`, { type: encoded.type || "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

async function encodeUnderLimit(canvas: HTMLCanvasElement) {
  const attempts: [string, number][] = [
    ["image/webp", 0.8],
    ["image/webp", 0.65],
    ["image/webp", 0.5],
    ["image/jpeg", 0.8],
    ["image/jpeg", 0.65],
    ["image/jpeg", 0.5],
  ];
  for (const [type, quality] of attempts) {
    const blob = await canvasBlob(canvas, type, quality);
    if (blob && blob.size <= PHOTO_UPLOAD_MAX_BYTES) return blob;
  }
  return null;
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob && blob.size > 0 ? blob : null), type, quality);
  });
}
