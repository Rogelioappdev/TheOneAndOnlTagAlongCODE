const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;

type UploadResult = {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

/**
 * Uploads a local file URI to the Vibecode storage service via the backend.
 * Works reliably on native iOS (including TestFlight/production).
 */
export async function uploadFile(
  uri: string,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", { uri, type: mimeType, name: filename } as any);

  const response = await fetch(`${BACKEND_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json() as { data?: UploadResult; error?: string };
  if (!response.ok) throw new Error(data.error || "Upload failed");
  return data.data!;
}

/**
 * Detects mime type and extension from a local image URI.
 */
export function getImageMeta(uri: string): { mimeType: string; ext: string } {
  const lower = uri.toLowerCase();
  if (lower.includes(".png")) return { mimeType: "image/png", ext: "png" };
  if (lower.includes(".webp")) return { mimeType: "image/webp", ext: "webp" };
  if (lower.includes(".heic")) return { mimeType: "image/heic", ext: "heic" };
  if (lower.includes(".heif")) return { mimeType: "image/heif", ext: "heif" };
  if (lower.includes(".gif")) return { mimeType: "image/gif", ext: "gif" };
  return { mimeType: "image/jpeg", ext: "jpg" };
}
