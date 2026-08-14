import { v2 as cloudinary } from 'cloudinary';

/**
 * Cloudinary Image Helper for JBJ Jewellers App
 * Uploads images to Cloudinary and saves them directly in WebP format.
 * Strictly uses process.env variables to prevent secret leakage.
 */

export interface CloudinaryUploadOptions {
  folder?: string;
  quality?: string;
}

export const uploadToCloudinaryAsWebP = async (
  imageData: string,
  folder: string = 'jewellery_product_images'
): Promise<string> => {
  try {
    if (!imageData || imageData.startsWith('http://') || imageData.startsWith('https://')) {
      return imageData;
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('⚠️ Cloudinary environment variables missing in .env. Returning WebP image data fallback.');
      return imageData;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    console.log(`☁️ Uploading WebP image to Cloudinary (folder: ${folder})...`);

    const result = await cloudinary.uploader.upload(imageData, {
      folder: folder,
      format: 'webp', // 👈 Converts and saves as WebP format in Cloudinary!
      transformation: [{ quality: 'auto:good' }],
    });

    console.log('✅ Cloudinary WebP Upload Success! URL:', result.secure_url);
    return result.secure_url;
  } catch (err: any) {
    console.error('❌ Cloudinary WebP upload error:', err.message || err);
    return imageData;
  }
};

export const uploadToCloudinaryFile = async (
  fileBuffer: Buffer,
  fileName: string = 'image.webp',
  folder: string = 'jewellery_product_images'
): Promise<string> => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('⚠️ Cloudinary environment variables missing in .env.');
      throw new Error('Cloudinary credentials not configured');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    console.log(`☁️ Uploading binary WebP file (${fileBuffer.length} bytes) to Cloudinary...`);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          format: 'webp',
          public_id: fileName.replace(/\.[^/.]+$/, ''),
          transformation: [{ quality: 'auto:good' }],
        },
        (error, result) => {
          if (error || !result) {
            console.error('❌ Cloudinary stream upload error:', error);
            reject(error || new Error('Upload failed'));
          } else {
            console.log('✅ Cloudinary WebP File Upload Success! URL:', result.secure_url);
            resolve(result.secure_url);
          }
        }
      );

      uploadStream.end(fileBuffer);
    });
  } catch (err: any) {
    console.error('❌ Cloudinary stream upload exception:', err.message || err);
    throw err;
  }
};

export const uploadFinanceImageToCloudinary = async (
  fileBuffer: Buffer,
  fileName: string
): Promise<string> => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_FINANCE_UPLOAD_PRESET || 'finance_pledge_loans';

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('⚠️ Cloudinary environment variables missing in .env.');
      throw new Error('Cloudinary credentials not configured');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    console.log(`☁️ Uploading finance image binary (${fileBuffer.length} bytes) to Cloudinary (preset: ${uploadPreset})...`);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'finance_pledge_loans',
          upload_preset: uploadPreset,
          format: 'webp',
          public_id: fileName.replace(/\.[^/.]+$/, ''),
          transformation: [{ quality: 'auto:good' }],
        },
        (error, result) => {
          if (error || !result) {
            console.error('❌ Cloudinary stream upload error:', error);
            reject(error || new Error('Upload failed'));
          } else {
            console.log('✅ Cloudinary WebP Finance File Upload Success! URL:', result.secure_url);
            resolve(result.secure_url);
          }
        }
      );

      uploadStream.end(fileBuffer);
    });
  } catch (err: any) {
    console.error('❌ Cloudinary stream upload exception:', err.message || err);
    throw err;
  }
};
