const { formatSong, getImageUrls } = require('./cipher');

const SAAVN_BASE = 'https://www.jiosaavn.com/api.php';

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*'
    }
  });
  if (!res.ok) {
    throw new Error(`API responded with status ${res.status}`);
  }
  return await res.json();
}

/**
 * Search songs with high quality 320kbps streams
 */
async function searchSongs(query, limit = 25, page = 1) {
  const url = `${SAAVN_BASE}?__call=search.getResults&_format=json&n=${limit}&p=${page}&q=${encodeURIComponent(query)}&_marker=0&ctx=web6dot0`;
  const data = await fetchJson(url);
  const results = data.results || [];
  return results.map(formatSong).filter(s => s && s.streams);
}

/**
 * Search albums
 */
async function searchAlbums(query, limit = 15, page = 1) {
  const url = `${SAAVN_BASE}?__call=search.getAlbumResults&_format=json&n=${limit}&p=${page}&q=${encodeURIComponent(query)}&_marker=0&ctx=web6dot0`;
  const data = await fetchJson(url);
  const results = data.results || [];
  return results.map(a => ({
    id: a.albumid || a.id,
    title: (a.title || a.name || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
    artist: (a.primary_artists || a.artist || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
    year: a.year || '',
    language: a.language || '',
    images: getImageUrls(a.image)
  }));
}

/**
 * Search playlists
 */
async function searchPlaylists(query, limit = 15, page = 1) {
  const url = `${SAAVN_BASE}?__call=search.getPlaylistResults&_format=json&n=${limit}&p=${page}&q=${encodeURIComponent(query)}&_marker=0&ctx=web6dot0`;
  const data = await fetchJson(url);
  const results = data.results || [];
  return results.map(p => ({
    id: p.listid || p.id,
    title: (p.listname || p.title || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
    songCount: p.count || p.numsongs || '0',
    language: p.language || '',
    images: getImageUrls(p.image)
  }));
}

/**
 * Get album details and songs
 */
async function getAlbumDetails(albumId) {
  const url = `${SAAVN_BASE}?__call=content.getAlbumDetails&_format=json&cc=in&_marker=0%3F_marker%3D0&albumid=${encodeURIComponent(albumId)}`;
  const data = await fetchJson(url);
  const songs = (data.songs || []).map(formatSong).filter(s => s && s.streams);
  return {
    id: data.albumid || albumId,
    title: (data.title || data.name || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
    artist: (data.primary_artists || data.artist || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
    year: data.year || '',
    images: getImageUrls(data.image),
    songCount: songs.length,
    songs: songs
  };
}

/**
 * Get playlist details and songs
 */
async function getPlaylistDetails(listId) {
  const url = `${SAAVN_BASE}?__call=playlist.getDetails&_format=json&cc=in&_marker=0%3F_marker%3D0&listid=${encodeURIComponent(listId)}`;
  const data = await fetchJson(url);
  const songs = (data.songs || []).map(formatSong).filter(s => s && s.streams);
  return {
    id: data.listid || listId,
    title: (data.listname || data.title || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
    description: (data.description || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
    images: getImageUrls(data.image),
    songCount: songs.length,
    songs: songs
  };
}

/**
 * Get curated trending and featured music for the Spotify Home view
 */
async function getHomeFeed() {
  const categories = [
    { key: 'trending', title: 'Trending Global Hits', query: 'Global Top Hits 2024' },
    { key: 'english_top', title: 'Today\'s Top Hits', query: 'Top Pop English 2024' },
    { key: 'hiphop', title: 'Hip-Hop & Rap Energy', query: 'Hip Hop Hits' },
    { key: 'lofi', title: 'Chill Lo-Fi & Focus Beats', query: 'Lofi Chill' },
    { key: 'rock', title: 'Rock & Alternative Anthems', query: 'Rock Classics Hits' },
    { key: 'electronic', title: 'Electronic & Dance Club', query: 'EDM Dance Hits' },
    { key: 'bollywood', title: 'Bollywood & Desi Superhits', query: 'Hindi Superhits' }
  ];

  const feed = {};

  // Fetch in parallel for speed
  await Promise.all(categories.map(async cat => {
    try {
      const songs = await searchSongs(cat.query, 12, 1);
      feed[cat.key] = {
        title: cat.title,
        query: cat.query,
        songs: songs
      };
    } catch (err) {
      console.error(`Error loading category ${cat.key}:`, err.message);
      feed[cat.key] = { title: cat.title, query: cat.query, songs: [] };
    }
  }));

  return feed;
}

/**
 * Fetch synchronized or plain lyrics from lrclib
 */
async function getLyrics(trackName, artistName, duration = null) {
  try {
    const cleanTrack = encodeURIComponent(trackName.replace(/\(.*?\)|\[.*?\]/g, '').trim());
    const cleanArtist = encodeURIComponent(artistName.split(',')[0].trim());

    let url = `https://lrclib.net/api/get?artist_name=${cleanArtist}&track_name=${cleanTrack}`;
    if (duration) {
      url += `&duration=${Math.round(duration)}`;
    }

    let res = await fetch(url, { headers: { 'User-Agent': 'Spotune/1.0' } });
    if (res.ok) {
      const data = await res.json();
      return {
        synced: data.syncedLyrics || null,
        plain: data.plainLyrics || null,
        instrumental: data.instrumental || false
      };
    }

    // Fallback: search lrclib
    const searchUrl = `https://lrclib.net/api/search?q=${cleanTrack}+${cleanArtist}`;
    res = await fetch(searchUrl, { headers: { 'User-Agent': 'Spotune/1.0' } });
    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items) && items.length > 0) {
        const best = items[0];
        return {
          synced: best.syncedLyrics || null,
          plain: best.plainLyrics || null,
          instrumental: best.instrumental || false
        };
      }
    }

    return { synced: null, plain: null, instrumental: false };
  } catch (err) {
    console.error('Lyrics fetch error:', err.message);
    return { synced: null, plain: null, instrumental: false };
  }
}

module.exports = {
  searchSongs,
  searchAlbums,
  searchPlaylists,
  getAlbumDetails,
  getPlaylistDetails,
  getHomeFeed,
  getLyrics
};
