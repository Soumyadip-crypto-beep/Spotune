/**
 * Spotune - Web Audio API 5-Band Studio Equalizer & Real-Time Spectrum Visualizer
 */
class EqualizerManager {
  constructor(audioElement) {
    this.audio = audioElement;
    this.audioCtx = null;
    this.source = null;
    this.analyser = null;
    this.bands = [];
    this.isInitialized = false;

    this.frequencies = [60, 250, 1000, 4000, 14000];
    this.presets = {
      flat: [0, 0, 0, 0, 0],
      bass: [6, 4, 0, -1, 1],
      pop: [1, 2, 4, 3, 2],
      rock: [5, 3, -1, 3, 5],
      electronic: [6, 4, 1, 3, 4],
      vocal: [-2, 0, 5, 4, -1],
      acoustic: [4, 2, 1, 3, 3]
    };

    this.canvas = document.getElementById('eq-visualizer-canvas');
    this.canvasCtx = this.canvas ? this.canvas.getContext('2d') : null;
    this.animId = null;

    this.bindUI();
  }

  initAudioContext() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();

      // Fix CORS for Web Audio API if needed
      this.audio.crossOrigin = 'anonymous';
      this.source = this.audioCtx.createMediaElementSource(this.audio);

      // Create 5 Biquad filters
      let lastNode = this.source;
      this.frequencies.forEach((freq, idx) => {
        const filter = this.audioCtx.createBiquadFilter();
        if (idx === 0) {
          filter.type = 'lowshelf';
        } else if (idx === this.frequencies.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1.0;
        }
        filter.frequency.value = freq;
        filter.gain.value = 0;

        lastNode.connect(filter);
        lastNode = filter;
        this.bands.push(filter);
      });

      // Create Analyser
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      lastNode.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);

      this.isInitialized = true;
      this.startVisualizer();

      // Load saved settings
      const settings = Storage.getSettings();
      if (settings.eqPreset) {
        this.applyPreset(settings.eqPreset);
      }
    } catch (e) {
      console.warn('Web Audio API could not initialize automatically:', e.message);
    }
  }

  ensureContextRunning() {
    if (!this.isInitialized) {
      this.initAudioContext();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setGain(bandIndex, gainValue) {
    if (this.bands[bandIndex]) {
      this.bands[bandIndex].gain.value = gainValue;
      const label = document.getElementById(`val-band-${this.frequencies[bandIndex]}`);
      if (label) {
        label.textContent = (gainValue > 0 ? '+' : '') + gainValue.toFixed(1) + 'dB';
      }
    }
  }

  applyPreset(presetKey) {
    const values = this.presets[presetKey] || this.presets.flat;
    values.forEach((gain, idx) => {
      this.setGain(idx, gain);
      const slider = document.getElementById(`band-${this.frequencies[idx]}`);
      if (slider) slider.value = gain;
    });

    const select = document.getElementById('eq-preset-select');
    if (select) select.value = presetKey;
    Storage.saveSettings({ eqPreset: presetKey, eqBands: values });
  }

  startVisualizer() {
    if (!this.canvasCtx || !this.analyser) return;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      this.animId = requestAnimationFrame(draw);
      this.analyser.getByteFrequencyData(dataArray);

      const width = this.canvas.width;
      const height = this.canvas.height;
      this.canvasCtx.clearRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 1.8;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * (height - 10);

        // Spotify Green Gradient
        const grad = this.canvasCtx.createLinearGradient(0, height, 0, height - barHeight);
        grad.addColorStop(0, '#1ed760');
        grad.addColorStop(1, '#118ab2');

        this.canvasCtx.fillStyle = grad;
        this.canvasCtx.beginPath();
        if (this.canvasCtx.roundRect) {
          this.canvasCtx.roundRect(x, height - barHeight, barWidth - 3, barHeight, [3, 3, 0, 0]);
        } else {
          this.canvasCtx.rect(x, height - barHeight, barWidth - 3, barHeight);
        }
        this.canvasCtx.fill();

        x += barWidth;
      }
    };
    draw();
  }

  bindUI() {
    // Sliders
    this.frequencies.forEach((freq, idx) => {
      const slider = document.getElementById(`band-${freq}`);
      if (slider) {
        slider.addEventListener('input', (e) => {
          this.ensureContextRunning();
          const val = parseFloat(e.target.value);
          this.setGain(idx, val);
          const select = document.getElementById('eq-preset-select');
          if (select) select.value = 'custom';
        });
      }
    });

    // Preset Select
    const select = document.getElementById('eq-preset-select');
    if (select) {
      select.addEventListener('change', (e) => {
        this.ensureContextRunning();
        this.applyPreset(e.target.value);
      });
    }

    // Reset Button
    const btnReset = document.getElementById('btn-reset-eq');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.applyPreset('flat');
      });
    }

    // Modal Toggles
    const modal = document.getElementById('equalizer-modal');
    const btnOpen = document.getElementById('player-btn-eq');
    const btnClose = document.getElementById('btn-close-eq');

    if (btnOpen && modal) {
      btnOpen.addEventListener('click', () => {
        this.ensureContextRunning();
        modal.style.display = 'flex';
        btnOpen.classList.add('active');
      });
    }

    if (btnClose && modal) {
      btnClose.addEventListener('click', () => {
        modal.style.display = 'none';
        if (btnOpen) btnOpen.classList.remove('active');
      });
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
          if (btnOpen) btnOpen.classList.remove('active');
        }
      });
    }
  }
}
