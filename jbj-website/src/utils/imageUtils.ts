/**
 * Universal Image Utility for JBJ Jewellers App
 * Converts any image file (JPG, PNG, HEIC, GIF, BMP, WEBP, Camera photos)
 * into high-definition WebP format in browser memory before network upload.
 */

export interface WebPOptions {
  quality?: number; // Quality ratio between 0.1 and 1.0 (Default: 0.90 for crystal clear jewelry polish)
  maxWidth?: number; // Optional max width constraint (Default: 1920px)
  maxHeight?: number; // Optional max height constraint (Default: 1920px)
}

/**
 * Converts a File, Blob, or Image DataURL string to WebP DataURL format
 */
export const convertImageToWebP = (
  fileOrDataUrl: File | Blob | string,
  options: WebPOptions = {}
): Promise<string> => {
  const { quality = 0.90, maxWidth = 1920, maxHeight = 1920 } = options;

  return new Promise((resolve, reject) => {
    const processImageSource = (src: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2D canvas context for WebP conversion'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        try {
          const webpDataUrl = canvas.toDataURL('image/webp', quality);
          resolve(webpDataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for WebP conversion'));
      };

      img.src = src;
    };

    if (typeof fileOrDataUrl === 'string') {
      processImageSource(fileOrDataUrl);
    } else {
      const url = URL.createObjectURL(fileOrDataUrl);
      processImageSource(url);
    }
  });
};

/**
 * Converts any File, Blob, or image directly to a pure binary WebP File/Blob (No Base64 strings!)
 */
export const convertImageToWebPBlob = (
  fileOrDataUrl: File | Blob | string,
  options: WebPOptions = {}
): Promise<File> => {
  const { quality = 0.90, maxWidth = 1920, maxHeight = 1920 } = options;

  return new Promise((resolve, reject) => {
    const processImageSource = (src: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2D canvas context for WebP conversion'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const fileName = fileOrDataUrl instanceof File ? fileOrDataUrl.name.replace(/\.[^/.]+$/, '') : 'image';
              const webpFile = new File([blob], `${fileName}.webp`, { type: 'image/webp' });
              resolve(webpFile);
            } else {
              reject(new Error('Failed to convert canvas to binary WebP blob'));
            }
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image for WebP conversion'));
      img.src = src;
    };

    if (typeof fileOrDataUrl === 'string') {
      processImageSource(fileOrDataUrl);
    } else {
      const url = URL.createObjectURL(fileOrDataUrl);
      processImageSource(url);
    }
  });
};

/**
 * Converts and triggers direct download of any image URL as JPEG format
 */
export async function downloadImageAsJpeg(imageUrl: string, defaultFilename = 'worker_image.jpeg'): Promise<void> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = imageUrl;
    });

    const loadedImg = await loadPromise;

    const canvas = document.createElement('canvas');
    canvas.width = loadedImg.naturalWidth || loadedImg.width;
    canvas.height = loadedImg.naturalHeight || loadedImg.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    // Fill white background for transparent images when converting to JPEG
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(loadedImg, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = defaultFilename.toLowerCase().endsWith('.jpeg') || defaultFilename.toLowerCase().endsWith('.jpg')
        ? defaultFilename
        : `${defaultFilename}.jpeg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
    }, 'image/jpeg', 0.92);
  } catch (err) {
    console.warn('Direct canvas download fallback triggered:', err);
    // Fallback simple download
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = defaultFilename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
