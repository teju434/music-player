# 🎵 TARA Play Studio - Premium Neumorphic Music Player

**TARA Play Studio** is a premium, minimalist music streaming web application inspired by Spotube, Spotify Premium, and Apple Music. Built using standard web standards (HTML5, CSS3, and Vanilla JavaScript), it features a custom dark neumorphic interface, real-time client-side search, synchronized lyrics, dynamic ambient lighting, and keyboard hotkeys.

![TARA Play Studio UI Mockup](https://raw.githubusercontent.com/KRTirtho/spotube/master/screenshot.png) *(Note: Placeholder reference to Spotube style layout)*

---

## ✨ Key Features

### 1. 🎛️ Premium Dark Neumorphic Design
- **Soft Soft Shadows**: Tailored top-left bevel glows and bottom-right dark drop shadows create a premium, tactile physical deck appearance.
- **Micro-Animations**: Playback buttons morph dynamically and feature inset shadows (`box-shadow: inset ...`) to simulate physical press states.
- **Dynamic Background Colors**: Behind the card sits a blurred ambient halo (`.player-backdrop-glow`) that adapts its hue in real-time to match the dominant colors of the active song's artwork.
- **Vinyl Artwork Spinning**: When a track starts playing, the square album cover smoothly morphs into a circle and spins continuously, morphing back to a rounded square on pause.
- **Auto-Scrolling Title Marquee**: Long song titles are automatically measured, triggering a smooth scrolling marquee animation if they exceed the card bounds.

### 2. 🎼 Client-Side Music Streaming
- **Zero-CORS JSONP Engine**: Dynamic track queries, trending top pop charts, and language hits (Telugu, Hindi, English, Tamil) are fetched directly from the iTunes Search API on the client side using JSONP.
- **Invisible Preview Limitations**: All references to the 30-second iTunes audio preview length (such as `0:30` durations, countdown labels, or badges) are completely hidden.
- **Continuous Autoplay**: The audio engine triggers transition checks upon track completion—automatically advancing to the next queue item or looping when repeat is active—making the preview limitation completely unnoticeable.
- **Local Storage Library**: Custom Favorites lists and Recently Played histories are persisted directly to browser Local Storage.

### 3. 🎤 Interactive Synced Lyrics
- Time-synced scrolling lyrics panels display in the right panel. Clicking on any line of lyrics instantly seeks the player to that timestamp.

### 4. 🎹 Professional Keyboard Hotkeys
Control the player instantly from anywhere in the app:
- <kbd>Space</kbd> — Play / Pause
- <kbd>&larr;</kbd> — Previous Track (Restarts song if >3s elapsed)
- <kbd>&rarr;</kbd> — Next Track
- <kbd>Shift</kbd> + <kbd>&larr;</kbd> — Seek Backward 5 seconds
- <kbd>Shift</kbd> + <kbd>&rarr;</kbd> — Seek Forward 5 seconds
- <kbd>M</kbd> — Mute / Unmute Volume
- <kbd>&uarr;</kbd> — Increase Volume
- <kbd>&darr;</kbd> — Decrease Volume
- <kbd>L</kbd> — Focus / Toggle Lyrics View
- <kbd>S</kbd> — Toggle Shuffle Play
- <kbd>R</kbd> — Toggle Repeat Modes (No Repeat, Repeat Track, Repeat Queue)

---

## 🛠️ Technologies Used

- **Markup & Layout**: Semantic HTML5, CSS Grid & Flexbox
- **Design & Styling**: CSS Custom Properties (Variables), Dark Neumorphism (Soft UI), Backdrop Filters, Keyframe Animations
- **Core Controller**: Vanilla JavaScript (ES6)
- **API Engine**: iTunes Search API via JSONP callbacks
- **Audio Output**: HTML5 native `Audio` playback engine

---

## 🚀 Quick Start

1. **Install Dependencies**:
   Open the root directory and start a local HTTP server to run the client statically. You can use the pre-configured npm start script:
   ```bash
   npm start
   ```
   *(This launches the static server on port 3000 using `npx http-server`)*

2. **Access the Website**:
   Open your browser and navigate to `http://localhost:3000`.

3. **Enjoy the Music**:
   - Browse the trending hits or filter by language chips.
   - Enter any query into the search bar to query the iTunes catalog.
   - Click the heart button on any card to save it to your local Favorites panel.
