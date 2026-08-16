/**
 * Utility functions for image format conversion
 * - Uploads images as WebP format
 * - Downloads images as JPEG format
 */

export async function convertFileToWebP(file: File, quality = 0.85): Promise<File> {
  return new Promise((resolve) => {
    // If already webp, return directly
    if (file.type === 'image/webp') {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const webpFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, '') + '.webp',
            { type: 'image/webp' }
          );
          resolve(webpFile);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback to original file on error
    };

    img.src = url;
  });
}

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
