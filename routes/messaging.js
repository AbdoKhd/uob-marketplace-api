const express = require('express');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const router = express.Router();
const authMiddleware = require("../authMiddleware");

// Fetch messages between two users
router.post('/getMessages/:conversationId', authMiddleware, async (req, res) => {
  const { conversationId } = req.params;

  try {
    const messages = await Message.find({ conversationId }).sort({ timestamp: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
});


// Send a message
router.post('/sendMessage/:conversationId', authMiddleware, async (req, res) => {
  const { senderId, receiverId, content, status } = req.body;
  const { conversationId } = req.params;

  // console.log("this is sender id: ", senderId);
  // console.log("this is receiver id: ", receiverId);
  // console.log("this is the content: ", content);

  try {
    // Create a new message
    const newMessage = new Message({
      senderId,
      receiverId,
      conversationId,
      content,
      status,
    });

    const savedMessage = await newMessage.save();
    //console.log("New message added");

    // Update the conversation
    // IMPORTANT: if the convo does not exist than the message should not be sent
    const conversation = await Conversation.findOneAndUpdate(
      { participants: { $all: [senderId, receiverId] } },
      {
        $set: { lastMessage: savedMessage._id, lastUpdated: Date.now() },
      },
      { new: true }
    );

    if (!conversation) {
      console.error("Conversation not found");
      return res.status(404).json({ message: 'Conversation not found' });
    }

    res.status(201).json(savedMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
});


// Fetch all conversations for a user with unread messages count
router.post('/getConversations/:userId', authMiddleware, async (req, res) => {
  const { userId } = req.params;

  try {
    const conversations = await Conversation.find({ 
      participants: userId,
      $or: [
        { userThatStartedConvo: userId },  // Include if user started convo
        { lastMessage: { $ne: null } }     // OR if lastMessage is not null
      ]
    })
      .populate('participants', 'firstName lastName profilePictureKey')
      .populate('lastMessage')
      .sort({ lastUpdated: -1 })
      .lean();

    // Fetch unread counts for each conversation
    const conversationsWithUnread = await Promise.all(conversations.map(async (convo) => {
      const unreadCount = await Message.countDocuments({
        conversationId: convo._id,
        receiverId: userId,
        status: { $ne: 'seen' }
      });

      return { ...convo, unreadCount };
    }));

    res.status(200).json(conversationsWithUnread);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching conversations', error: error.message });
  }
});

// Fetch a conversation by ID
router.get('/getConversationById/:conversationId', authMiddleware, async (req, res) => {
  const { conversationId } = req.params;
  const { userId } = req.query;


  try {
    // Find the specific conversation by its Id
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'firstName lastName profilePictureKey')
      .populate('lastMessage');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if userId is part of the conversation's participants
    const isParticipant = conversation.participants.some(participant => participant._id.toString() === userId);
    if (!isParticipant) {
      return res.status(400).json({ message: 'User not in this conversation' });
    }

    res.status(200).json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ message: 'Error fetching conversation', error: error.message });
  }
});


// Mark a message as seen
router.post('/markAsSeen/:messageId', authMiddleware, async (req, res) => {
  const { messageId } = req.params;

  try {
    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      { status: 'seen' },
      { new: true }
    );

    res.status(200).json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Error updating message status', error: error.message });
  }
});

// Create a new conversation
router.post('/createConversation', authMiddleware, async (req, res) => {
  const { senderId, receiverId } = req.body;

  try {
    // Check if a conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      // Create a new conversation
      conversation = new Conversation({
        userThatStartedConvo: senderId,
        participants: [senderId, receiverId],
        lastMessage: null,
        lastUpdated: Date.now(),
      });

      await conversation.save();
      console.log("New conversation created");
    } else {
      console.log("Conversation already exists");
    }

    res.status(201).json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ message: 'Error creating conversation', error: error.message });
  }
});



// Delete a conversation
router.post('/deleteConversation/:conversationId', authMiddleware, async (req, res) => {
  const { conversationId } = req.params;

  try {
    // Delete messages
    await Message.deleteMany({ conversationId });

    // Delete conversation
    await Conversation.findByIdAndDelete(conversationId);

    res.status(200).json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting conversation', error: error.message });
  }
});

module.exports = router;
