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
  socket.on('register', async (phone) => {
    console.log(`Subscriber with phone ${phone} connected`);
    subscribers[phone] = socket; // Store the socket connection

    try {
      // Fetch reports from the last 30 days in UTC format
      const selectQuery = `
        SELECT report_data, CONVERT_TZ(created_at, @@session.time_zone, '+00:00') AS created_at 
        FROM reports 
        WHERE phone = ? 
        AND created_at >= UTC_TIMESTAMP() - INTERVAL 2 DAY 
        ORDER BY created_at ASC
      `;

      // Log to verify the phone number
      console.log(`Querying reports for phone number: ${phone}`);

      const [results] = await connect.query(selectQuery, [phone]);

      // Log the results to debug
      console.log(`Reports found for phone ${phone}:`, results);

      // If reports are found, send them to the subscriber
      if (results.length > 0) {
        const reportArray = results.map((report) => ({
          message: report.report_data,
          timestamp: report.created_at // Already in UTC ISO 8601 format
        }));

        console.log(`Sending an array of reports to phone ${phone}`);
        // Emit the array of reports at once
        socket.emit('notification', { 
          reports: reportArray 
        });
      } else {
        // If no reports, send a welcome message
        console.log(`No reports found for phone ${phone}, sending welcome message.`);
        socket.emit('notification', { 
          message: "Welcome to pinkapple reports app. We will send you the reports as they come in." 
        });
      }
    } catch (err) {
      console.error('Error fetching reports for the subscriber:', err);
      socket.emit('notification', { 
        message: "An error occurred while fetching your reports. Please try again later." 
      });
    }
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

// Define an endpoint to push new notifications (only the new data is sent)
app.post('/push-notification', async (req, res) => {
  const { phone, data } = req.body;

  try {
    // Step 1: Save the new report to the MySQL database with UTC timestamp
    const insertQuery = 'INSERT INTO reports (phone, report_data, created_at) VALUES (?, ?, UTC_TIMESTAMP())';
    await connect.query(insertQuery, [phone, data]);

    // Step 2: Emit the new report to the connected subscriber
    if (subscribers[phone]) {
      // Only emit the new report (just saved) to the connected subscriber
      subscribers[phone].emit('notification', { 
        message: data,  // Emit the new report data
        timestamp: new Date().toISOString()  // Send the current UTC timestamp
      });
      res.send(`Notification sent to subscriber with phone ${phone}`);
    } else {
      // Handle the case where the subscriber is not connected
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
