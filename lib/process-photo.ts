import sharp from "sharp";
import {
  COVER_TARGET_HEIGHT,
  COVER_TARGET_WIDTH,
  coverCropRect,
  cropRect,
  PHOTO_MAX_HEIGHT,
  PHOTO_MAX_WIDTH,
  PHOTO_UPLOAD_MAX_BYTES,
} from "@/lib/photo-frame";

const MAX_PIXELS = 24_000_000;
const ALLOWED = new Set(["jpeg", "png", "webp", "gif", "avif", "tiff", "heif"]);

export class PhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoError";
  }
}

export async function processPhoto(input: Buffer, frame: "post" | "cover" = "post") {
  if (input.byteLength === 0) throw new PhotoError("That photo is empty.");
  if (input.byteLength > PHOTO_UPLOAD_MAX_BYTES) throw new PhotoError("That photo is still too large after resizing.");

  let format: string | undefined;
  try {
    format = (await sharp(input, { limitInputPixels: MAX_PIXELS, animated: false }).metadata()).format;
  } catch {
    throw new PhotoError("Use a JPEG, PNG, WebP, or GIF photo.");
  }

  if (!format || !ALLOWED.has(format)) {
    throw new PhotoError("Use a JPEG, PNG, WebP, or GIF photo.");
  }

  let oriented: { data: Buffer; info: { width: number; height: number } };
  try {
    const decoded = await sharp(input, { limitInputPixels: MAX_PIXELS, animated: false, pages: 1 })
      .autoOrient()
      .toBuffer({ resolveWithObject: true });
    if (!decoded.info.width || !decoded.info.height) throw new PhotoError("Could not read that photo.");
    oriented = { data: Buffer.from(decoded.data), info: { width: decoded.info.width, height: decoded.info.height } };
  } catch (error) {
    if (error instanceof PhotoError) throw error;
    throw new PhotoError("Could not read that photo.");
  }

  const crop = frame === "cover" ? coverCropRect(oriented.info.width, oriented.info.height) : cropRect(oriented.info.width, oriented.info.height);
  const maxWidth = frame === "cover" ? COVER_TARGET_WIDTH : PHOTO_MAX_WIDTH;
  const maxHeight = frame === "cover" ? COVER_TARGET_HEIGHT : PHOTO_MAX_HEIGHT;

  try {
    const output = await sharp(oriented.data, { limitInputPixels: MAX_PIXELS })
      .extract(crop)
      .resize({
        width: maxWidth,
        height: maxHeight,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 76, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    if (!output.info.width || !output.info.height) {
      throw new PhotoError("Could not prepare that photo.");
    }

    return {
      buffer: Buffer.from(output.data),
      width: output.info.width,
      height: output.info.height,
    };
  } catch (error) {
    if (error instanceof PhotoError) throw error;
    throw new PhotoError("Could not prepare that photo.");
  }
}
