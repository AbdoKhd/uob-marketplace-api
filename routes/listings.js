const express = require('express');
const Listing = require('../models/Listing');
const User = require('../models/User');
const router = express.Router();
const axios = require('axios');
const authMiddleware = require("../authMiddleware");

// Post a new listing
router.post('/postListing', authMiddleware, async (req, res) => {
  const {title, category, price, user} = req.body;
  console.log("this is price: ", price);
  // Validate required fields
  if (!title || !category || price === '' || !user) {
    return res.status(400).json({ message: 'All required fields must be filled out.'});
  }

  try {
    const newListing = new Listing(req.body);
    await newListing.save();

    // Add the listing id to the user's `myListings`
    const userUpdateResult = await User.findByIdAndUpdate(
      user,
      { $push: { myListings: newListing._id } }, // Add the listing ID to `myListings`
      { new: true } // Return the updated document
    );

    if (!userUpdateResult) {
      return res.status(404).json({ message: 'User not found. Failed to update user listings.' });
    }

    res.status(200).json({message: 'Listing Posted Successful', newListing});
  } catch (error) {
    res.status(400).json({ message: 'Failed to post listing. ' + error.message});
  }
});

// Delete a listing
router.post('/deleteListing/:listingId', authMiddleware, async (req, res) => {
  const {listingId} = req.params;

  try {
    
    // Find the listing to delete
    const listing = await Listing.findById(listingId);

    if(!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Remove the listing from all users' favorites
    await User.updateMany(
      { myFavorites: listingId },
      { $pull: { myFavorites: listingId } }
    )

    // Delete associated images
    if (listing.imagesKey && listing.imagesKey.length > 0) {
      try {
        const response = await axios.post('http://192.168.1.179:5000/api/images/deleteImages', {
          imagesKey: listing.imagesKey
        });
      } catch (imageError) {
        console.error('Error deleting images:', imageError.response ? imageError.response.data : imageError.message);
      }
    }


    // Remove the listing reference from the user's `myListings` field
    await User.updateOne(
      { _id: listing.user }, // `listing.user` references the creator
      { $pull: { myListings: listingId } }
    );

    // Delete the listing itself
    await Listing.findByIdAndDelete(listingId);

    res.status(200).json({ message: 'Listing deleted successfully' });
    
  } catch (error) {
    res.status(400).json({ message: 'Failed to delete listing. ' + error.message});
  }
});

// Get all listings
router.get('/getAllListings', async (req, res) => {
  try {
    const listings = await Listing.find().populate('user');
    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve listings.' + error.message});
  }
});

router.get('/getListings', async (req, res) => {
  try {
    const { page = 1, limit = 5, searchQuery = '', category = 'All', sorting = 'Newest First', campus = 'All' } = req.query;

    const query = {};
    if (searchQuery) {
      query.$or = [
        { title: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
      ];
    }
    if (category && category !== 'All') {
      query.category = category;
    }

    let sortOption = {};
    switch (sorting) {
      case 'Newest First':
        sortOption = { createdAt: -1 };
        break;
      case 'Oldest First':
        sortOption = { createdAt: 1 };
        break;
      case 'Alphabetical Order':
        sortOption = { title: 1 };
        break;
      case 'Price: Highest First':
        sortOption = { price: -1 };
        break;
      case 'Price: Lowest First':
        sortOption = { price: 1 };
        break;
      default:
        sortOption = { createdAt: -1 };
        break;
    }

    // First, filter listings with the query
    const listings = await Listing.find(query)
      .collation({ locale: 'en', strength: 2 }) // Case-insensitive sorting
      .sort(sortOption)
      .populate({
        path: 'user',
        match: campus && campus !== 'All' ? { campus } : {}, // Filter by campus if specified
        select: 'campus',
      });

    // Filter listings where user matches campus criteria
    const filteredListings = listings.filter(listing => listing.user);

    // Total count after filtering
    const totalCount = filteredListings.length;

    // Apply pagination AFTER filtering
    const paginatedListings = filteredListings.slice((page - 1) * limit, page * limit);

    // Respond with the data
    res.status(200).json({
      listings: paginatedListings,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve listings.', error });
  }
});

// Route to get listings by an array of IDs
router.post('/getListingsByIds', async (req, res) => {
  const { listingsId } = req.body; // Expect an array of IDs

  try {
    // Find listings that match the IDs in the array
    const listings = await Listing.find({ _id: { $in: listingsId } }).populate('user');
    res.status(200).json({message: 'Listings fetched Successfully', listings });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ error: 'An error occurred while fetching listings' });
  }
});

// Get a single listing
router.get('/getListing/:listingId', async (req, res) => {
  const {listingId} = req.params;
  try {
    const listing = await Listing.findById(listingId).populate('user');

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found.'});
    }

    res.status(200).json({ message: 'Listing retrieved successfully', listing });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve the listing. ' + error.message });
  }
});

module.exports = router;
