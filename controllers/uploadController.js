const fs = require('fs');
const { cloudinary, hasCloudinary } = require('../config/cloudinary');

// Upload image handler — with Cloudinary + base64 fallback
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    // Get the file buffer (works for both memory and disk storage)
    const fileBuffer = req.file.buffer || (req.file.path ? fs.readFileSync(req.file.path) : null);
    if (!fileBuffer) {
      throw new Error('Image file buffer is empty');
    }

    // === STRATEGY 1: Cloudinary (if properly configured) ===
    if (hasCloudinary) {
      try {
        const cloudResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'shopco_products', resource_type: 'image' },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          stream.end(fileBuffer);
        });

        // Clean up temp file if exists
        if (req.file.path) {
          fs.unlink(req.file.path, () => {});
        }

        return res.json({
          success: true,
          message: 'Image uploaded to Cloudinary successfully',
          url: cloudResult.secure_url,
          filename: cloudResult.public_id
        });
      } catch (cloudError) {
        console.error('Cloudinary upload failed, falling back to base64:', cloudError.message);
        // Fall through to base64 fallback
      }
    }

    // === STRATEGY 2: Local disk storage (non-Vercel only) ===
    if (!process.env.VERCEL && req.file.path && req.file.filename) {
      const host = req.get('host') || 'localhost:5000';
      const protocol = req.protocol || 'http';
      const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

      return res.json({
        success: true,
        message: 'Image uploaded locally',
        url: imageUrl,
        filename: req.file.filename
      });
    }

    // === STRATEGY 3: Base64 Data URL fallback (works everywhere) ===
    const mimeType = req.file.mimetype || 'image/jpeg';
    const base64 = fileBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Clean up temp file if exists
    if (req.file.path) {
      fs.unlink(req.file.path, () => {});
    }

    return res.json({
      success: true,
      message: 'Image converted to base64 data URL (no cloud storage configured)',
      url: dataUrl,
      filename: req.file.originalname || `img-${Date.now()}`
    });
  } catch (error) {
    console.error('Upload failed error:', error);
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
};

module.exports = {
  uploadImage
};
