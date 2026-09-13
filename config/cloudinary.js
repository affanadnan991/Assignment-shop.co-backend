const cloudinary = require('cloudinary').v2;

// Validate Cloudinary credentials properly
const hasCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  // Reject placeholder/invalid cloud names
  process.env.CLOUDINARY_CLOUD_NAME.length > 2 &&
  process.env.CLOUDINARY_CLOUD_NAME.toLowerCase() !== 'root' &&
  process.env.CLOUDINARY_CLOUD_NAME.toLowerCase() !== 'your_cloud_name' &&
  process.env.CLOUDINARY_CLOUD_NAME.toLowerCase() !== 'undefined'
);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('☁️ Cloudinary Storage configured successfully');
} else {
  console.log('⚠️ Cloudinary not configured or invalid credentials — using base64 fallback');
}

module.exports = { cloudinary, hasCloudinary };
