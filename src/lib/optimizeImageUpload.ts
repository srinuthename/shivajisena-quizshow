const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to decode image'));
    image.src = src;
  });

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error('Failed to encode optimized image'));
      },
      type,
      quality,
    );
  });

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to serialize optimized image'));
    reader.readAsDataURL(blob);
  });

export interface OptimizeImageOptions {
  maxWidth: number;
  maxHeight: number;
  maxBytes: number;
  quality?: number;
}

export const optimizeImageUpload = async (
  file: File,
  options: OptimizeImageOptions,
): Promise<string> => {
  if (file.type === 'image/svg+xml') {
    return readFileAsDataUrl(file);
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageElement(sourceDataUrl);
  let width = image.naturalWidth || image.width;
  let height = image.naturalHeight || image.height;
  const baseScale = Math.min(1, options.maxWidth / width, options.maxHeight / height);
  width = Math.max(1, Math.round(width * baseScale));
  height = Math.max(1, Math.round(height * baseScale));

  let quality = Math.min(0.9, Math.max(0.45, options.quality ?? 0.72));
  let attempt = 0;
  let bestBlob: Blob | null = null;

  while (attempt < 6) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas is not available for image optimization');
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, 'image/webp', quality);
    bestBlob = blob;
    if (blob.size <= options.maxBytes) {
      return blobToDataUrl(blob);
    }

    if (quality > 0.5) {
      quality = Math.max(0.5, quality - 0.08);
    } else {
      width = Math.max(1, Math.round(width * 0.85));
      height = Math.max(1, Math.round(height * 0.85));
    }
    attempt += 1;
  }

  if (bestBlob) {
    return blobToDataUrl(bestBlob);
  }
  return sourceDataUrl;
};