const express = require('express');
const router = express.Router();
const MusicController = require('../controllers/musicController');

const musicController = new MusicController();

router.get('/search', async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        const results = await musicController.searchMusic(query);
        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'An error occurred while searching for music.' });
    }
});

module.exports = router;