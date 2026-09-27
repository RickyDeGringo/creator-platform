import { cropRect, outputSize, PHOTO_MAX_BYTES } from "@/lib/photo-frame";

const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function preparePhotoFile(file: File) {
  if (!ACCEPTED.has(file.type)) {
    throw new Error("Use a JPEG, PNG, WebP, or GIF photo.");
  }
  if (file.size > PHOTO_MAX_BYTES) {
    throw new Error("Each photo must be under 12 MB.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Could not read that photo.");
  }

  try {
    const crop = cropRect(bitmap.width, bitmap.height);
    const size = outputSize(crop.width, crop.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare that photo.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      bitmap,
      crop.left,
      crop.top,
      crop.width,
      crop.height,
      0,
      0,
      size.width,
      size.height,
    );

    const blob = await canvasBlob(canvas, "image/webp", 0.8);
    const encoded = blob ?? (await canvasBlob(canvas, "image/jpeg", 0.86));
    if (!encoded) throw new Error("Could not prepare that photo.");
    const extension = encoded.type === "image/webp" ? "webp" : "jpg";
    return new File([encoded], `photo.${extension}`, { type: encoded.type || "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob && blob.size > 0 ? blob : null), type, quality);
  });
}
