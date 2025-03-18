const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const initSocket = require('./socket');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

//User Routes
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);


//Listing Routes
const listingRoutes = require('./routes/listings');
app.use('/api/listings', listingRoutes);

//imageUpload Routes
const imageUploadRoutes = require('./routes/imageUpload');
app.use('/api/images', imageUploadRoutes);

//Messaging Routes
const messagingRoutes = require('./routes/messaging');
app.use('/api/messaging', messagingRoutes);

//Code to email Routes
const codeToEmailRoutes = require('./routes/codeToEmail');
app.use('/api/codeToEmail', codeToEmailRoutes);

//Feedback Routes
const feedBackRoutes = require('./routes/feedback');
app.use('/api/feedback', feedBackRoutes);

const server = http.createServer(app); // Create an HTTP server
initSocket(server);

// Connect to MongoDB and start the server
mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => { // Use the HTTP server to listen
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => console.error('MongoDB connection error:', error));
