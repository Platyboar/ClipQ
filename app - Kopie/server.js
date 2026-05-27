const express = require('express');
const path = require('path');
const app = express();
const PORT = 8000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Proxy endpoint for oEmbed requests (avoids CORS issues)
app.get('/api/oembed', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'Missing url parameter' });

    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch oEmbed data' });
    }
});

// All routes serve index.html (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n  ClipQ is running at http://localhost:${PORT}\n`);
});
