/**
 * Aplana una imagen (data URL, normalmente PNG transparente) sobre fondo BLANCO
 * y la devuelve como JPEG. Así la IA recibe un fondo blanco explícito (no una
 * transparencia ambigua que interpreta como negro) y mantiene el fondo blanco
 * de forma consistente.
 */
export function flattenToWhite(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No 2d context"));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Redimensiona una imagen (File o data URL) a un lado máximo conservando proporción
 * y la devuelve como data URL JPEG/PNG. Mantiene los payloads pequeños para
 * localStorage/IndexedDB y para abaratar las llamadas a la IA.
 */
export async function fileToResizedDataURL(
  input: File | Blob,
  maxSide = 1024,
  quality = 0.9,
): Promise<string> {
  const dataUrl = await blobToDataURL(input);
  return resizeDataURL(dataUrl, maxSide, quality);
}

/**
 * Procesa una imagen subida: opcionalmente le quita el fondo (deja solo el
 * sujeto/prenda como PNG transparente) y la redimensiona a un lado máximo.
 */
export async function processUpload(
  file: File | Blob,
  maxSide = 1024,
  opts?: { removeBg?: boolean; onProgress?: (fraction: number) => void },
): Promise<string> {
  let blob: File | Blob = file;
  if (opts?.removeBg) {
    const { removeImageBackground } = await import("./bg");
    blob = await removeImageBackground(file, opts.onProgress);
  }
  return fileToResizedDataURL(blob, maxSide);
}

/**
 * Igual que processUpload pero devuelve un Blob PNG listo para subir a Storage.
 */
export async function processUploadBlob(
  file: File | Blob,
  maxSide = 1024,
  opts?: { removeBg?: boolean; onProgress?: (fraction: number) => void },
): Promise<Blob> {
  // 1) Reducimos PRIMERO (rápido, en canvas) para que quitar el fondo procese
  //    muchos menos píxeles.
  const small = await resizeBlob(file, maxSide);
  if (!opts?.removeBg) return small;

  // 2) Quitamos el fondo sobre la imagen ya pequeña.
  const { removeImageBackground } = await import("./bg");
  return removeImageBackground(small, opts.onProgress);
}

/**
 * Redimensiona un Blob y lo devuelve como Blob WebP (conserva transparencia y
 * pesa ~70-80% menos que PNG, así carga mucho más rápido).
 */
export async function resizeBlob(
  blob: Blob,
  maxSide = 1024,
  quality = 0.85,
): Promise<Blob> {
  const dataUrl = await blobToDataURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxSide / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No 2d context"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob falló"))),
        "image/webp",
        quality,
      );
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function resizeDataURL(
  dataUrl: string,
  maxSide = 1024,
  quality = 0.9,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxSide / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No 2d context"));
      ctx.drawImage(img, 0, 0, width, height);

      // PNG conserva transparencia (útil para prendas recortadas); si no, JPEG.
      const hasAlpha = dataUrl.startsWith("data:image/png");
      const out = hasAlpha
        ? canvas.toDataURL("image/png")
        : canvas.toDataURL("image/jpeg", quality);
      resolve(out);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
