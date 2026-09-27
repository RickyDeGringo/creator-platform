import type { SupabaseClient } from "@supabase/supabase-js";
import { PHOTO_MAX_BYTES } from "@/lib/photo-frame";
import { PhotoError, processPhoto } from "@/lib/process-photo";

export type StoredPhoto = {
  path: string;
  url: string;
  width: number;
  height: number;
};

export function photoFiles(formData: FormData): File[] {
  return formData
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

export async function storePhotos(
  supabase: SupabaseClient,
  pageId: string,
  folder: "cover" | "goals",
  files: File[],
): Promise<{ photos: StoredPhoto[] } | { error: string }> {
  const uploaded: string[] = [];
  const photos: StoredPhoto[] = [];

  try {
    for (const file of files) {
      const processed = await processPhoto(Buffer.from(await file.arrayBuffer()));
      const path = `${pageId}/${folder}/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from("post-media").upload(path, processed.buffer, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) return { error: storageError(error.message) };
      uploaded.push(path);
      const { data } = supabase.storage.from("post-media").getPublicUrl(path);
      photos.push({
        path,
        url: data.publicUrl,
        width: processed.width,
        height: processed.height,
      });
    }
  } catch (error) {
    if (uploaded.length > 0) await supabase.storage.from("post-media").remove(uploaded);
    if (error instanceof PhotoError) return { error: error.message };
    return { error: "Could not prepare that photo." };
  }

  return { photos };
}

export async function removeStored(supabase: SupabaseClient, paths: string[]) {
  const stored = paths.filter((path) => path.length > 0);
  if (stored.length > 0) await supabase.storage.from("post-media").remove(stored);
}

function storageError(message: string) {
  if (message.toLowerCase().includes("size")) {
    return `That photo is still over ${Math.round(PHOTO_MAX_BYTES / (1024 * 1024))} MB after resizing.`;
  }
  return "Could not store that photo.";
}
