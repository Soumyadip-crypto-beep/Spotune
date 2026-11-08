/**
 * Spotune - Synchronized Karaoke Lyrics Manager
 */
class LyricsManager {
  constructor(audioElement) {
    this.audio = audioElement;
    this.lyricsData = [];
    this.currentLineIdx = -1;
    this.currentTrack = null;
    this.isOpen = false;

    this.overlay = document.getElementById('lyrics-overlay');
    this.backdrop = document.getElementById('lyrics-backdrop');
    this.container = document.getElementById('lyrics-lines');
    this.scrollWrap = document.getElementById('lyrics-scroll-container');
    this.titleEl = document.getElementById('lyrics-track-title');
    this.artistEl = document.getElementById('lyrics-track-artist');

    this.bindEvents();
  }

  bindEvents() {
    // Sync with audio timeupdate
    this.audio.addEventListener('timeupdate', () => {
      if (!this.lyricsData.length) return;
      this.updateActiveLine(this.audio.currentTime);
    });

    // Close button
    const btnClose = document.getElementById('btn-close-lyrics');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.toggle(false));
    }

    // Player bar lyrics toggle button
    const btnToggle = document.getElementById('player-btn-lyrics');
    if (btnToggle) {
      btnToggle.addEventListener('click', () => this.toggle());
    }
  }

  toggle(forceState = null) {
    this.isOpen = forceState !== null ? forceState : !this.isOpen;
    if (this.overlay) {
      this.overlay.classList.toggle('active', this.isOpen);
    }
    const btnToggle = document.getElementById('player-btn-lyrics');
    if (btnToggle) {
      btnToggle.classList.toggle('active', this.isOpen);
    }
    if (this.isOpen && this.currentLineIdx >= 0) {
      this.scrollToActiveLine();
    }
  }

  async loadLyrics(song) {
    this.currentTrack = song;
    this.lyricsData = [];
    this.currentLineIdx = -1;

    if (this.titleEl) this.titleEl.textContent = song.title;
    if (this.artistEl) this.artistEl.textContent = song.artist;

    if (this.backdrop && song.images && song.images.high) {
      this.backdrop.style.backgroundImage = `url('${song.images.high}')`;
    }

    if (this.container) {
      this.container.innerHTML = '<div class="feed-loading-state"><div class="spinner"></div><p>Searching synchronized lyrics...</p></div>';
    }

    try {
      const url = `/api/lyrics?track=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}&duration=${song.duration || ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.success && data.data) {
        if (data.data.synced) {
          this.parseSyncedLyrics(data.data.synced);
          this.renderSyncedLyrics();
          return;
        } else if (data.data.plain) {
          this.renderPlainLyrics(data.data.plain);
          return;
        }
      }

      this.renderNoLyrics();
    } catch (err) {
      this.renderNoLyrics();
    }
  }

  parseSyncedLyrics(lrcText) {
    const lines = lrcText.split('\n');
    const parsed = [];
    const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    for (let line of lines) {
      const match = timeReg.exec(line);
      if (match) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const ms = parseFloat('0.' + match[3]);
        const time = min * 60 + sec + ms;
        const text = line.replace(timeReg, '').trim();
        if (text) {
          parsed.push({ time, text });
        }
      }
    }

    parsed.sort((a, b) => a.time - b.time);
    this.lyricsData = parsed;
  }

  renderSyncedLyrics() {
    if (!this.container) return;
    this.container.innerHTML = '';

    this.lyricsData.forEach((item, idx) => {
      const p = document.createElement('p');
      p.className = 'lyric-line';
      p.id = `lyric-line-${idx}`;
      p.textContent = item.text;
      p.addEventListener('click', () => {
        this.audio.currentTime = item.time;
        if (this.audio.paused) this.audio.play();
      });
      this.container.appendChild(p);
    });
  }

  renderPlainLyrics(plainText) {
    if (!this.container) return;
    this.container.innerHTML = '';
    const lines = plainText.split('\n');
    lines.forEach(line => {
      const p = document.createElement('p');
      p.className = 'lyric-line';
      p.style.opacity = '0.8';
      p.textContent = line || '...';
      this.container.appendChild(p);
    });
  }

  renderNoLyrics() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="lyrics-placeholder">
        <p>🎵 Lyrics are not currently available for this track.</p>
        <p style="font-size:14px; margin-top:8px; opacity:0.6;">Enjoy the pristine 320kbps Hi-Fi audio stream!</p>
      </div>
    `;
  }

  updateActiveLine(currentTime) {
    if (!this.lyricsData.length) return;

    let activeIdx = -1;
    for (let i = 0; i < this.lyricsData.length; i++) {
      if (currentTime >= this.lyricsData[i].time - 0.2) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx !== this.currentLineIdx) {
      if (this.currentLineIdx >= 0) {
        const prevEl = document.getElementById(`lyric-line-${this.currentLineIdx}`);
        if (prevEl) {
          prevEl.classList.remove('active');
          prevEl.classList.add('passed');
        }
      }

      this.currentLineIdx = activeIdx;

      if (this.currentLineIdx >= 0) {
        const curEl = document.getElementById(`lyric-line-${this.currentLineIdx}`);
        if (curEl) {
          curEl.classList.add('active');
          curEl.classList.remove('passed');
          if (this.isOpen) {
            this.scrollToActiveLine();
          }
        }
      }
    }
  }

  scrollToActiveLine() {
    if (!this.scrollWrap || this.currentLineIdx < 0) return;
    const curEl = document.getElementById(`lyric-line-${this.currentLineIdx}`);
    if (curEl) {
      const containerHeight = this.scrollWrap.clientHeight;
      const elOffset = curEl.offsetTop;
      const elHeight = curEl.clientHeight;
      const targetScroll = elOffset - containerHeight / 2 + elHeight / 2;

      this.scrollWrap.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }
  }
}
