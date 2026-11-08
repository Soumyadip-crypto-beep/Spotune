/**
 * Spotune - Application Controller & Router
 */
document.addEventListener('DOMContentLoaded', () => {
  const player = new SpotunePlayer();

  // Navigation State
  let currentView = 'home';
  const historyStack = ['home'];
  let historyIdx = 0;

  // View Panels
  const views = {
    home: document.getElementById('view-home'),
    search: document.getElementById('view-search'),
    library: document.getElementById('view-library'),
    detail: document.getElementById('view-detail')
  };

  const navItems = {
    home: document.getElementById('nav-home'),
    search: document.getElementById('nav-search'),
    library: document.getElementById('nav-library')
  };

  // Switch View
  function switchView(viewName, pushHistory = true) {
    if (!views[viewName]) return;
    currentView = viewName;

    Object.values(views).forEach(v => v.classList.remove('active'));
    views[viewName].classList.add('active');

    Object.entries(navItems).forEach(([key, btn]) => {
      btn.classList.toggle('active', key === viewName);
    });

    if (pushHistory) {
      if (historyIdx < historyStack.length - 1) {
        historyStack.splice(historyIdx + 1);
      }
      historyStack.push(viewName);
      historyIdx = historyStack.length - 1;
    }

    updateNavHistoryButtons();

    // Scroll main viewport to top
    const scrollView = document.getElementById('scroll-view');
    if (scrollView) scrollView.scrollTop = 0;
  }

  function updateNavHistoryButtons() {
    const btnBack = document.getElementById('btn-nav-back');
    const btnFwd = document.getElementById('btn-nav-forward');
    if (btnBack) btnBack.disabled = historyIdx <= 0;
    if (btnFwd) btnFwd.disabled = historyIdx >= historyStack.length - 1;
  }

  // History Buttons
  document.getElementById('btn-nav-back').addEventListener('click', () => {
    if (historyIdx > 0) {
      historyIdx--;
      switchView(historyStack[historyIdx], false);
    }
  });

  document.getElementById('btn-nav-forward').addEventListener('click', () => {
    if (historyIdx < historyStack.length - 1) {
      historyIdx++;
      switchView(historyStack[historyIdx], false);
    }
  });

  // Nav Click Handlers
  document.getElementById('nav-brand').addEventListener('click', (e) => {
    e.preventDefault();
    switchView('home');
  });

  document.getElementById('nav-home').addEventListener('click', () => switchView('home'));
  document.getElementById('nav-search').addEventListener('click', () => {
    switchView('search');
    const inp = document.getElementById('global-search-input');
    if (inp) inp.focus();
  });
  document.getElementById('nav-library').addEventListener('click', () => {
    switchView('library');
    renderLibraryView();
  });

  // Shortcut Liked Songs Click
  document.getElementById('shortcut-liked').addEventListener('click', () => {
    openLikedSongsView();
  });

  // Greeting Message
  function updateGreeting() {
    const greetingEl = document.getElementById('greeting-text');
    if (!greetingEl) return;
    const hour = new Date().getHours();
    let text = 'Good evening';
    if (hour >= 5 && hour < 12) text = 'Good morning';
    else if (hour >= 12 && hour < 18) text = 'Good afternoon';
    greetingEl.textContent = text;
  }
  updateGreeting();

  // Load Home Feed
  async function loadHomeFeed() {
    const container = document.getElementById('feed-sections-container');
    const quickGrid = document.getElementById('quick-access-grid');

    try {
      const res = await fetch('/api/home');
      const json = await res.json();

      if (!json.success || !json.data) {
        container.innerHTML = '<p class="error-msg">Failed to load recommendations. Please refresh.</p>';
        return;
      }

      const feed = json.data;

      // Render Top 6 Quick Access Cards
      if (quickGrid) {
        quickGrid.innerHTML = '';
        const quickCategories = [
          { title: 'Global Top 50', query: 'Global Top Hits 2024', key: 'trending' },
          { title: 'Today\'s Top Hits', query: 'Top Pop English 2024', key: 'english_top' },
          { title: 'Chill Lo-Fi Beats', query: 'Lofi Chill', key: 'lofi' },
          { title: 'Hip-Hop Energy', query: 'Hip Hop Hits', key: 'hiphop' },
          { title: 'Rock Classics', query: 'Rock Classics Hits', key: 'rock' },
          { title: 'Bollywood Magic', query: 'Hindi Superhits', key: 'bollywood' }
        ];

        quickCategories.forEach(cat => {
          const songs = (feed[cat.key] && feed[cat.key].songs) || [];
          const thumb = (songs[0] && songs[0].images && songs[0].images.thumb) || '/assets/default-cover.svg';

          const card = document.createElement('div');
          card.className = 'quick-card';
          card.innerHTML = `
            <img src="${thumb}" class="quick-card-img" alt="${cat.title}">
            <span class="quick-card-title">${cat.title}</span>
            <button class="quick-play-btn" title="Play ${cat.title}">
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </button>
          `;

          card.addEventListener('click', (e) => {
            if (e.target.closest('.quick-play-btn')) {
              if (songs.length) player.playTrack(songs[0], songs, 0);
            } else {
              openCustomPlaylistView(cat.title, songs);
            }
          });

          quickGrid.appendChild(card);
        });
      }

      // Render Section Cards
      if (container) {
        container.innerHTML = '';

        Object.values(feed).forEach(sec => {
          if (!sec.songs || !sec.songs.length) return;

          const secEl = document.createElement('div');
          secEl.className = 'feed-section';

          secEl.innerHTML = `
            <div class="section-header">
              <h2 class="section-title">${sec.title}</h2>
              <span class="section-see-all">Show all</span>
            </div>
            <div class="cards-grid"></div>
          `;

          const grid = secEl.querySelector('.cards-grid');
          sec.songs.slice(0, 6).forEach((song, idx) => {
            const card = document.createElement('div');
            card.className = 'music-card';
            const img = (song.images && (song.images.high || song.images.thumb)) || '/assets/default-cover.svg';

            card.innerHTML = `
              <div class="card-img-wrap">
                <img src="${img}" class="card-img" alt="${song.title}" loading="lazy">
                <button class="card-play-btn" title="Play">
                  <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </button>
              </div>
              <div class="card-title">${song.title}</div>
              <div class="card-desc">${song.artist}</div>
            `;

            card.addEventListener('click', (e) => {
              if (e.target.closest('.card-play-btn')) {
                player.playTrack(song, sec.songs, idx);
              } else {
                player.playTrack(song, sec.songs, idx);
              }
            });

            grid.appendChild(card);
          });

          secEl.querySelector('.section-see-all').addEventListener('click', () => {
            openCustomPlaylistView(sec.title, sec.songs);
          });

          container.appendChild(secEl);
        });
      }
    } catch (err) {
      console.error('Home feed error:', err);
    }
  }

  // SEARCH FUNCTIONALITY
  const searchInput = document.getElementById('global-search-input');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const browseCategories = document.getElementById('browse-categories');
  const searchResultsWrap = document.getElementById('search-results-container');
  let searchDebounceTimer = null;

  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    btnClearSearch.style.display = q ? 'block' : 'none';

    if (currentView !== 'search') {
      switchView('search');
    }

    clearTimeout(searchDebounceTimer);
    if (!q) {
      browseCategories.style.display = 'block';
      searchResultsWrap.style.display = 'none';
      return;
    }

    searchDebounceTimer = setTimeout(() => {
      executeSearch(q);
    }, 280);
  });

  btnClearSearch.addEventListener('click', () => {
    searchInput.value = '';
    btnClearSearch.style.display = 'none';
    browseCategories.style.display = 'block';
    searchResultsWrap.style.display = 'none';
  });

  // Filter Pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const q = searchInput.value.trim();
      if (q) executeSearch(q, pill.dataset.filter);
    });
  });

  async function executeSearch(query, filter = 'all') {
    browseCategories.style.display = 'none';
    searchResultsWrap.style.display = 'block';

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${filter}&limit=20`);
      const json = await res.json();
      if (!json.success || !json.data) return;

      renderSearchResults(json.data, filter);
    } catch (err) {
      console.error('Search error:', err);
    }
  }

  function renderSearchResults(data, filter) {
    const topRow = document.getElementById('search-top-row');
    const topCard = document.getElementById('search-top-result');
    const miniSongs = document.getElementById('search-songs-list');
    const allSongsTable = document.getElementById('search-full-songs-table');
    const albumsGrid = document.getElementById('search-albums-grid');
    const playlistsGrid = document.getElementById('search-playlists-grid');

    const songs = data.songs || [];
    const albums = data.albums || [];
    const playlists = data.playlists || [];

    // Top Result & 4 Mini Songs
    if (filter === 'all' && songs.length > 0) {
      topRow.style.display = 'grid';
      const best = songs[0];
      const bestImg = (best.images && best.images.high) || '/assets/default-cover.svg';

      topCard.innerHTML = `
        <img src="${bestImg}" class="top-result-img" alt="${best.title}">
        <div class="top-result-title">${best.title}</div>
        <div class="card-desc">${best.artist}</div>
        <span class="top-result-badge">Song</span>
        <button class="card-play-btn" title="Play">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
      `;

      topCard.onclick = () => player.playTrack(best, songs, 0);

      miniSongs.innerHTML = '';
      songs.slice(1, 5).forEach((s, idx) => {
        const row = document.createElement('div');
        row.className = 'song-row-mini';
        const img = (s.images && s.images.thumb) || '/assets/default-cover.svg';
        row.innerHTML = `
          <img src="${img}" class="mini-img" alt="${s.title}">
          <div class="mini-meta">
            <div class="mini-title">${s.title}</div>
            <div class="mini-artist">${s.artist}</div>
          </div>
          <span class="mini-time">${player.formatTime(s.duration)}</span>
        `;
        row.addEventListener('click', () => player.playTrack(s, songs, idx + 1));
        miniSongs.appendChild(row);
      });
    } else {
      topRow.style.display = 'none';
    }

    // Full Songs Table
    const secAllSongs = document.getElementById('section-all-songs');
    if (songs.length > 0) {
      secAllSongs.style.display = 'block';
      allSongsTable.innerHTML = '';
      renderTrackRows(allSongsTable, songs);
    } else {
      secAllSongs.style.display = 'none';
    }

    // Albums Grid
    const secAlbums = document.getElementById('section-albums');
    if (albums.length > 0) {
      secAlbums.style.display = 'block';
      albumsGrid.innerHTML = '';
      albums.forEach(album => {
        const card = document.createElement('div');
        card.className = 'music-card';
        const img = (album.images && album.images.thumb) || '/assets/default-cover.svg';
        card.innerHTML = `
          <div class="card-img-wrap">
            <img src="${img}" class="card-img" alt="${album.title}">
          </div>
          <div class="card-title">${album.title}</div>
          <div class="card-desc">${album.artist} • ${album.year || 'Album'}</div>
        `;
        card.addEventListener('click', () => loadAlbumView(album.id));
        albumsGrid.appendChild(card);
      });
    } else {
      secAlbums.style.display = 'none';
    }

    // Playlists Grid
    const secPlaylists = document.getElementById('section-playlists');
    if (playlists.length > 0) {
      secPlaylists.style.display = 'block';
      playlistsGrid.innerHTML = '';
      playlists.forEach(pl => {
        const card = document.createElement('div');
        card.className = 'music-card';
        const img = (pl.images && pl.images.thumb) || '/assets/default-cover.svg';
        card.innerHTML = `
          <div class="card-img-wrap">
            <img src="${img}" class="card-img" alt="${pl.title}">
          </div>
          <div class="card-title">${pl.title}</div>
          <div class="card-desc">${pl.songCount} Songs</div>
        `;
        card.addEventListener('click', () => loadPlaylistView(pl.id));
        playlistsGrid.appendChild(card);
      });
    } else {
      secPlaylists.style.display = 'none';
    }
  }

  // Populate Browse Genres
  function setupBrowseGenres() {
    const grid = document.getElementById('genres-grid');
    if (!grid) return;

    const genres = [
      { name: 'Pop', color: '#8d67ab', query: 'Pop Hits 2024' },
      { name: 'Hip-Hop', color: '#ba5d07', query: 'Hip Hop Top' },
      { name: 'Rock', color: '#e91429', query: 'Rock Classics' },
      { name: 'Electronic', color: '#148a08', query: 'EDM Party' },
      { name: 'Chill & Lo-Fi', color: '#503750', query: 'Lofi Chill' },
      { name: 'Bollywood', color: '#bc5900', query: 'Hindi Superhits' },
      { name: 'Punjabi', color: '#d84000', query: 'Punjabi Hits' },
      { name: 'K-Pop', color: '#e13300', query: 'K-Pop Hits' },
      { name: 'Workout', color: '#777777', query: 'Workout Gym Music' },
      { name: 'Party', color: '#af2896', query: 'Party Dance' },
      { name: 'Focus & Study', color: '#509bf5', query: 'Study Focus' },
      { name: 'Sleep', color: '#1e3264', query: 'Sleep Ambient' }
    ];

    grid.innerHTML = '';
    genres.forEach(g => {
      const card = document.createElement('div');
      card.className = 'genre-card';
      card.style.backgroundColor = g.color;
      card.innerHTML = `<span class="genre-title">${g.name}</span>`;

      card.addEventListener('click', () => {
        searchInput.value = g.name;
        btnClearSearch.style.display = 'block';
        executeSearch(g.query);
      });

      grid.appendChild(card);
    });
  }

  // Render Track Rows
  function renderTrackRows(container, tracks) {
    container.innerHTML = '';
    tracks.forEach((track, idx) => {
      const row = document.createElement('div');
      row.className = 'track-row';
      if (player.currentTrack && player.currentTrack.id === track.id) {
        row.classList.add('playing');
      }

      const img = (track.images && track.images.thumb) || '/assets/default-cover.svg';
      const isLiked = Storage.isSongLiked(track.id);

      row.innerHTML = `
        <div class="col-idx">
          <span class="row-idx-text">${idx + 1}</span>
          <button class="row-play-btn" title="Play">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
        <div class="track-title-col">
          <img src="${img}" class="track-img" alt="${track.title}" loading="lazy">
          <div class="track-meta">
            <span class="track-title-text">${track.title}</span>
            <span class="track-artist-text">${track.artist}</span>
          </div>
        </div>
        <div class="col-album">${track.album || ''}</div>
        <div class="col-time">${player.formatTime(track.duration)}</div>
        <div class="col-actions">
          <button class="row-action-btn ${isLiked ? 'liked' : ''}" title="Save to Liked Songs">
            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
        </div>
      `;

      row.addEventListener('click', (e) => {
        if (e.target.closest('.row-action-btn')) {
          const nowLiked = Storage.toggleLike(track);
          e.target.closest('.row-action-btn').classList.toggle('liked', nowLiked);
          player.showToast(nowLiked ? 'Added to Liked Songs' : 'Removed from Liked Songs');
        } else {
          player.playTrack(track, tracks, idx);
        }
      });

      container.appendChild(row);
    });
  }

  // Load Album Details View
  async function loadAlbumView(albumId) {
    try {
      switchView('detail');
      const res = await fetch(`/api/album/${albumId}`);
      const json = await res.json();
      if (!json.success || !json.data) return;

      const album = json.data;
      document.getElementById('detail-type-tag').textContent = 'ALBUM';
      document.getElementById('detail-title').textContent = album.title;
      document.getElementById('detail-desc').textContent = '';
      document.getElementById('detail-artist-owner').textContent = album.artist;
      document.getElementById('detail-year').textContent = album.year || '';
      document.getElementById('detail-tracks-count').textContent = `${album.songs.length} songs`;
      document.getElementById('detail-cover-img').src = (album.images && album.images.high) || '/assets/default-cover.svg';

      const body = document.getElementById('detail-tracklist-body');
      renderTrackRows(body, album.songs);

      // Play All button
      document.getElementById('btn-detail-play-all').onclick = () => {
        if (album.songs.length) player.playTrack(album.songs[0], album.songs, 0);
      };
      document.getElementById('btn-detail-shuffle').onclick = () => {
        if (album.songs.length) {
          player.isShuffle = true;
          player.playTrack(album.songs[0], album.songs, 0);
        }
      };
    } catch (err) {
      console.error('Album view error:', err);
    }
  }

  // Load Playlist Details View
  async function loadPlaylistView(listId) {
    try {
      switchView('detail');
      const res = await fetch(`/api/playlist/${listId}`);
      const json = await res.json();
      if (!json.success || !json.data) return;

      const pl = json.data;
      document.getElementById('detail-type-tag').textContent = 'PLAYLIST';
      document.getElementById('detail-title').textContent = pl.title;
      document.getElementById('detail-desc').textContent = pl.description || '';
      document.getElementById('detail-artist-owner').textContent = 'Spotune Editor';
      document.getElementById('detail-year').textContent = '2024';
      document.getElementById('detail-tracks-count').textContent = `${pl.songs.length} songs`;
      document.getElementById('detail-cover-img').src = (pl.images && pl.images.high) || '/assets/default-cover.svg';

      const body = document.getElementById('detail-tracklist-body');
      renderTrackRows(body, pl.songs);

      document.getElementById('btn-detail-play-all').onclick = () => {
        if (pl.songs.length) player.playTrack(pl.songs[0], pl.songs, 0);
      };
      document.getElementById('btn-detail-shuffle').onclick = () => {
        if (pl.songs.length) {
          player.isShuffle = true;
          player.playTrack(pl.songs[0], pl.songs, 0);
        }
      };
    } catch (err) {
      console.error('Playlist view error:', err);
    }
  }

  // Open Custom Playlist / Liked Songs View
  function openLikedSongsView() {
    const liked = Storage.getLikedSongs();
    switchView('detail');

    document.getElementById('detail-type-tag').textContent = 'PLAYLIST';
    document.getElementById('detail-title').textContent = 'Liked Songs';
    document.getElementById('detail-desc').textContent = 'All your saved favorite songs in one pristine place.';
    document.getElementById('detail-artist-owner').textContent = 'You';
    document.getElementById('detail-year').textContent = new Date().getFullYear();
    document.getElementById('detail-tracks-count').textContent = `${liked.length} songs`;
    document.getElementById('detail-cover-img').src = '/assets/default-cover.svg';

    const body = document.getElementById('detail-tracklist-body');
    renderTrackRows(body, liked);

    document.getElementById('btn-detail-play-all').onclick = () => {
      if (liked.length) player.playTrack(liked[0], liked, 0);
    };
    document.getElementById('btn-detail-shuffle').onclick = () => {
      if (liked.length) {
        player.isShuffle = true;
        player.playTrack(liked[0], liked, 0);
      }
    };
  }

  function openCustomPlaylistView(title, songs) {
    switchView('detail');
    document.getElementById('detail-type-tag').textContent = 'PLAYLIST';
    document.getElementById('detail-title').textContent = title;
    document.getElementById('detail-desc').textContent = 'Curated ad-free collection on Spotune.';
    document.getElementById('detail-artist-owner').textContent = 'Spotune';
    document.getElementById('detail-year').textContent = '2024';
    document.getElementById('detail-tracks-count').textContent = `${songs.length} songs`;
    const cover = (songs[0] && songs[0].images && (songs[0].images.high || songs[0].images.thumb)) || '/assets/default-cover.svg';
    document.getElementById('detail-cover-img').src = cover;

    const body = document.getElementById('detail-tracklist-body');
    renderTrackRows(body, songs);

    document.getElementById('btn-detail-play-all').onclick = () => {
      if (songs.length) player.playTrack(songs[0], songs, 0);
    };
    document.getElementById('btn-detail-shuffle').onclick = () => {
      if (songs.length) {
        player.isShuffle = true;
        player.playTrack(songs[0], songs, 0);
      }
    };
  }

  // Render Library View
  function renderLibraryView() {
    const liked = Storage.getLikedSongs();
    const heroPreview = document.getElementById('liked-hero-preview');
    const heroCount = document.getElementById('liked-hero-count');

    if (liked.length > 0) {
      const titles = liked.slice(0, 3).map(s => `<b>${s.artist}</b> ${s.title}`).join(' • ');
      heroPreview.innerHTML = titles;
      heroCount.textContent = `${liked.length} liked songs`;
    } else {
      heroPreview.textContent = 'No liked songs yet.';
      heroCount.textContent = '0 songs';
    }

    document.getElementById('card-hero-liked').onclick = () => openLikedSongsView();
    document.getElementById('btn-play-all-liked').onclick = (e) => {
      e.stopPropagation();
      if (liked.length) player.playTrack(liked[0], liked, 0);
    };

    // Render User Playlists in Library
    const grid = document.getElementById('library-grid');
    const heroCard = document.getElementById('card-hero-liked');
    // Remove old custom cards
    grid.querySelectorAll('.custom-library-card').forEach(c => c.remove());

    const playlists = Storage.getPlaylists();
    playlists.forEach(pl => {
      const card = document.createElement('div');
      card.className = 'music-card custom-library-card';
      const cover = (pl.songs[0] && pl.songs[0].images && pl.songs[0].images.thumb) || '/assets/default-cover.svg';

      card.innerHTML = `
        <div class="card-img-wrap">
          <img src="${cover}" class="card-img" alt="${pl.title}">
          <button class="card-play-btn" title="Play">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
        <div class="card-title">${pl.title}</div>
        <div class="card-desc">By You • ${pl.songs.length} songs</div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-play-btn') && pl.songs.length) {
          player.playTrack(pl.songs[0], pl.songs, 0);
        } else {
          openCustomPlaylistView(pl.title, pl.songs);
        }
      });

      grid.appendChild(card);
    });
  }

  // Update Sidebar Liked Count & Playlists
  function updateSidebarState() {
    const liked = Storage.getLikedSongs();
    const badge = document.getElementById('liked-count-badge');
    if (badge) badge.textContent = liked.length;

    const list = document.getElementById('sidebar-playlist-list');
    if (list) {
      list.innerHTML = '';
      const playlists = Storage.getPlaylists();
      playlists.forEach(pl => {
        const li = document.createElement('li');
        li.className = 'playlist-link-item';
        li.textContent = pl.title;
        li.addEventListener('click', () => openCustomPlaylistView(pl.title, pl.songs));
        list.appendChild(li);
      });
    }
  }

  // Playlist Creation Modals
  const modalCreate = document.getElementById('create-playlist-modal');
  const btnOpenCreate = document.getElementById('btn-create-playlist');
  const btnLibCreate = document.getElementById('btn-library-create');
  const btnCloseCreate = document.getElementById('btn-close-create-playlist');
  const btnConfirmCreate = document.getElementById('btn-confirm-create-playlist');
  const inputPlName = document.getElementById('new-playlist-name');

  const openCreateModal = () => {
    modalCreate.style.display = 'flex';
    inputPlName.value = '';
    inputPlName.focus();
  };

  if (btnOpenCreate) btnOpenCreate.addEventListener('click', openCreateModal);
  if (btnLibCreate) btnLibCreate.addEventListener('click', openCreateModal);
  if (btnCloseCreate) btnCloseCreate.addEventListener('click', () => modalCreate.style.display = 'none');

  if (btnConfirmCreate) {
    btnConfirmCreate.addEventListener('click', () => {
      const name = inputPlName.value.trim();
      if (name) {
        Storage.createPlaylist(name);
        modalCreate.style.display = 'none';
        updateSidebarState();
        renderLibraryView();
        player.showToast(`Playlist "${name}" created!`, true);
      }
    });
  }

  // Quality Modal Toggle
  const qualityModal = document.getElementById('quality-modal');
  const btnQualityToggle = document.getElementById('btn-toggle-quality');
  const btnCloseQuality = document.getElementById('btn-close-quality');

  if (btnQualityToggle) {
    btnQualityToggle.addEventListener('click', () => {
      qualityModal.style.display = 'flex';
    });
  }
  if (btnCloseQuality) {
    btnCloseQuality.addEventListener('click', () => {
      qualityModal.style.display = 'none';
    });
  }
  if (qualityModal) {
    qualityModal.addEventListener('click', (e) => {
      if (e.target === qualityModal) qualityModal.style.display = 'none';
    });
    qualityModal.querySelectorAll('input[name="audio-quality"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        player.setQuality(e.target.value);
        qualityModal.style.display = 'none';
        player.showToast(`Audio Quality switched to ${e.target.value}kbps!`);
      });
    });
  }

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Ignore if typing in an input
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      player.togglePlay();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      player.nextTrack();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      player.prevTrack();
    } else if (e.code === 'ArrowUp') {
      e.preventDefault();
      player.setVolume(player.volume + 0.05);
    } else if (e.code === 'ArrowDown') {
      e.preventDefault();
      player.setVolume(player.volume - 0.05);
    } else if (e.key === 'm' || e.key === 'M') {
      player.toggleMute();
    } else if (e.key === 'l' || e.key === 'L') {
      player.lyrics.toggle();
    } else if (e.key === 's' || e.key === 'S') {
      player.toggleShuffle();
    } else if (e.key === 'r' || e.key === 'R') {
      player.toggleRepeat();
    } else if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  });

  // Track Changed Event listener
  window.addEventListener('spotune:track-played', () => {
    document.querySelectorAll('.track-row').forEach(row => {
      const title = row.querySelector('.track-title-text');
      if (title && player.currentTrack && title.textContent === player.currentTrack.title) {
        row.classList.add('playing');
      } else {
        row.classList.remove('playing');
      }
    });
  });

  window.addEventListener('spotune:liked-changed', () => {
    updateSidebarState();
  });

  // Init Calls
  setupBrowseGenres();
  updateSidebarState();
  loadHomeFeed();
});
