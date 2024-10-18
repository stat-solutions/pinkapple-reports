require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { connect } = require('./dbConnector'); // Import the MySQL connection pool

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO and configure CORS
const io = socketIo(server, {
  cors: {
    origin: "*",  // Allow all origins; replace with specific domains if needed
    methods: ["GET", "POST"]
  }
});

// Enable CORS globally for the Express app
app.use(cors());

const port = process.env.PORT || 3000; // Read port from .env or use 3000

// Store connections for subscribers
const subscribers = {};

// Middleware to parse JSON requests
app.use(express.json());

// Serve a basic homepage
app.get('/', (req, res) => {
  res.send('Welcome to the Notification System');
});

// Serve static files if necessary (make sure to put your client HTML in a public folder)
app.use(express.static('public'));

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log('A new client connected');

  // Handle subscriber registration
  socket.on('register', (phone) => {
    console.log(`Subscriber with phone ${phone} connected`);
    subscribers[phone] = socket;
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    for (let [phone, value] of Object.entries(subscribers)) {
      if (value === socket) {
        delete subscribers[phone];
        console.log(`Subscriber with phone ${phone} disconnected`);
        break;
      }
    }
  });
});

// Define an endpoint to push notifications
app.post('/push-notification', async (req, res) => {
  const { phone, data } = req.body;

  try {
    // Step 1: Save the report to the MySQL database
    const insertQuery = 'INSERT INTO reports (phone, report_data, created_at) VALUES (?, ?, NOW())';
    await connect.query(insertQuery, [phone, data]); // Use connect instead of db

    // Step 2: Fetch reports from the last 30 days
    const selectQuery = `
      SELECT report_data, created_at 
      FROM reports 
      WHERE phone = ? 
      AND created_at >= NOW() - INTERVAL 30 DAY 
      ORDER BY created_at ASC
    `;
    const [results] = await connect.query(selectQuery, [phone]);

    // Step 3: Send notification with individual reports for the last 30 days
    if (subscribers[phone]) {
      results.forEach((report) => {
        subscribers[phone].emit('notification', { 
          message: report.report_data, 
          timestamp: report.created_at 
        });
      });
      res.send(`Notifications sent to subscriber with phone ${phone}`);
    } else {
      res.send(`Subscriber with phone ${phone} is not connected. Notification will be delivered when they reconnect.`);
    }
  } catch (err) {
    console.error('Error handling push notification:', err);
    res.status(500).send('Server error');
  }
});

// Start the server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
