const express = require('express');
const path = require('path');
const bookRoutes = require('./routes/book');
const { connectDB, initDB } = require('./db');
const authRoutes = require('./routes/auth');

const app = express();
app.use(express.json());

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api', bookRoutes);

// Add auth routes
app.use('/api/auth', authRoutes);

// Serve index.html for the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Initialize DB and start server
connectDB()
  .then(() => initDB())
  .then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch(err => console.error('Failed to start server:', err));