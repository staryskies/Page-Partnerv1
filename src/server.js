const express = require('express');
const path = require('path');
const bookRoutes = require('./routes/book');
const { connectDB, initDB } = require('./db');

const app = express();
app.use(express.json());

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// API routes
connectDB()
  .then(() => initDB())
  .then(() => {
    app.use('/api', bookRoutes);
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch(err => console.error('Failed to start server:', err));