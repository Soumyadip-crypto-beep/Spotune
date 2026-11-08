# 🎵 Spotune - Spotify Clone (Ad-Free & Hi-Fi Music Streaming)

> **Spotune** is a modern Spotify-like music streaming application and downloadable Windows desktop executable. It offers **100% ad-free**, **zero-buffer**, **320kbps studio-quality audio**, synchronized real-time karaoke lyrics, and a pro graphic equalizer.

---

## ✨ Highlights & Key Features

* 🚫 **100% Ad-Free**: No interruptions, no banners, no audio ads between songs.
* ⚡ **Zero-Lag & Zero Buffering**: Direct CDN edge streaming with smart lookahead queue pre-buffering for instant, gapless song transitions.
* 🎧 **Studio Hi-Fi Audio (320 kbps)**: Direct studio master streams with in-app bitrate switcher (`320kbps Hi-Fi`, `160kbps High`, `96kbps Normal`).
* 🎤 **Synchronized Karaoke Lyrics**: Real-time line-by-line scrolling lyrics powered by `lrclib.net` with click-to-seek and dynamic blurred album artwork backdrops.
* 🎚️ **Pro 5-Band Studio Equalizer**: Real-time Web Audio API frequency adjustment (60Hz Sub-Bass, 250Hz Bass, 1kHz Mid, 4kHz Presence, 14kHz Treble) with presets (*Bass Boost*, *Pop*, *Rock*, *Electronic*, *Vocal*, *Acoustic*, *Flat*) and live spectrum audio visualizer!
* 💾 **One-Click MP3 Download**: Download any song in 320kbps directly to your computer with proper metadata tags for offline playback.
* 🖥️ **Downloadable Windows Executable (`Spotune.exe`)**: A native Windows `.exe` desktop application that runs in an isolated borderless app window without browser tabs or address bars.
* 🌐 **Full Web Application & PWA**: Fully responsive website, installable as a Progressive Web App on mobile, tablet, and desktop.
* ❤️ **Your Library & Playlists**: Create, edit, and organize custom playlists and liked songs with local storage persistence.
* ⌨️ **Keyboard Media Shortcuts & Windows Media Integration**: Supports Windows lock screen, Fn media keys, Spacebar (Play/Pause), Arrow keys (Seek & Volume), `L` (Lyrics), `M` (Mute), `S` (Shuffle), `R` (Repeat), and `F` (Fullscreen).

---

## 🚀 Quick Start

### Option 1: Double-Click Desktop App (Windows .EXE)
Simply double-click:
```
Spotune.exe
```
This automatically launches the background streaming engine and opens Spotune in a standalone, borderless desktop window.

---

### Option 2: Run via Batch Script
Double-click:
```
start-spotune.bat
```
This starts the local server and opens `http://localhost:3000` in your default browser.

---

### Option 3: Run via Node.js
```bash
npm start
```
Then navigate to:
```
http://localhost:3000
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space` | Play / Pause |
| `→` (Right Arrow) | Next Track |
| `←` (Left Arrow) | Previous Track |
| `↑` (Up Arrow) | Volume Up (+5%) |
| `↓` (Down Arrow) | Volume Down (-5%) |
| `M` | Mute / Unmute |
| `L` | Toggle Karaoke Lyrics |
| `S` | Toggle Shuffle |
| `R` | Toggle Repeat (Off / All / One) |
| `F` | Toggle Fullscreen Visualizer |

---

## 🛠️ Project Structure

```
Spotune/
├── Spotune.exe             # Native Windows executable desktop app
├── start-spotune.bat       # One-click Windows starter script
├── server/
│   ├── index.js            # Express server, proxy & download endpoints
│   ├── cipher.js           # DES-ECB decryptor for 320kbps CDN stream URLs
│   └── api.js              # Multi-category trending, search & lyrics APIs
├── public/
│   ├── index.html          # Spotify dark theme UI structure
│   ├── styles/
│   │   ├── main.css        # Layout, typography, cards & responsiveness
│   │   ├── player.css      # Bottom player bar, seekbar & volume controls
│   │   ├── lyrics.css      # Synchronized karaoke lyrics & queue drawer
│   │   └── equalizer.css   # 5-band EQ & real-time spectrum visualizer
│   ├── js/
│   │   ├── app.js          # App router, search controller & UI events
│   │   ├── player.js       # Audio engine with gapless lookahead preloading
│   │   ├── equalizer.js    # Web Audio API 5-band EQ & visualizer canvas
│   │   ├── lyrics.js       # Real-time LRC parser & auto-scroll
│   │   └── storage.js      # Liked songs, custom playlists & preferences
│   ├── assets/
│   │   ├── logo.svg        # Spotune SVG logo
│   │   └── default-cover.svg
│   ├── Spotune.exe         # Downloadable .exe served from the website
│   └── manifest.json       # PWA manifest
├── src-desktop/
│   ├── launcher.cs         # C# native Windows GUI launcher source code
│   └── main.js             # Electron desktop configuration
└── package.json
```

---

## 📦 Building the `.exe` from Source
To recompile `Spotune.exe`:
```bash
npm run build:exe
```
This utilizes Windows' built-in C# compiler (`csc.exe`) without needing external compilation toolchains.
