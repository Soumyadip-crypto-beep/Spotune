const express = require('express');
const cors = require('cors');
const path = require('path');
const {
  searchSongs,
  searchAlbums,
  searchPlaylists,
  getAlbumDetails,
  getPlaylistDetails,
  getHomeFeed,
  getLyrics
} = require('./api');

const app = express();
const DEFAULT_PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Ping endpoint
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', app: 'Spotune', timestamp: Date.now() });
});

// Home feed
app.get('/api/home', async (req, res) => {
  try {
    const feed = await getHomeFeed();
    res.json({ success: true, data: feed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Search
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const type = req.query.type || 'all'; // song, album, playlist, all
    const limit = parseInt(req.query.limit, 10) || 20;

    if (!query.trim()) {
      return res.json({ success: true, data: { songs: [], albums: [], playlists: [] } });
    }

    if (type === 'song') {
      const songs = await searchSongs(query, limit);
      return res.json({ success: true, data: { songs } });
    }

    if (type === 'album') {
      const albums = await searchAlbums(query, limit);
      return res.json({ success: true, data: { albums } });
    }

    if (type === 'playlist') {
      const playlists = await searchPlaylists(query, limit);
      return res.json({ success: true, data: { playlists } });
    }

    // Default: 'all'
    const [songs, albums, playlists] = await Promise.all([
      searchSongs(query, limit).catch(() => []),
      searchAlbums(query, 8).catch(() => []),
      searchPlaylists(query, 8).catch(() => [])
    ]);

    res.json({
      success: true,
      data: { songs, albums, playlists }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Album details
app.get('/api/album/:id', async (req, res) => {
  try {
    const data = await getAlbumDetails(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Playlist details
app.get('/api/playlist/:id', async (req, res) => {
  try {
    const data = await getPlaylistDetails(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Synchronized Lyrics
app.get('/api/lyrics', async (req, res) => {
  try {
    const { track, artist, duration } = req.query;
    if (!track || !artist) {
      return res.status(400).json({ success: false, error: 'track and artist required' });
    }
    const data = await getLyrics(track, artist, duration);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Audio Stream Proxy (supports Range requests for instant seeking & zero buffering)
app.get('/api/stream', async (req, res) => {
  const audioUrl = req.query.url;
  if (!audioUrl) return res.status(400).send('url parameter required');

  try {
    const headers = { 'User-Agent': 'Mozilla/5.0' };
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const upstream = await fetch(audioUrl, { headers });

    res.status(upstream.status);
    for (const [key, val] of upstream.headers.entries()) {
      if (['content-type', 'content-length', 'content-range', 'accept-ranges'].includes(key.toLowerCase())) {
        res.setHeader(key, val);
      }
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');

    // Pipe response stream
    const reader = upstream.body.getReader();
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } catch (e) {
        res.end();
      }
    };
    pump();
  } catch (err) {
    res.status(502).send('Error streaming audio');
  }
});

// Direct MP3 Download Endpoint
app.get('/api/download', async (req, res) => {
  const { url, title, artist } = req.query;
  if (!url) return res.status(400).send('url required');

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) return res.status(upstream.status).send('Download failed');

    const safeTitle = (title || 'Track').replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
    const safeArtist = (artist || 'Spotune').replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
    const filename = `${safeArtist} - ${safeTitle}.m4a`;

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'audio/mp4');
    if (upstream.headers.has('content-length')) {
      res.setHeader('Content-Length', upstream.headers.get('content-length'));
    }

    const reader = upstream.body.getReader();
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } catch (e) {
        res.end();
      }
    };
    pump();
  } catch (err) {
    res.status(500).send('Failed to download');
  }
});

// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start listening with port fallback
function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`===============================================`);
    console.log(` 🎵 Spotune Ad-Free Hi-Fi Music Server running!`);
    console.log(` 🌐 Website URL: http://localhost:${port}`);
    console.log(` ⚡ Quality: 320kbps Studio Master`);
    console.log(` 🚫 Ads: Zero (100% Ad-Free)`);
    console.log(`===============================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

module.exports = app;

if (require.main === module) {
  startServer(DEFAULT_PORT);
}
