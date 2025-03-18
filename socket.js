const { Server } = require('socket.io');
const axios = require('axios');
const Message = require('./models/Message');

const initSocket = (server) => {

  const io = new Server(server, {
    cors: {
      origin: "http://192.168.1.179:3000", // Allow requests from your frontend
      methods: ["GET", "POST"],
    },
  });

  const usersInRoom = {}; // { roomId: Set([userIds]) }

  io.on('connection', async (socket) => {
    console.log("A user connected:", socket.id);

    const roomId = socket.handshake.query.roomId;
    let personalRoomId = socket.handshake.query.loggedInUserId;

    // Automatically join room after reconnecting because when the screen turns off and on, joinRoom event does not emit, only connect()
    if (roomId) {
      console.log(`User ${socket.id} Rejoining room ${roomId}`);
      socket.join(roomId);

      if (!usersInRoom[roomId]) {
        usersInRoom[roomId] = new Set();
      }
      usersInRoom[roomId].add(personalRoomId);

      // Fetch messages again here after rejoining room.
      io.to(roomId).emit("fetchMessagesAgain", {userId: personalRoomId});
    }


    // Automatically join personal room after reconnecting because when the screen turns off and on, joinRoom event does not emit, only connect()
    if (personalRoomId) {
      console.log(`User ${socket.id} Rejoining personal room ${personalRoomId}`);
      socket.join(personalRoomId);

      // Fetch conversations again after rejoining personal room
      io.to(personalRoomId).emit("fetchConvosAgain");
    }

    // Join a personal room (this room is just for me. All messages sent to me will be sent to this room)
    socket.on('joinPersonalRoom', (roomId) => {
      
      socket.join(roomId);
      console.log(`User ${socket.id} joined the personal room ${roomId}`);
      
    });

    // Join a personal room (this room is just for me. All messages sent to me will be sent to this room)
    socket.on('leavePersonalRoom', (roomId) => {
      socket.leave(roomId);
      console.log(`User ${socket.id} left the personal room ${roomId}`);
    });

    // Join a conversation room (this room is private between sender and receiver)
    socket.on('joinRoom', ({roomId, userId}) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);

      if (!usersInRoom[roomId]) {
        usersInRoom[roomId] = new Set();
      }
      usersInRoom[roomId].add(userId);
    });


    // Leave a room
    socket.on('leaveRoom', ({roomId, userId}) => {
      socket.leave(roomId);
      console.log(`User ${socket.id} left room ${roomId}`);

      if (usersInRoom[roomId]) {
        usersInRoom[roomId].delete(userId);
  
        // Clean up empty rooms
        if (usersInRoom[roomId].size === 0) {
          delete usersInRoom[roomId];
        }
      }
    });

    // Send a message to a room
    socket.on('sendMessageToRoom', async ({ roomId, message }) => {
      try{

        console.log(`Message sent to room ${roomId}:`, message);

        // Check if room exists in usersInRoom before accessing it
        const isReceiverInRoom = usersInRoom[roomId] && usersInRoom[roomId].has(message.receiverId);

        console.log("users in room: ", usersInRoom[roomId]);

        // If the receiverId is currently in the room, status should be 'seen'
        const messageStatus = isReceiverInRoom ? 'seen' : 'sent';

        // Emit the message to the receiver and sender's personal room (for MessagesPage UI)
        io.to(message.receiverId).to(message.senderId).emit("directMessage", {
          conversationId: roomId,
          senderId: message.senderId,
          content: message.content,
          timestamp: message.timestamp,
          status: messageStatus,
        });

        // Emit to the room (for ChatBox UI)
        io.to(roomId).emit('roomMessage', {
          conversationId: roomId,
          senderId: message.senderId,
          content: message.content,
          timestamp: message.timestamp,
          status: messageStatus,
        });

        await axios.post(`http://192.168.1.179:5000/api/messaging/sendMessage/${roomId}`, {
          senderId: message.senderId,
          receiverId: message.receiverId,
          content: message.content,
          status: messageStatus,
        });


      }catch (error) {
        console.error("Error sending message:", error);
      }


    });

    socket.on("markAsSeen", async ({ userSeingId, conversationId }) => {
      try {
        // Update all messages in the conversation that are still "sent"
        await Message.updateMany(
          { conversationId: conversationId, senderId: { $ne: userSeingId }, status: "sent" },
          { $set: { status: "seen" } }
        );


        // .to conversationId because we have to change status in real time, only when the convo is open (private room with 2 users)
        // so that UI changes real time
        io.to(conversationId).emit("messageStatusUpdate", {userSeingId: userSeingId, status: "seen" });
        io.to(userSeingId).emit("convoLastMessageStatusUpdate", {conversationId: conversationId, status: "seen" });
      } catch (error) {
        console.error("Error updating message status:", error);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.id);


      // Remove the user from all rooms they were in
      for (const roomId in usersInRoom) {
        usersInRoom[roomId].delete(personalRoomId);
        if (usersInRoom[roomId].size === 0) {
          delete usersInRoom[roomId];
        }
      }
    });
  });


  return io; // Return the Socket.IO instance if needed elsewhere

};

module.exports = initSocket;
