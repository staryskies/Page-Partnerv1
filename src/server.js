const express = require('express');
const bookRoutes = require('./routes/book');
const { connectDB, initDB } = require('./db');

const app = express();
app.use(express.json());

// Initialize DB and start server
connectDB()
  .then(() => initDB())
  .then(() => {
    app.use('/api', bookRoutes);
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch(err => console.error('Failed to start server:', err));