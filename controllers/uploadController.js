const fs = require('fs');
const { cloudinary, hasCloudinary } = require('../config/cloudinary');

// Upload image handler
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    if (hasCloudinary) {
      const streamUpload = (fileBuffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'shopco_products' },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          stream.end(fileBuffer);
        });
      };

      const fileBuffer = req.file.buffer || (req.file.path ? fs.readFileSync(req.file.path) : null);
      if (!fileBuffer) {
        throw new Error('Image file buffer is empty');
      }

      const cloudResult = await streamUpload(fileBuffer);

      if (req.file.path) {
        fs.unlink(req.file.path, () => {});
      }

      return res.json({
        success: true,
        message: 'Image uploaded to Cloudinary successfully',
        url: cloudResult.secure_url,
        filename: cloudResult.public_id
      });
    }

    const filename = req.file.filename || `img-${Date.now()}.png`;
    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'http';
    const imageUrl = `${protocol}://${host}/uploads/${filename}`;

    res.json({
      success: true,
      message: 'Image uploaded locally',
      url: imageUrl,
      filename
    });
  } catch (error) {
    console.error('Upload failed error:', error);
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
};

module.exports = {
  uploadImage
};
