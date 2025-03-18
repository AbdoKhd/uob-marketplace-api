const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MessageSchema = new mongoose.Schema({
  //Fields:

  senderId: {
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  receiverId: {
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date, 
    default: Date.now
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'seen'],
    default: 'sent'
  }
}, { timestamps: true })

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;