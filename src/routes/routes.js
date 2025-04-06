app.get('/api/suggest-circles/:genre', async (req, res) => {
    try {
      const genre = req.params.genre;
      const result = await db.query(
        'SELECT * FROM circles WHERE book_id IN (SELECT id FROM books WHERE genre = $1)',
        [genre]
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
  });