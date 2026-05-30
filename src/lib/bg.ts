"use client";

/**
 * Quita el fondo de una imagen en el navegador (sin API externa).
 * Devuelve un Blob PNG con transparencia.
 *
 * Optimizaciones:
 *  - device: 'gpu' (WebGPU) con fallback automático a CPU.
 *  - proxyToWorker: corre en un Web Worker para no congelar la UI.
 *  - conviene pasar la imagen YA reducida (menos píxeles = más rápido).
 */
export async function removeImageBackground(
  input: File | Blob,
  onProgress?: (fraction: number) => void,
): Promise<Blob> {
  const { removeBackground } = await import("@imgly/background-removal");

  const base = {
    // WebP conserva transparencia y pesa mucho menos que PNG -> carga más rápido.
    output: { format: "image/webp" as const, quality: 0.85 },
    proxyToWorker: true,
    progress: (_key: string, current: number, total: number) => {
      if (onProgress && total > 0) onProgress(current / total);
    },
  };

  try {
    return await removeBackground(input, { ...base, device: "gpu" });
  } catch (e) {
    console.warn("[bg] GPU no disponible, usando CPU:", e);
    return await removeBackground(input, { ...base, device: "cpu" });
  }
}
