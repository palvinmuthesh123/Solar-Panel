const express = require('express');
const { uploadToCloudinary, uploadMiddleware } = require('../controllers/uploadController');

const router = express.Router();

// Upload image to Cloudinary
router.post('/upload', async (req, res, next) => {
  try {
    await uploadMiddleware(req, res);
    await uploadToCloudinary(req, res);
  } catch (error) {
    console.error('Error in upload route:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing file upload',
      error: error.message 
    });
  }
});

module.exports = router;
