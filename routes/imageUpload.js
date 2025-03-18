const express = require('express');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const s3Client = require('../aws-config');
const { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const authMiddleware = require("../authMiddleware");

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Configure multer for temporary storage before processing with sharp
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route for handling file upload with compression
router.post('/upload', authMiddleware, upload.array('images', 10), async (req, res) => {
  try {

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const compressedImageKeys = [];

    for (const file of req.files) {
      // Compress the image using sharp
      const compressedImageBuffer = await sharp(file.buffer)
        .rotate() // Automatically orient based on EXIF data
        .resize(800) // Resize image to 800px width
        .jpeg({ quality: 70 }) // Compress to JPEG with 70% quality
        .toBuffer();

      // Generate a unique filename for the compressed image
      const fileName = `${Date.now()}-${file.originalname}`;

      // Upload the compressed image to S3
      await s3Client.send(
        new PutObjectCommand({
          Bucket: 'uob-marketplace',
          Key: fileName,
          Body: compressedImageBuffer,
          ContentType: 'image/jpeg', // Ensure correct content type
        })
      );

      compressedImageKeys.push(fileName);
    }

    res.status(200).json({ message: 'Images compressed and uploaded successfully', imageKeys: compressedImageKeys });
  } catch (error) {
    console.error('Error during image compression and upload:', error);
    res.status(500).json({ message: 'Failed to upload images', error: error.message });
  }
});

// Route to get multiple images from S3 bucket
router.post('/getImages', async (req, res) => {
  try {
    let imagesKey = req.body.imagesKey; // array of keys

    // Ensure imagesKey is always an array
    if (!Array.isArray(imagesKey)) {
      imagesKey = [imagesKey]; // Convert single key to an array
    }

    if (!imagesKey || imagesKey.length === 0) {
      return res.status(400).json({ message: 'No image keys provided' });
    }

    // For every key fetch its image URL
    const getImagePromises = imagesKey.map(async (key) => {
      const command = new GetObjectCommand({
        Bucket: 'uob-marketplace',
        Key: key
      });

      // Generate a presigned URL for each image with a 1 hour expiry
      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

      return {
        key: key,
        content: url // Return the presigned URL
      };
    });

    const imageResults = await Promise.all(getImagePromises);

    res.status(200).json({ images: imageResults });
  } catch (error) {
    console.error('Error retrieving images:', error);
    res.status(500).json({ message: 'Failed to retrieve images', error: error.message });
  }
});


// Route to delete multiple images from S3 bucket
router.post('/deleteImages', authMiddleware, async (req, res) => {
  try {
    let imagesKey = req.body.imagesKey; // array of keys

    // Validate that imagesKey is an array and contains keys
    if (!imagesKey || !Array.isArray(imagesKey) || imagesKey.length === 0) {
      return res.status(400).json({ message: 'No image keys provided' });
    }

    // Prepare the objects for deletion
    const objectsToDelete = imagesKey.map(key => ({ Key: key }));

    // Send the delete request to S3
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: 'uob-marketplace',
      Delete: {
        Objects: objectsToDelete,
        Quiet: false // Set to true to suppress the response for deleted objects
      }
    });

    const deleteResponse = await s3Client.send(deleteCommand);

    res.status(200).json({
      message: 'Images deleted successfully',
      deletedKeys: deleteResponse.Deleted || [], // Contains information about deleted objects
      errors: deleteResponse.Errors || [] // Contains information about any errors
    });
  } catch (error) {
    console.error('Error deleting images:', error);
    res.status(500).json({ message: 'Failed to delete images', error: error.message });
  }
});

module.exports = router;
