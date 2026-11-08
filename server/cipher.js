const CryptoJS = require('crypto-js');

const DES_KEY = CryptoJS.enc.Utf8.parse('38346591');

/**
 * Decrypts JioSaavn encrypted_media_url using DES-ECB with key '38346591'
 * @param {string} encryptedMediaUrl 
 * @returns {string|null} Decrypted base media URL or null
 */
function decryptMediaUrl(encryptedMediaUrl) {
  if (!encryptedMediaUrl) return null;
  try {
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encryptedMediaUrl) },
      DES_KEY,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    const url = decrypted.toString(CryptoJS.enc.Utf8);
    return url && url.startsWith('http') ? url : null;
  } catch (err) {
    console.error('Failed to decrypt media url:', err.message);
    return null;
  }
}

/**
 * Generates stream URLs for multiple audio qualities
 * @param {string} decryptedUrl 
 * @returns {object} { '320': url, '160': url, '96': url, default: url }
 */
function getStreamUrls(decryptedUrl) {
  if (!decryptedUrl) return null;
  return {
    '320': decryptedUrl.replace(/_[0-9]+\.mp4/, '_320.mp4'),
    '160': decryptedUrl.replace(/_[0-9]+\.mp4/, '_160.mp4'),
    '96': decryptedUrl.replace(/_[0-9]+\.mp4/, '_96.mp4'),
    default: decryptedUrl.replace(/_[0-9]+\.mp4/, '_320.mp4')
  };
}

/**
 * Converts thumbnail image to high-resolution (500x500)
 * @param {string} imageUrl 
 * @returns {object} { thumb: string, high: string }
 */
function getImageUrls(imageUrl) {
  if (!imageUrl) {
    return {
      thumb: '/assets/default-cover.png',
      high: '/assets/default-cover.png'
    };
  }
  const clean = imageUrl.replace(/^http:\/\//, 'https://');
  return {
    thumb: clean.replace(/50x50|150x150/, '150x150'),
    high: clean.replace(/50x50|150x150/, '500x500')
  };
}

/**
 * Formats a raw JioSaavn song object into a clean Spotune song object
 */
function formatSong(song) {
  if (!song) return null;
  const decrypted = decryptMediaUrl(song.encrypted_media_url);
  const streams = getStreamUrls(decrypted);
  const images = getImageUrls(song.image);

  // Decode common HTML entities in titles
  const cleanTitle = (song.song || song.title || '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  const cleanAlbum = (song.album || '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'");

  const cleanArtist = (song.primary_artists || song.singers || song.music || song.artist || 'Unknown Artist')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'");

  return {
    id: song.id,
    title: cleanTitle,
    album: cleanAlbum,
    albumId: song.albumid,
    artist: cleanArtist,
    duration: parseInt(song.duration, 10) || 0,
    year: song.year || '',
    language: song.language || 'english',
    hasLyrics: song.has_lyrics === 'true' || song.has_lyrics === true,
    images: images,
    streams: streams,
    audioUrl: streams ? streams['320'] : null, // Default to 320kbps studio quality!
    is320kbps: song['320kbps'] === 'true' || song['320kbps'] === true || Boolean(streams)
  };
}

module.exports = {
  decryptMediaUrl,
  getStreamUrls,
  getImageUrls,
  formatSong
};
