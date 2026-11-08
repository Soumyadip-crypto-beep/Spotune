/**
 * Spotune - High-Fidelity Zero-Lag Audio Engine
 */
class SpotunePlayer {
  constructor() {
    this.audio = document.getElementById('main-audio');
    this.preloadAudio = document.getElementById('preload-audio');
    this.equalizer = new EqualizerManager(this.audio);
    this.lyrics = new LyricsManager(this.audio);

    this.currentTrack = null;
    this.queue = [];
    this.queueIndex = -1;
    this.originalQueue = []; // For un-shuffling
    this.isShuffle = false;
    this.repeatMode = 'off'; // 'off' | 'all' | 'one'
    this.quality = Storage.getSettings().quality || '320';
    this.volume = Storage.getSettings().volume !== undefined ? Storage.getSettings().volume : 0.8;
    this.isMuted = false;
    this.preloadedIndex = -1;

    // Elements
    this.elArt = document.getElementById('player-track-img');
    this.elTitle = document.getElementById('player-track-title');
    this.elArtist = document.getElementById('player-track-artist');
    this.elLikeBtn = document.getElementById('player-btn-like');
    this.elPlayBtn = document.getElementById('player-btn-play');
    this.elPlayIcon = document.getElementById('play-pause-icon');
    this.elPrevBtn = document.getElementById('player-btn-prev');
    this.elNextBtn = document.getElementById('player-btn-next');
    this.elShuffleBtn = document.getElementById('player-btn-shuffle');
    this.elRepeatBtn = document.getElementById('player-btn-repeat');
    this.elCurrentTime = document.getElementById('player-current-time');
    this.elTotalTime = document.getElementById('player-total-time');
    this.elSeekContainer = document.getElementById('player-seek-container');
    this.elSeekFill = document.getElementById('player-seek-fill');
    this.elSeekThumb = document.getElementById('player-seek-thumb');
    this.elBuffered = document.getElementById('player-buffered-bar');

    this.elVolBtn = document.getElementById('player-btn-volume');
    this.elVolIcon = document.getElementById('volume-icon');
    this.elVolContainer = document.getElementById('player-volume-container');
    this.elVolFill = document.getElementById('player-volume-fill');
    this.elVolThumb = document.getElementById('player-volume-thumb');
    this.elDownloadBtn = document.getElementById('player-btn-download');

    this.initAudioEngine();
    this.bindControls();
    this.setVolume(this.volume);
    this.setupMediaSession();
  }

  initAudioEngine() {
    // Timeupdate: Seekbar & Progress
    this.audio.addEventListener('timeupdate', () => {
      if (!this.audio.duration) return;
      const cur = this.audio.currentTime;
      const dur = this.audio.duration;
      const pct = (cur / dur) * 100;

      this.elSeekFill.style.width = `${pct}%`;
      this.elSeekThumb.style.left = `${pct}%`;
      this.elCurrentTime.textContent = this.formatTime(cur);

      // Buffer look-ahead: If 80% through song and next song not preloaded, preload now!
      if (pct > 75 && this.preloadedIndex !== this.queueIndex + 1) {
        this.preloadNextTrack();
      }
    });

    // Buffer range progress
    this.audio.addEventListener('progress', () => {
      if (this.audio.buffered.length > 0 && this.audio.duration) {
        const bufferedEnd = this.audio.buffered.end(this.audio.buffered.length - 1);
        const dur = this.audio.duration;
        const bufferedPct = Math.min(100, (bufferedEnd / dur) * 100);
        if (this.elBuffered) {
          this.elBuffered.style.width = `${bufferedPct}%`;
        }
      }
    });

    // Loadedmetadata: set total duration
    this.audio.addEventListener('loadedmetadata', () => {
      this.elTotalTime.textContent = this.formatTime(this.audio.duration);
    });

    // Play/Pause state updates
    this.audio.addEventListener('play', () => {
      this.elPlayBtn.classList.add('playing');
      this.elPlayIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
      this.equalizer.ensureContextRunning();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    });

    this.audio.addEventListener('pause', () => {
      this.elPlayBtn.classList.remove('playing');
      this.elPlayIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    });

    // Song ended: seamless next track
    this.audio.addEventListener('ended', () => {
      if (this.repeatMode === 'one') {
        this.audio.currentTime = 0;
        this.audio.play();
      } else {
        this.nextTrack(true);
      }
    });

    // Error handling with auto fallback to 160 or 96
    this.audio.addEventListener('error', (e) => {
      console.warn('Audio playback error, attempting quality fallback...');
      if (this.currentTrack && this.currentTrack.streams) {
        if (this.quality === '320' && this.currentTrack.streams['160']) {
          this.audio.src = this.currentTrack.streams['160'];
          this.audio.play();
        } else if (this.currentTrack.streams['96']) {
          this.audio.src = this.currentTrack.streams['96'];
          this.audio.play();
        }
      }
    });
  }

  getAudioUrlForQuality(track, quality) {
    if (!track || !track.streams) return track ? track.audioUrl : null;
    return track.streams[quality] || track.streams['320'] || track.streams['160'] || track.streams.default;
  }

  playTrack(track, queue = null, startIndex = 0) {
    if (!track) return;
    this.currentTrack = track;

    if (queue && Array.isArray(queue)) {
      this.queue = [...queue];
      this.originalQueue = [...queue];
      this.queueIndex = startIndex;
      if (this.isShuffle) {
        this.applyShuffle();
      }
    } else if (!this.queue.some(s => s.id === track.id)) {
      this.queue.unshift(track);
      this.queueIndex = 0;
    }

    // Update UI elements
    const imgUrl = (track.images && (track.images.high || track.images.thumb)) || '/assets/default-cover.svg';
    this.elArt.src = imgUrl;
    this.elTitle.textContent = track.title;
    this.elArtist.textContent = track.artist;

    // Liked heart state
    const isLiked = Storage.isSongLiked(track.id);
    this.elLikeBtn.classList.toggle('liked', isLiked);

    // Stream URL
    const streamUrl = this.getAudioUrlForQuality(track, this.quality);
    this.audio.src = streamUrl;
    this.audio.load();

    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn('Autoplay prevented or waiting for interaction:', err.message);
      });
    }

    // Load lyrics in background
    this.lyrics.loadLyrics(track);

    // Save to history
    Storage.addToHistory(track);

    // Update queue drawer
    this.updateQueueUI();

    // Trigger active row highlight in current view
    window.dispatchEvent(new CustomEvent('spotune:track-played', { detail: { track } }));

    // Reset preloaded index
    this.preloadedIndex = -1;
  }

  preloadNextTrack() {
    const nextIdx = this.queueIndex + 1;
    if (nextIdx < this.queue.length) {
      const nextSong = this.queue[nextIdx];
      const nextUrl = this.getAudioUrlForQuality(nextSong, this.quality);
      if (nextUrl && this.preloadAudio) {
        this.preloadAudio.src = nextUrl;
        this.preloadAudio.load();
        this.preloadedIndex = nextIdx;
      }
    }
  }

  togglePlay() {
    if (!this.currentTrack && this.queue.length > 0) {
      this.playTrack(this.queue[0], this.queue, 0);
      return;
    }
    if (this.audio.paused) {
      this.audio.play();
    } else {
      this.audio.pause();
    }
  }

  nextTrack(auto = false) {
    if (!this.queue.length) return;
    let nextIdx = this.queueIndex + 1;

    if (nextIdx >= this.queue.length) {
      if (this.repeatMode === 'all') {
        nextIdx = 0;
      } else {
        if (!auto) nextIdx = 0; // Wrap if manual click
        else return;
      }
    }

    this.queueIndex = nextIdx;
    this.playTrack(this.queue[nextIdx]);
  }

  prevTrack() {
    if (!this.queue.length) return;

    // If more than 3 seconds in, restart track
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }

    let prevIdx = this.queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = this.queue.length - 1;
    }

    this.queueIndex = prevIdx;
    this.playTrack(this.queue[prevIdx]);
  }

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    this.elShuffleBtn.classList.toggle('active', this.isShuffle);

    if (this.isShuffle) {
      this.applyShuffle();
    } else {
      // Restore original queue order
      const cur = this.currentTrack;
      this.queue = [...this.originalQueue];
      this.queueIndex = this.queue.findIndex(s => s.id === cur.id);
    }
    this.updateQueueUI();
  }

  applyShuffle() {
    if (this.queue.length <= 1) return;
    const cur = this.currentTrack;
    const rest = this.queue.filter(s => s.id !== cur.id);

    // Fisher-Yates
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }

    this.queue = [cur, ...rest];
    this.queueIndex = 0;
  }

  toggleRepeat() {
    if (this.repeatMode === 'off') {
      this.repeatMode = 'all';
      this.elRepeatBtn.classList.add('active');
      this.elRepeatBtn.title = 'Repeat: All';
    } else if (this.repeatMode === 'all') {
      this.repeatMode = 'one';
      this.elRepeatBtn.classList.add('active');
      this.elRepeatBtn.title = 'Repeat: Current Track';
    } else {
      this.repeatMode = 'off';
      this.elRepeatBtn.classList.remove('active');
      this.elRepeatBtn.title = 'Repeat: Off';
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.audio.volume = this.isMuted ? 0 : this.volume;
    const pct = this.volume * 100;
    this.elVolFill.style.width = `${pct}%`;
    this.elVolThumb.style.left = `${pct}%`;
    Storage.saveSettings({ volume: this.volume });
    this.updateVolumeIcon();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.audio.volume = this.isMuted ? 0 : this.volume;
    this.updateVolumeIcon();
  }

  updateVolumeIcon() {
    if (this.isMuted || this.volume === 0) {
      this.elVolIcon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
    } else if (this.volume < 0.5) {
      this.elVolIcon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>';
    } else {
      this.elVolIcon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
    }
  }

  setQuality(newQuality) {
    this.quality = newQuality;
    Storage.saveSettings({ quality: newQuality });

    // Update labels
    const label = document.getElementById('sidebar-quality-label');
    if (label) {
      label.textContent = newQuality === '320' ? '320kbps Hi-Fi' : newQuality === '160' ? '160kbps High' : '96kbps Normal';
    }

    if (this.currentTrack) {
      const curTime = this.audio.currentTime;
      const isPaused = this.audio.paused;
      this.audio.src = this.getAudioUrlForQuality(this.currentTrack, newQuality);
      this.audio.currentTime = curTime;
      if (!isPaused) this.audio.play();
    }
  }

  downloadCurrentTrack() {
    if (!this.currentTrack) return;
    const url = this.getAudioUrlForQuality(this.currentTrack, '320');
    if (!url) return;

    const downloadEndpoint = `/api/download?url=${encodeURIComponent(url)}&title=${encodeURIComponent(this.currentTrack.title)}&artist=${encodeURIComponent(this.currentTrack.artist)}`;
    const a = document.createElement('a');
    a.href = downloadEndpoint;
    a.download = `${this.currentTrack.artist} - ${this.currentTrack.title}.m4a`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    this.showToast(`Downloading 320kbps Hi-Fi: ${this.currentTrack.title}`);
  }

  setupMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.nextTrack());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.audio.currentTime = details.seekTime;
        }
      });
    }
  }

  updateMediaSessionMetadata() {
    if ('mediaSession' in navigator && this.currentTrack) {
      const art = (this.currentTrack.images && (this.currentTrack.images.high || this.currentTrack.images.thumb)) || '/assets/default-cover.svg';
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.currentTrack.title,
        artist: this.currentTrack.artist,
        album: this.currentTrack.album || 'Spotune',
        artwork: [{ src: art, sizes: '500x500', type: 'image/jpeg' }]
      });
    }
  }

  bindControls() {
    // Play / Pause
    this.elPlayBtn.addEventListener('click', () => this.togglePlay());
    this.elPrevBtn.addEventListener('click', () => this.prevTrack());
    this.elNextBtn.addEventListener('click', () => this.nextTrack());
    this.elShuffleBtn.addEventListener('click', () => this.toggleShuffle());
    this.elRepeatBtn.addEventListener('click', () => this.toggleRepeat());

    // Like Button
    this.elLikeBtn.addEventListener('click', () => {
      if (this.currentTrack) {
        const isNowLiked = Storage.toggleLike(this.currentTrack);
        this.elLikeBtn.classList.toggle('liked', isNowLiked);
        this.showToast(isNowLiked ? 'Added to Liked Songs' : 'Removed from Liked Songs');
      }
    });

    // Seek Click & Drag
    let isSeeking = false;
    const handleSeek = (e) => {
      const rect = this.elSeekContainer.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      this.elSeekFill.style.width = `${pos * 100}%`;
      this.elSeekThumb.style.left = `${pos * 100}%`;
      if (this.audio.duration) {
        this.audio.currentTime = pos * this.audio.duration;
      }
    };

    this.elSeekContainer.addEventListener('mousedown', (e) => {
      isSeeking = true;
      handleSeek(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (isSeeking) handleSeek(e);
    });

    window.addEventListener('mouseup', () => {
      isSeeking = false;
    });

    // Volume Click & Drag
    let isAdjustingVol = false;
    const handleVol = (e) => {
      const rect = this.elVolContainer.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      this.isMuted = false;
      this.setVolume(pos);
    };

    this.elVolContainer.addEventListener('mousedown', (e) => {
      isAdjustingVol = true;
      handleVol(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (isAdjustingVol) handleVol(e);
    });

    window.addEventListener('mouseup', () => {
      isAdjustingVol = false;
    });

    this.elVolBtn.addEventListener('click', () => this.toggleMute());
    this.elDownloadBtn.addEventListener('click', () => this.downloadCurrentTrack());

    // Queue Drawer Toggle
    const btnQueue = document.getElementById('player-btn-queue');
    const drawerQueue = document.getElementById('queue-drawer');
    const btnCloseQueue = document.getElementById('btn-close-queue');
    const btnClearQueue = document.getElementById('btn-clear-queue');

    if (btnQueue && drawerQueue) {
      btnQueue.addEventListener('click', () => {
        drawerQueue.classList.toggle('active');
        btnQueue.classList.toggle('active');
      });
    }

    if (btnCloseQueue && drawerQueue) {
      btnCloseQueue.addEventListener('click', () => {
        drawerQueue.classList.remove('active');
        if (btnQueue) btnQueue.classList.remove('active');
      });
    }

    if (btnClearQueue) {
      btnClearQueue.addEventListener('click', () => {
        if (this.currentTrack) {
          this.queue = [this.currentTrack];
          this.queueIndex = 0;
          this.updateQueueUI();
        }
      });
    }

    // Fullscreen Mode
    const btnFs = document.getElementById('player-btn-fullscreen');
    if (btnFs) {
      btnFs.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }
  }

  updateQueueUI() {
    const curWrap = document.getElementById('queue-current-item');
    const listWrap = document.getElementById('queue-items-list');

    if (curWrap && this.currentTrack) {
      const imgUrl = (this.currentTrack.images && this.currentTrack.images.thumb) || '/assets/default-cover.svg';
      curWrap.innerHTML = `
        <img src="${imgUrl}" class="queue-img" alt="Track">
        <div class="queue-meta">
          <div class="queue-title">${this.currentTrack.title}</div>
          <div class="queue-artist">${this.currentTrack.artist}</div>
        </div>
      `;
    }

    if (listWrap) {
      listWrap.innerHTML = '';
      const upcoming = this.queue.slice(this.queueIndex + 1);

      if (upcoming.length === 0) {
        listWrap.innerHTML = '<p style="font-size:12px; color:var(--text-subdued); padding:8px 0;">No more songs in queue.</p>';
        return;
      }

      upcoming.forEach((song, i) => {
        const itemIdx = this.queueIndex + 1 + i;
        const div = document.createElement('div');
        div.className = 'queue-item';
        const imgUrl = (song.images && song.images.thumb) || '/assets/default-cover.svg';
        div.innerHTML = `
          <img src="${imgUrl}" class="queue-img" alt="Track">
          <div class="queue-meta">
            <div class="queue-title">${song.title}</div>
            <div class="queue-artist">${song.artist}</div>
          </div>
          <button class="btn-queue-remove" title="Remove from queue">✕</button>
        `;

        div.querySelector('.queue-meta').addEventListener('click', () => {
          this.queueIndex = itemIdx;
          this.playTrack(song);
        });

        div.querySelector('.btn-queue-remove').addEventListener('click', (e) => {
          e.stopPropagation();
          this.queue.splice(itemIdx, 1);
          this.updateQueueUI();
        });

        listWrap.appendChild(div);
      });
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  showToast(msg, isSuccess = false) {
    const wrap = document.getElementById('toast-container');
    if (!wrap) return;
    const toast = document.createElement('div');
    toast.className = `toast ${isSuccess ? 'success' : ''}`;
    toast.textContent = msg;
    wrap.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }
}
