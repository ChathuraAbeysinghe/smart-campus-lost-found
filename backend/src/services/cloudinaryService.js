import { v2 as cloudinary } from 'cloudinary';

let configured = false;

const ensureConfig = () => {
  if (configured) {
    return;
  }

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    configured = false;
    return;
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });

  configured = true;
};

export const uploadImageBuffer = async (buffer, mimeType = 'image/jpeg') => {
  ensureConfig();

  if (!configured) {
    return null;
  }

  try {
    const base64 = buffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'smart-campus-lost-found',
      transformation: [{ width: 800, height: 800, crop: 'limit' }, { quality: 'auto' }],
    });

    return result.secure_url;
  } catch {
    return null;
  }
};
