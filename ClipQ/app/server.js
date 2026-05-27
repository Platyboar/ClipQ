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

// Proxy image endpoint to bypass CORS and Referrer checks
app.get('/api/proxy-image', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'Missing url parameter' });

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
                'Referer': 'https://www.instagram.com/'
            }
        });
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', contentType);
        res.send(Buffer.from(buffer));
    } catch (err) {
        res.status(500).json({ error: 'Failed to proxy image' });
    }
});


// Endpoint to extract direct video URL and metadata via yt-dlp (runs as subprocess via python)
app.get('/api/video-url', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: 'Missing url parameter' });

    const { exec } = require('child_process');
    // Escape the URL to prevent command injection
    const escapedUrl = videoUrl.replace(/(["'$`\\])/g, '\\$1');

    exec(`python -m yt_dlp -j "${escapedUrl}"`, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        try {
            const info = JSON.parse(stdout);
            res.json({
                url: info.url,
                duration: info.duration,
                thumbnail: info.thumbnail,
                title: info.title,
                uploader: info.uploader
            });
        } catch (e) {
            res.status(500).json({ error: 'Failed to parse yt-dlp output' });
        }
    });
});


// All routes serve index.html (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n  ClipQ is running at http://localhost:${PORT}\n`);
});
