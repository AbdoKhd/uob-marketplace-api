const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConversationSchema = new mongoose.Schema({
  //Fields:

  userThatStartedConvo: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  participants: [
    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ],
  lastMessage: { 
    type: Schema.Types.ObjectId, 
    ref: 'Message' 
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true })

const Conversation = mongoose.model('Conversation', ConversationSchema);

module.exports = Conversation;