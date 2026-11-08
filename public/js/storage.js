/**
 * Spotune - Client-Side Storage Manager (Liked Songs, Custom Playlists, History, Settings)
 */
const Storage = {
  KEYS: {
    LIKED: 'spotune_liked_songs',
    PLAYLISTS: 'spotune_playlists',
    HISTORY: 'spotune_history',
    SETTINGS: 'spotune_settings'
  },

  // Liked Songs
  getLikedSongs() {
    try {
      const data = localStorage.getItem(this.KEYS.LIKED);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  isSongLiked(songId) {
    if (!songId) return false;
    const liked = this.getLikedSongs();
    return liked.some(s => s.id === songId);
  },

  toggleLike(song) {
    if (!song || !song.id) return false;
    const liked = this.getLikedSongs();
    const idx = liked.findIndex(s => s.id === song.id);
    let isNowLiked = false;

    if (idx >= 0) {
      liked.splice(idx, 1);
      isNowLiked = false;
    } else {
      liked.unshift(song);
      isNowLiked = true;
    }

    localStorage.setItem(this.KEYS.LIKED, JSON.stringify(liked));
    window.dispatchEvent(new CustomEvent('spotune:liked-changed', { detail: { song, isLiked: isNowLiked, total: liked.length } }));
    return isNowLiked;
  },

  // Custom User Playlists
  getPlaylists() {
    try {
      const data = localStorage.getItem(this.KEYS.PLAYLISTS);
      return data ? JSON.parse(data) : [
        { id: 'fav_hits', title: 'My Favorites', description: 'Curated by you', songs: [] }
      ];
    } catch {
      return [];
    }
  },

  createPlaylist(title) {
    const playlists = this.getPlaylists();
    const newPl = {
      id: 'pl_' + Date.now(),
      title: title.trim() || 'My Playlist',
      description: 'Created on Spotune',
      createdAt: new Date().toLocaleDateString(),
      songs: []
    };
    playlists.push(newPl);
    localStorage.setItem(this.KEYS.PLAYLISTS, JSON.stringify(playlists));
    window.dispatchEvent(new CustomEvent('spotune:playlists-changed', { detail: { playlists } }));
    return newPl;
  },

  addSongToPlaylist(playlistId, song) {
    const playlists = this.getPlaylists();
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return false;
    if (!pl.songs.some(s => s.id === song.id)) {
      pl.songs.push(song);
      localStorage.setItem(this.KEYS.PLAYLISTS, JSON.stringify(playlists));
      window.dispatchEvent(new CustomEvent('spotune:playlists-changed', { detail: { playlists } }));
      return true;
    }
    return false;
  },

  removeSongFromPlaylist(playlistId, songId) {
    const playlists = this.getPlaylists();
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;
    pl.songs = pl.songs.filter(s => s.id !== songId);
    localStorage.setItem(this.KEYS.PLAYLISTS, JSON.stringify(playlists));
    window.dispatchEvent(new CustomEvent('spotune:playlists-changed', { detail: { playlists } }));
  },

  // Listening History
  addToHistory(song) {
    if (!song || !song.id) return;
    try {
      let history = this.getHistory();
      history = history.filter(s => s.id !== song.id);
      history.unshift(song);
      if (history.length > 50) history.pop();
      localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(history));
    } catch {}
  },

  getHistory() {
    try {
      const data = localStorage.getItem(this.KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // Settings
  getSettings() {
    try {
      const data = localStorage.getItem(this.KEYS.SETTINGS);
      return data ? JSON.parse(data) : {
        quality: '320', // Default 320kbps Hi-Fi
        volume: 0.8,
        eqPreset: 'bass',
        eqBands: [4, 2, 0, 1, 2] // Default bass boost
      };
    } catch {
      return { quality: '320', volume: 0.8, eqPreset: 'bass', eqBands: [4, 2, 0, 1, 2] };
    }
  },

  saveSettings(settings) {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(updated));
  }
};
