const express = require('express');
const User = require('../models/User');
const bcrypt = require("bcrypt");
const router = express.Router();
const jwt = require("jsonwebtoken");
require("dotenv").config();
const authMiddleware = require("../authMiddleware");

// Create a new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate email format
    const universityEmailRegex = /^[a-zA-Z0-9._%+-]+@(balamand.edu.lb|std.balamand.edu.lb|fty.balamand.edu.lb)$/;
    if (!universityEmailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email. Only University of Balamand emails are allowed." });
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        message: "Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, and a number."
      });
    }

    // Check if the email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered." });
    }

    // Create a new user
    const newUser = new User({ email, password, firstName, lastName });
    await newUser.save();

    // Generate JWT token
    const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

    res.status(200).json({ token: token, message: "Registration Successful", loggedInUserId: newUser.id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/changePassword', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({email});
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        message: "Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, and a number."
      });
    }

    user.password = password;
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "An error occurred" });
  }
});

// Authentication
router.post('/login', async (req, res) => {
  try{
    const {email, password} = req.body;

    const user = await User.findOne({email});
    if(!user){
      return res.status(400).json({message: 'Invalid email'})
    }

    const isMatch = await user.comparePassword(password)
    if(!isMatch){
      return res.status(400).json({message: 'Invalid password'})
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

    res.status(200).json({token: token, message: 'Login Successful', loggedInUserId: user.id});
  }catch (error) {
    console.log("this is error: ", error.message);
    res.status(500).json({ message: error.message });
  }
});

//Route to get a user
router.get('/getUser/:userId', async (req, res) =>{

  const {userId} = req.params;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: `User not found` });
    }

    res.status(200).json({message: `Fetched user successfully`, user: {id: user.id, firstName: user.firstName, 
      lastName: user.lastName, email: user.email, about: user.about, campus: user.campus, profilePictureKey: user.profilePictureKey, 
      myListings: user.myListings, myFavorites: user.myFavorites}});

  } catch (error) {
    res.status(500).json({ message: `An error occurred while fetching the user`, error });
  }
})

//Route to get a user by email
router.get('/getUserByEmail/:email', async (req, res) =>{

  const {email} = req.params;
  // console.log("this is email: ", email);

  try {
    const user = await User.findOne({email});

    if (!user) {
      return res.status(404).json({ message: `User with this email not found`});
    }

    res.status(200).json({message: `Fetched user successfully`, user: user});

  } catch (error) {
    res.status(500).json({ message: `An error occurred while fetching the user by email`, error });
  }
})

// Route to edit a user
router.put('/editUser/:userId', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const { profilePictureKey, firstName, lastName, campus } = req.body;

  try {

    // Find the user by ID and update the fields
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, campus, profilePictureKey },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: `User not found` });
    }

    res.status(200).json({
      message: `User updated successfully`,
      user: {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        about: updatedUser.about,
        campus: updatedUser.campus,
        profilePictureKey: updatedUser.profilePictureKey,
        myListings: updatedUser.myListings,
        myFavorites: updatedUser.myFavorites,
      },
    });
  } catch (error) {
    res.status(500).json({ message: `An error occurred while updating the user`, error });
  }
});

// Route to edit the user's 'about' field
router.put('/editUserAbout/:userId', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const { about } = req.body;

  try {
    // Find the user by ID and update the 'about' field
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { about },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: `User not found` });
    }

    res.status(200).json({
      message: `User 'about' field updated successfully`,
      user: {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        about: updatedUser.about,
        campus: updatedUser.campus,
        profilePictureKey: updatedUser.profilePictureKey,
        myListings: updatedUser.myListings,
        myFavorites: updatedUser.myFavorites,
      },
    });
  } catch (error) {
    res.status(500).json({ message: `An error occurred while updating the 'about' field`, error });
  }
});

//Add the listingId to the user schema (for myFavorites).
router.post('/addListingToUser/myFavorites/:userId', authMiddleware, async (req, res) => {
  const {userId} = req.params;
  const {listingId} = req.body;
  try{
    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { myFavorites: listingId } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Listing added to user (myFavorites)', user });

  }catch(error){
    console.error('Error updating user myFavorites:', error);
    res.status(500).json({ message: 'Failed to update user', error });
  }
})

// Route to remove a listing ID from a user's favorites
router.post('/removeListingFromUser/myFavorites/:userId', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const { listingId } = req.body;

  try {
    // Find the user and update their favorites by pulling the listingId
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { myFavorites: listingId } },
      { new: true } // Return the updated document
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Listing removed from favorites', user });
  } catch (error) {
    console.error('Error removing listing from favorites:', error);
    res.status(500).json({ message: 'An error occurred while updating favorites', error });
  }
});

// Get all users
router.get('/getAllUsers', authMiddleware, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
