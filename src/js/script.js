// ==========================================
// TARA Play Studio - Core Player Script
// ==========================================

(function() {
    // --- App State ---
    let isPlaying = false;
    let playlist = []; // Active playing queue
    let currentTrackIndex = 0;
    let shuffleActive = false;
    let repeatMode = 0; // 0 = No Repeat, 1 = Repeat One, 2 = Repeat All
    let currentVolume = 0.8;
    let currentLyrics = [];
    let lastPlayedTrackId = null;

    // Loaded dynamic sections
    const sections = {
        trending: [],
        telugu: [],
        hindi: [],
        english: [],
        tamil: []
    };

    // State mapping for user collections (LocalStorage-backed)
    let dbFavorites = [];
    let dbRecentlyPlayed = [];

    // --- DOM Elements ---
    const body = document.body;
    const audio = document.getElementById("audio-player");
    const dynamicBg = document.getElementById("dynamic-bg");
    const playerBackdropGlow = document.getElementById("player-backdrop-glow");

    // Center Panel (Player Card)
    const currentCover = document.getElementById("current-cover");
    const currentTitle = document.getElementById("current-title");
    const currentMovie = document.getElementById("current-movie");
    const currentArtist = document.getElementById("current-artist");
    const coverGlow = document.getElementById("cover-glow");
    const loadingSpinner = document.getElementById("loading-spinner");

    // Timeline/Seek
    const timeCurrent = document.getElementById("time-current");
    const progressContainer = document.getElementById("progress-container");
    const progressBar = document.getElementById("progress-bar");
    const progressHandle = document.getElementById("progress-handle");

    // Main Controls
    const btnPlay = document.getElementById("control-play");
    const btnPrev = document.getElementById("control-prev");
    const btnNext = document.getElementById("control-next");
    const btnShuffle = document.getElementById("control-shuffle");
    const btnRepeat = document.getElementById("control-repeat");
    const repeatBadge = document.getElementById("repeat-badge");
    const btnFavorite = document.getElementById("favorite-toggle");

    // Volume
    const btnMute = document.getElementById("volume-mute");
    const volumeSlider = document.getElementById("volume-slider");
    const volumeProgress = document.getElementById("volume-progress");

    // Left Panel
    const playlistItemsContainer = document.getElementById("playlist-items");
    const searchInput = document.getElementById("search-input");
    const searchClearBtn = document.getElementById("search-clear-btn");
    const categoryChips = document.querySelectorAll(".category-chip");
    const queueCountText = document.getElementById("queue-count");

    // Right Panel / Tabs
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabPanes = document.querySelectorAll(".tab-pane");
    const lyricsTextContainer = document.getElementById("lyrics-text");
    const lyricsViewport = document.getElementById("lyrics-viewport");
    const toggleLyricsViewBtn = document.getElementById("lyrics-toggle-view");
    const clearRecentBtn = document.getElementById("clear-recent-btn");
    const recentListContainer = document.getElementById("recent-list");

    // Details Tab
    const detailsAlbumImg = document.getElementById("details-album-img");
    const detailMovie = document.getElementById("detail-movie");
    const detailArtist = document.getElementById("detail-artist");
    const detailYear = document.getElementById("detail-year");
    const detailGenre = document.getElementById("detail-genre");

    // Modals & User account
    const themeToggleBtn = document.getElementById("theme-toggle");
    const shortcutsBtn = document.getElementById("shortcuts-btn");
    const shortcutsModal = document.getElementById("shortcuts-modal");
    const modalCloseBtn = document.getElementById("modal-close");
    const toastContainer = document.getElementById("toast-container");

    // Filtering state
    let currentSearchQuery = "";
    let currentCategoryFilter = "all";

    // ==========================================
    // 1. Initialization
    // ==========================================

    async function initApp() {
        loadLocalStorageState();
        setupEventListeners();
        setupTabs();
        setupAudioPlayerTracking();
        await loadMusicData();
    }

    // Load configurations from Local Storage
    function loadLocalStorageState() {
        // Theme
        const storedTheme = localStorage.getItem("raga-theme");
        if (storedTheme === "light") {
            body.classList.remove("dark-theme");
            body.classList.add("light-theme");
        } else {
            body.classList.remove("light-theme");
            body.classList.add("dark-theme");
        }

        // Volume
        const storedVol = localStorage.getItem("raga-volume");
        if (storedVol !== null) {
            currentVolume = parseFloat(storedVol);
            volumeSlider.value = currentVolume;
            audio.volume = currentVolume;
        }

        // Repeat Mode
        const storedRepeat = localStorage.getItem("raga-repeat-mode");
        if (storedRepeat !== null) {
            repeatMode = parseInt(storedRepeat, 10);
            updateRepeatButtonUI();
        }

        // Shuffle Mode
        const storedShuffle = localStorage.getItem("raga-shuffle");
        if (storedShuffle !== null) {
            shuffleActive = (storedShuffle === "true");
            updateShuffleButtonUI();
        }

        // Favorites & Recents
        const storedFavs = localStorage.getItem("tara-favorites");
        if (storedFavs) {
            try { dbFavorites = JSON.parse(storedFavs); } catch (e) { dbFavorites = []; }
        }
        const storedRecent = localStorage.getItem("tara-recent");
        if (storedRecent) {
            try { dbRecentlyPlayed = JSON.parse(storedRecent); } catch (e) { dbRecentlyPlayed = []; }
        }
        renderRecentlyPlayed();

        // Last track
        const storedTrackId = localStorage.getItem("raga-last-track-id");
        if (storedTrackId !== null) {
            lastPlayedTrackId = parseInt(storedTrackId, 10);
        }
    }

    // Load music catalogs dynamically
    async function loadMusicData() {
        showSpinner(true);
        try {
            const [trending, telugu, hindi, english, tamil] = await Promise.all([
                MusicAPI.getTrending(),
                MusicAPI.getLanguageSongs("Telugu"),
                MusicAPI.getLanguageSongs("Hindi"),
                MusicAPI.getLanguageSongs("English"),
                MusicAPI.getLanguageSongs("Tamil")
            ]);

            sections.trending = trending;
            sections.telugu = telugu;
            sections.hindi = hindi;
            sections.english = english;
            sections.tamil = tamil;

            renderPlaylist();

            // Load active track details
            let initialTrack = null;
            if (lastPlayedTrackId) {
                for (const key in sections) {
                    if (!Array.isArray(sections[key])) continue;
                    const found = sections[key].find(t => t.id === lastPlayedTrackId);
                    if (found) {
                        initialTrack = found;
                        break;
                    }
                }
            }

            if (!initialTrack && sections.trending.length > 0) {
                initialTrack = sections.trending[0];
            }

            if (initialTrack) {
                const initialIndex = playlist.findIndex(t => t.id === initialTrack.id);
                currentTrackIndex = initialIndex !== -1 ? initialIndex : 0;
                loadTrack(playlist[currentTrackIndex]);
            }
        } catch (err) {
            console.error("Music load error:", err.message);
            playlistItemsContainer.innerHTML = `<p class="placeholder-text">⚠️ Streaming error. Please verify internet connection.</p>`;
        } finally {
            showSpinner(false);
        }
    }

    // ==========================================
    // 2. Rendering UI
    // ==========================================

    function renderPlaylist() {
        playlistItemsContainer.innerHTML = "";

        // 1. Search filter
        if (currentSearchQuery.trim() !== "") {
            renderSearchQueryList();
            return;
        }

        // 2. Favorites Tab
        if (currentCategoryFilter === "favorites") {
            renderFavoritesSection();
            return;
        }

        // 3. Specific languages/trending categories
        if (currentCategoryFilter !== "all") {
            renderSingleCategorySection(currentCategoryFilter);
            return;
        }

        // 4. Default Stacked View
        renderAllSectionsStacked();
    }

    function renderSearchQueryList() {
        if (playlist.length === 0) {
            playlistItemsContainer.innerHTML = `<p class="placeholder-text">No tracks matching "${currentSearchQuery}" found.</p>`;
            queueCountText.textContent = "0 Songs";
            return;
        }

        const titleDiv = document.createElement("div");
        titleDiv.className = "playlist-section-header-title";
        titleDiv.innerHTML = `<h4>Search Results for "${currentSearchQuery}"</h4>`;
        playlistItemsContainer.appendChild(titleDiv);

        playlist.forEach((track, index) => {
            const card = createSongCardDOM(track, index);
            playlistItemsContainer.appendChild(card);
        });

        queueCountText.textContent = `${playlist.length} Song${playlist.length === 1 ? '' : 's'}`;
    }

    function renderSingleCategorySection(category) {
        const tracks = sections[category] || [];
        playlist = [...tracks];

        if (playlist.length === 0) {
            playlistItemsContainer.innerHTML = `<p class="placeholder-text">Category list is empty.</p>`;
            queueCountText.textContent = "0 Songs";
            return;
        }

        const titleMap = {
            trending: "🔥 Trending Hits",
            telugu: "🇮🇳 Telugu Tracks",
            hindi: "🇮🇳 Hindi Tracks",
            english: "🇬🇧 English Pop",
            tamil: "🇮🇳 Tamil Tracks"
        };

        const titleDiv = document.createElement("div");
        titleDiv.className = "playlist-section-header-title";
        titleDiv.innerHTML = `<h4>${titleMap[category] || category}</h4>`;
        playlistItemsContainer.appendChild(titleDiv);

        playlist.forEach((track, index) => {
            const card = createSongCardDOM(track, index);
            playlistItemsContainer.appendChild(card);
        });

        queueCountText.textContent = `${playlist.length} Song${playlist.length === 1 ? '' : 's'}`;
    }

    function renderFavoritesSection() {
        playlist = [...dbFavorites];

        if (playlist.length === 0) {
            playlistItemsContainer.innerHTML = `<p class="placeholder-text">Your Favorites list is empty. Heart songs to add them here! ❤️</p>`;
            queueCountText.textContent = "0 Songs";
            return;
        }

        const titleDiv = document.createElement("div");
        titleDiv.className = "playlist-section-header-title";
        titleDiv.innerHTML = `<h4>❤️ Your Favorite Songs</h4>`;
        playlistItemsContainer.appendChild(titleDiv);

        playlist.forEach((track, index) => {
            const card = createSongCardDOM(track, index);
            playlistItemsContainer.appendChild(card);
        });

        queueCountText.textContent = `${playlist.length} Song${playlist.length === 1 ? '' : 's'}`;
    }

    function renderAllSectionsStacked() {
        playlist = [];

        const sectionsToRender = [
            { key: "trending", title: "🔥 Trending Hits" },
            { key: "telugu", title: "🇮🇳 Telugu Tracks" },
            { key: "hindi", title: "🇮🇳 Hindi Tracks" },
            { key: "english", title: "🇬🇧 English Pop" },
            { key: "tamil", title: "🇮🇳 Tamil Tracks" }
        ];

        sectionsToRender.forEach(sec => {
            const tracks = sections[sec.key] || [];
            if (tracks.length === 0) return;

            const sectionHeader = document.createElement("div");
            sectionHeader.className = "playlist-section-header-title";
            sectionHeader.innerHTML = `<h4>${sec.title}</h4>`;
            playlistItemsContainer.appendChild(sectionHeader);

            tracks.forEach(track => {
                playlist.push(track);
                const globalIndex = playlist.length - 1;
                const card = createSongCardDOM(track, globalIndex);
                playlistItemsContainer.appendChild(card);
            });
        });

        queueCountText.textContent = `${playlist.length} Song${playlist.length === 1 ? '' : 's'}`;
    }

    // Build list cards elements (Without the 30-second duration column!)
    function createSongCardDOM(track, index) {
        const isCurrent = (playlist[index] && playlist[currentTrackIndex] && playlist[index].id === playlist[currentTrackIndex].id);
        const cardClass = `song-card ${isCurrent ? 'active' : ''} ${isCurrent && isPlaying ? 'playing' : ''}`;
        const isFav = dbFavorites.some(f => f.id === track.id);

        let titleHtml = track.title;
        let artistHtml = track.artist;
        let movieHtml = track.movie;

        if (currentSearchQuery) {
            titleHtml = highlightText(track.title, currentSearchQuery);
            artistHtml = highlightText(track.artist, currentSearchQuery);
            movieHtml = highlightText(track.movie, currentSearchQuery);
        }

        const card = document.createElement("div");
        card.className = cardClass;
        card.setAttribute("data-id", track.id);
        card.setAttribute("data-index", index);

        card.innerHTML = `
            <div class="song-thumbnail-box">
                <img src="${track.cover}" class="song-thumbnail" alt="${track.title}" loading="lazy">
            </div>
            <div class="song-details">
                <div class="song-name-row">
                    <span class="song-card-title">${titleHtml}</span>
                </div>
                <div class="song-card-meta">${movieHtml} &bull; ${artistHtml}</div>
            </div>
            <div class="list-play-indicator">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
            </div>
            <button class="song-card-fav-btn ${isFav ? 'favorited' : ''}" aria-label="Favorite button" data-track-id="${track.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
            </button>
        `;

        card.addEventListener("click", (e) => {
            if (e.target.closest(".song-card-fav-btn")) return;
            selectAndPlayTrack(index);
        });

        const favBtn = card.querySelector(".song-card-fav-btn");
        favBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleFavorite(track);
        });

        return card;
    }

    function highlightText(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
        return text.replace(regex, `<span class="search-highlight">$1</span>`);
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function showSpinner(show) {
        loadingSpinner.style.display = show ? "block" : "none";
    }

    // Adapt backdrop neon gradients & dominant blurred backdrops
    function updateAmbientBackdropColors(track) {
        if (track.themeColors && track.themeColors.length >= 2) {
            dynamicBg.style.setProperty("--dynamic-glow-1", track.themeColors[0]);
            dynamicBg.style.setProperty("--dynamic-glow-2", track.themeColors[1]);
            coverGlow.style.background = track.themeColors[0];
            if (playerBackdropGlow) {
                playerBackdropGlow.style.background = track.themeColors[0];
            }
        }
    }

    // ==========================================
    // 3. Playback Controller
    // ==========================================

    function loadTrack(track) {
        if (!track) return;

        showSpinner(true);
        
        lastPlayedTrackId = track.id;
        localStorage.setItem("raga-last-track-id", lastPlayedTrackId);

        // Update player card UI elements
        currentCover.src = track.cover;
        currentTitle.textContent = track.title;
        currentMovie.textContent = track.movie;
        currentArtist.textContent = track.artist;

        // Details Tab
        detailsAlbumImg.src = track.coverLarge || track.cover;
        detailMovie.textContent = track.movie;
        detailArtist.textContent = track.artist;
        detailYear.textContent = track.year;
        detailGenre.textContent = track.category;

        // Reset progress bar
        progressBar.style.width = `0%`;
        progressHandle.style.left = `0%`;
        timeCurrent.textContent = "00:00";

        // Favorite State
        updateFavoriteButtonUI(track.id);

        // Dynamic Ambient backdrop
        updateAmbientBackdropColors(track);

        // Synced lyrics setup
        loadLyrics(track);

        // Highlight active sidebar cards
        updatePlaylistActiveStates();

        // Update marquee behavior
        updateTitleMarquee();

        // Load source and play
        audio.src = track.audio;
        audio.load();
    }

    function updateTitleMarquee() {
        currentTitle.classList.remove("marquee-active");
        const container = currentTitle.parentElement;
        if (currentTitle.scrollWidth > container.clientWidth) {
            currentTitle.classList.add("marquee-active");
        }
    }

    function selectAndPlayTrack(index) {
        if (index < 0 || index >= playlist.length) return;
        currentTrackIndex = index;
        loadTrack(playlist[currentTrackIndex]);
        playTrack();
    }

    function playTrack() {
        if (!audio.src) return;
        
        isPlaying = true;
        body.classList.add("audio-playing");
        updatePlaylistActiveStates();
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                showSpinner(false);
            }).catch(err => {
                console.warn("Autoplay block or source loading:", err);
                showSpinner(false);
            });
        }

        // Add to recently played
        const track = playlist[currentTrackIndex];
        if (track) {
            addToRecentlyPlayed(track);
        }
    }

    function pauseTrack() {
        isPlaying = false;
        body.classList.remove("audio-playing");
        audio.pause();
        updatePlaylistActiveStates();
    }

    function togglePlay() {
        if (playlist.length === 0) return;
        if (isPlaying) {
            pauseTrack();
            showToast("Paused ⏸️", 1200);
        } else {
            playTrack();
            showToast(`Playing: ${playlist[currentTrackIndex].title} 🎶`, 1500);
        }
    }

    function nextTrack() {
        if (playlist.length === 0) return;
        showSpinner(true);
        let nextIndex = currentTrackIndex + 1;

        if (shuffleActive) {
            if (playlist.length > 1) {
                do {
                    nextIndex = Math.floor(Math.random() * playlist.length);
                } while (nextIndex === currentTrackIndex);
            } else {
                nextIndex = 0;
            }
        } else {
            if (nextIndex >= playlist.length) {
                if (repeatMode === 2) {
                    nextIndex = 0;
                } else {
                    // Stop queue naturally at end
                    currentTrackIndex = playlist.length - 1;
                    loadTrack(playlist[currentTrackIndex]);
                    pauseTrack();
                    showSpinner(false);
                    return;
                }
            }
        }

        currentTrackIndex = nextIndex;
        loadTrack(playlist[currentTrackIndex]);
        
        if (isPlaying) {
            playTrack();
        } else {
            showSpinner(false);
        }
        showToast(`Next: ${playlist[currentTrackIndex].title}`, 1200);
    }

    function prevTrack() {
        if (playlist.length === 0) return;

        if (audio.currentTime > 3) {
            audio.currentTime = 0;
            progressBar.style.width = `0%`;
            progressHandle.style.left = `0%`;
            timeCurrent.textContent = "00:00";
            showToast("Restarted Song 🔄", 1200);
            return;
        }

        showSpinner(true);
        let prevIndex = currentTrackIndex - 1;

        if (shuffleActive) {
            if (playlist.length > 1) {
                do {
                    prevIndex = Math.floor(Math.random() * playlist.length);
                } while (prevIndex === currentTrackIndex);
            } else {
                prevIndex = 0;
            }
        } else {
            if (prevIndex < 0) {
                if (repeatMode === 2) {
                    prevIndex = playlist.length - 1;
                } else {
                    prevIndex = 0;
                }
            }
        }

        currentTrackIndex = prevIndex;
        loadTrack(playlist[currentTrackIndex]);
        
        if (isPlaying) {
            playTrack();
        } else {
            showSpinner(false);
        }
        showToast(`Previous: ${playlist[currentTrackIndex].title}`, 1200);
    }

    function changeVolume(value) {
        currentVolume = parseFloat(value);
        audio.volume = currentVolume;
        localStorage.setItem("raga-volume", currentVolume);
        updateVolumeUI();
    }

    function updateVolumeUI() {
        volumeProgress.style.width = `${currentVolume * 100}%`;
        volumeSlider.value = currentVolume;
        
        const highIcon = btnMute.querySelector(".vol-high-svg");
        const lowIcon = btnMute.querySelector(".vol-low-svg");
        const muteIcon = btnMute.querySelector(".vol-mute-svg");

        highIcon.style.display = "none";
        lowIcon.style.display = "none";
        muteIcon.style.display = "none";

        if (audio.muted || currentVolume === 0) {
            muteIcon.style.display = "block";
        } else if (currentVolume < 0.4) {
            lowIcon.style.display = "block";
        } else {
            highIcon.style.display = "block";
        }
    }

    function toggleMute() {
        audio.muted = !audio.muted;
        if (audio.muted) {
            showToast("Muted 🔇", 1200);
        } else {
            showToast(`Unmuted 🔊 Vol: ${Math.round(currentVolume * 100)}%`, 1200);
        }
        updateVolumeUI();
    }

    function toggleShuffle() {
        shuffleActive = !shuffleActive;
        localStorage.setItem("raga-shuffle", shuffleActive);
        updateShuffleButtonUI();
        showToast(shuffleActive ? "Shuffle ON 🔀" : "Shuffle OFF ➡️", 1200);
    }

    function updateShuffleButtonUI() {
        if (shuffleActive) {
            btnShuffle.classList.add("active");
        } else {
            btnShuffle.classList.remove("active");
        }
    }

    function toggleRepeat() {
        repeatMode = (repeatMode + 1) % 3;
        localStorage.setItem("raga-repeat-mode", repeatMode);
        updateRepeatButtonUI();

        const modes = ["No Repeat ➡️", "Repeat One 🔂", "Repeat All 🔁"];
        showToast(modes[repeatMode], 1200);
    }

    function updateRepeatButtonUI() {
        btnRepeat.classList.remove("active");
        repeatBadge.style.display = "none";

        if (repeatMode === 1) {
            btnRepeat.classList.add("active");
            repeatBadge.style.display = "flex";
            repeatBadge.textContent = "1";
        } else if (repeatMode === 2) {
            btnRepeat.classList.add("active");
            repeatBadge.style.display = "flex";
            repeatBadge.textContent = "All";
        }
    }

    function updatePlaylistActiveStates() {
        const cards = playlistItemsContainer.querySelectorAll(".song-card");
        const activeTrack = playlist[currentTrackIndex];
        if (!activeTrack) return;

        cards.forEach(card => {
            const cardId = parseInt(card.getAttribute("data-id"), 10);
            if (cardId === activeTrack.id) {
                card.classList.add("active");
                if (isPlaying) {
                    card.classList.add("playing");
                } else {
                    card.classList.remove("playing");
                }
            } else {
                card.classList.remove("active", "playing");
            }
        });
    }

    // ==========================================
    // 4. Progress Seeking & Audio Event Tracker
    // ==========================================

    function setupAudioPlayerTracking() {
        // Source changes & spinners
        audio.addEventListener("waiting", () => showSpinner(true));
        audio.addEventListener("playing", () => showSpinner(false));
        audio.addEventListener("canplay", () => showSpinner(false));

        // Time updates
        audio.addEventListener("timeupdate", () => {
            const currentTime = audio.currentTime;
            const duration = audio.duration;

            if (duration > 0) {
                const progressPercent = (currentTime / duration) * 100;
                progressBar.style.width = `${progressPercent}%`;
                progressHandle.style.left = `${progressPercent}%`;
                
                timeCurrent.textContent = formatTime(currentTime);
                updateLyricsHighlight(currentTime);
            }
        });

        // Dynamic transition ended: repeats or advances automatically
        audio.addEventListener("ended", () => {
            if (repeatMode === 1) {
                audio.currentTime = 0;
                progressBar.style.width = `0%`;
                progressHandle.style.left = `0%`;
                playTrack();
            } else {
                nextTrack();
            }
        });
    }

    function setPlaybackPosition(e) {
        const rect = progressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const duration = audio.duration;
        
        if (duration <= 0 || isNaN(duration)) return;
        
        const newPercentage = Math.max(0, Math.min(1, clickX / width));
        audio.currentTime = newPercentage * duration;
        
        progressBar.style.width = `${newPercentage * 100}%`;
        progressHandle.style.left = `${newPercentage * 100}%`;
        timeCurrent.textContent = formatTime(audio.currentTime);
    }

    let isDraggingProgress = false;

    function setupProgressBarDrag() {
        progressContainer.addEventListener("mousedown", (e) => {
            isDraggingProgress = true;
            setPlaybackPosition(e);
        });

        document.addEventListener("mousemove", (e) => {
            if (isDraggingProgress) {
                setPlaybackPosition(e);
            }
        });

        document.addEventListener("mouseup", () => {
            isDraggingProgress = false;
        });

        // Touch seeking
        progressContainer.addEventListener("touchstart", (e) => {
            isDraggingProgress = true;
            handleTouchSeek(e);
        });

        document.addEventListener("touchmove", (e) => {
            if (isDraggingProgress) {
                handleTouchSeek(e);
            }
        });

        document.addEventListener("touchend", () => {
            isDraggingProgress = false;
        });
    }

    function handleTouchSeek(e) {
        if (e.touches.length === 0) return;
        const rect = progressContainer.getBoundingClientRect();
        const touchX = e.touches[0].clientX - rect.left;
        const width = rect.width;
        const duration = audio.duration;
        
        if (duration <= 0 || isNaN(duration)) return;
        
        const newPercentage = Math.max(0, Math.min(1, touchX / width));
        audio.currentTime = newPercentage * duration;
        
        progressBar.style.width = `${newPercentage * 100}%`;
        progressHandle.style.left = `${newPercentage * 100}%`;
        timeCurrent.textContent = formatTime(audio.currentTime);
    }

    // ==========================================
    // 5. Favorites Storage Manager
    // ==========================================

    function toggleFavorite(track) {
        const index = dbFavorites.findIndex(f => f.id === track.id);
        if (index !== -1) {
            dbFavorites.splice(index, 1);
            showToast("Removed from Favorites 💔", 1200);
        } else {
            dbFavorites.push(track);
            showToast("Added to Favorites ❤️", 1200);
        }

        localStorage.setItem("tara-favorites", JSON.stringify(dbFavorites));
        
        // Sync active cover hearts
        const activeTrack = playlist[currentTrackIndex];
        if (activeTrack && activeTrack.id === track.id) {
            updateFavoriteButtonUI(track.id);
        }

        renderPlaylist();
    }

    function updateFavoriteButtonUI(trackId) {
        const isFav = dbFavorites.some(f => f.id === trackId);
        if (isFav) {
            btnFavorite.classList.add("favorited");
        } else {
            btnFavorite.classList.remove("favorited");
        }
    }

    // ==========================================
    // 6. Synde Lyrics Parsing
    // ==========================================

    function generateMockSyncedLyrics(track) {
        return `[00:01] 🎵 Streaming: ${track.title}
[00:04] 🎤 Artist: ${track.artist}
[00:07] 💿 Movie / Album: ${track.movie}
[00:11] ✨ Premium dark neumorphic interface active
[00:14] ⚡ Ambient Glow adjusts dynamically to artwork hues
[00:18] ❤️ Click the soft heart to save to favorites
[00:22] 🎹 Keyboard shortcuts: Space (Play), Arrows (Next/Vol)
[00:25] 🎧 Enjoy premium music on TARA play studio!`;
    }

    function loadLyrics(track) {
        lyricsTextContainer.innerHTML = `<p class="placeholder-line">Loading lyrics...</p>`;
        currentLyrics = [];

        const dynamicText = generateMockSyncedLyrics(track);
        parseAndRenderLyrics(dynamicText);
    }

    function parseAndRenderLyrics(textString) {
        lyricsTextContainer.innerHTML = "";
        currentLyrics = [];

        const lines = textString.split("\n");
        const regex = /\[(\d{2}):(\d{2})\](.*)/;

        lines.forEach(line => {
            const match = line.match(regex);
            if (match) {
                const minutes = parseInt(match[1], 10);
                const seconds = parseInt(match[2], 10);
                const time = minutes * 60 + seconds;
                const lyricText = match[3].trim();

                if (lyricText) {
                    currentLyrics.push({ time, text: lyricText });
                    
                    const linePara = document.createElement("p");
                    linePara.className = "lyric-line";
                    linePara.textContent = lyricText;
                    linePara.setAttribute("data-time", time);
                    
                    linePara.addEventListener("click", () => {
                        audio.currentTime = time;
                        if (!isPlaying) playTrack();
                    });

                    lyricsTextContainer.appendChild(linePara);
                }
            }
        });

        if (currentLyrics.length === 0) {
            lyricsTextContainer.innerHTML = `<p class="placeholder-line">No lyrics formatting loaded.</p>`;
        }
    }

    function updateLyricsHighlight(time) {
        if (currentLyrics.length === 0) return;

        let activeIndex = -1;
        for (let i = 0; i < currentLyrics.length; i++) {
            if (time >= currentLyrics[i].time) {
                activeIndex = i;
            } else {
                break;
            }
        }

        if (activeIndex !== -1) {
            const lines = lyricsTextContainer.querySelectorAll(".lyric-line");
            lines.forEach((line, idx) => {
                if (idx === activeIndex) {
                    if (!line.classList.contains("active")) {
                        line.classList.add("active");
                        
                        const viewportHeight = lyricsViewport.clientHeight;
                        const lineTop = line.offsetTop;
                        const lineHeight = line.clientHeight;
                        
                        lyricsViewport.scrollTo({
                            top: lineTop - (viewportHeight / 2) + (lineHeight / 2),
                            behavior: "smooth"
                        });
                    }
                } else {
                    line.classList.remove("active");
                }
            });
        }
    }

    // ==========================================
    // 7. Recently Played
    // ==========================================

    function addToRecentlyPlayed(track) {
        // Re-align duplicates
        dbRecentlyPlayed = dbRecentlyPlayed.filter(t => t.id !== track.id);
        dbRecentlyPlayed.unshift(track);

        // Keep last 15
        if (dbRecentlyPlayed.length > 15) {
            dbRecentlyPlayed.pop();
        }

        localStorage.setItem("tara-recent", JSON.stringify(dbRecentlyPlayed));
        renderRecentlyPlayed();
    }

    function renderRecentlyPlayed() {
        recentListContainer.innerHTML = "";
        
        if (dbRecentlyPlayed.length === 0) {
            recentListContainer.innerHTML = `<p class="placeholder-text">No songs played yet in this session.</p>`;
            return;
        }

        dbRecentlyPlayed.forEach((track, index) => {
            const div = document.createElement("div");
            div.className = "recent-item";
            div.innerHTML = `
                <img src="${track.cover}" class="recent-thumb" alt="${track.title}" loading="lazy">
                <div class="recent-meta">
                    <div class="recent-title">${track.title}</div>
                    <div class="recent-time">${track.artist}</div>
                </div>
            `;

            div.addEventListener("click", () => {
                playlist = [...dbRecentlyPlayed];
                currentTrackIndex = index;
                loadTrack(playlist[currentTrackIndex]);
                playTrack();
            });

            recentListContainer.appendChild(div);
        });
    }

    // ==========================================
    // 8. Standard Tabs, Themes & Hotkeys
    // ==========================================

    function setupTabs() {
        tabButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const targetTab = btn.getAttribute("data-tab");
                tabButtons.forEach(b => b.classList.remove("active"));
                tabPanes.forEach(pane => pane.classList.remove("active"));

                btn.classList.add("active");
                const tabPane = document.getElementById(targetTab);
                if (tabPane) {
                    tabPane.classList.add("active");
                }
            });
        });
    }

    function toggleTheme() {
        if (body.classList.contains("dark-theme")) {
            body.classList.remove("dark-theme");
            body.classList.add("light-theme");
            localStorage.setItem("raga-theme", "light");
            showToast("Switched to Light Theme ☀️", 1200);
        } else {
            body.classList.remove("light-theme");
            body.classList.add("dark-theme");
            localStorage.setItem("raga-theme", "dark");
            showToast("Switched to Dark Theme 🌙", 1200);
        }
    }

    function showToast(message, duration = 2500) {
        const toast = document.createElement("div");
        toast.className = "toast";
        toast.innerHTML = `<span>${message}</span>`;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add("fade-out");
            toast.addEventListener("animationend", () => {
                toast.remove();
            });
        }, duration);
    }

    function setupKeyboardShortcuts() {
        document.addEventListener("keydown", (e) => {
            if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "SELECT") {
                if (e.key === "Escape" && document.activeElement === searchInput) {
                    searchInput.blur();
                    searchInput.value = "";
                    currentSearchQuery = "";
                    searchClearBtn.style.display = "none";
                    renderPlaylist();
                }
                return;
            }

            switch (e.key) {
                case " ":
                    e.preventDefault();
                    togglePlay();
                    break;
                case "ArrowLeft":
                    if (e.shiftKey) {
                        audio.currentTime = Math.max(0, audio.currentTime - 5);
                        showToast("⏪ Back 5s", 1000);
                    } else {
                        prevTrack();
                    }
                    break;
                case "ArrowRight":
                    if (e.shiftKey) {
                        audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
                        showToast("⏩ Forward 5s", 1000);
                    } else {
                        nextTrack();
                    }
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    changeVolume(Math.min(1, currentVolume + 0.1));
                    showToast(`Volume: ${Math.round(currentVolume * 100)}% 🔊`, 1000);
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    changeVolume(Math.max(0, currentVolume - 0.1));
                    showToast(`Volume: ${Math.round(currentVolume * 100)}% 🔉`, 1000);
                    break;
                case "m":
                case "M":
                    toggleMute();
                    break;
                case "l":
                case "L":
                    const lyricsTabBtn = document.querySelector('[data-tab="lyrics-tab"]');
                    if (lyricsTabBtn) lyricsTabBtn.click();
                    showToast("Viewed Lyrics 🎤", 1000);
                    break;
                case "s":
                case "S":
                    toggleShuffle();
                    break;
                case "r":
                case "R":
                    toggleRepeat();
                    break;
                default:
                    break;
            }
        });
    }

    function debounce(func, delay) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // ==========================================
    // 9. Event Listeners Coordinator
    // ==========================================

    function setupEventListeners() {
        btnPlay.addEventListener("click", togglePlay);
        btnNext.addEventListener("click", nextTrack);
        btnPrev.addEventListener("click", prevTrack);
        btnShuffle.addEventListener("click", toggleShuffle);
        btnRepeat.addEventListener("click", toggleRepeat);
        btnFavorite.addEventListener("click", () => {
            if (playlist.length > 0) {
                toggleFavorite(playlist[currentTrackIndex]);
            }
        });

        // Volume controls
        btnMute.addEventListener("click", toggleMute);
        volumeSlider.addEventListener("input", (e) => changeVolume(e.target.value));

        // Timeline Seek
        setupProgressBarDrag();

        // Theme and shortcuts modal
        themeToggleBtn.addEventListener("click", toggleTheme);
        shortcutsBtn.addEventListener("click", () => {
            shortcutsModal.classList.add("open");
        });
        modalCloseBtn.addEventListener("click", () => {
            shortcutsModal.classList.remove("open");
        });
        shortcutsModal.addEventListener("click", (e) => {
            if (e.target === shortcutsModal) {
                shortcutsModal.classList.remove("open");
            }
        });

        // Clear local history
        clearRecentBtn.addEventListener("click", () => {
            dbRecentlyPlayed = [];
            localStorage.removeItem("tara-recent");
            renderRecentlyPlayed();
            showToast("History Cleared 🧹", 1200);
        });

        // Search input
        const handleSearchInput = debounce(async (e) => {
            const query = e.target.value.trim();
            currentSearchQuery = query;
            searchClearBtn.style.display = currentSearchQuery ? "block" : "none";
            
            if (currentSearchQuery) {
                showSpinner(true);
                try {
                    const searchResults = await MusicAPI.search(currentSearchQuery);
                    playlist = searchResults;
                    renderPlaylist();
                } catch (err) {
                    console.error("Search failed:", err);
                    playlistItemsContainer.innerHTML = `<p class="placeholder-text">⚠️ Search failed. Please check internet connection.</p>`;
                } finally {
                    showSpinner(false);
                }
            } else {
                renderPlaylist();
            }
        }, 400);

        searchInput.addEventListener("input", handleSearchInput);

        searchClearBtn.addEventListener("click", () => {
            searchInput.value = "";
            currentSearchQuery = "";
            searchClearBtn.style.display = "none";
            renderPlaylist();
        });

        // Category chips filters
        categoryChips.forEach(chip => {
            chip.addEventListener("click", () => {
                categoryChips.forEach(c => c.classList.remove("active"));
                chip.classList.add("active");
                currentCategoryFilter = chip.getAttribute("data-category");
                
                // Clear active search query when shifting chips
                if (searchInput.value !== "") {
                    searchInput.value = "";
                    currentSearchQuery = "";
                    searchClearBtn.style.display = "none";
                }
                
                renderPlaylist();
            });
        });

        // Toggle lyrics viewport visibility
        toggleLyricsViewBtn.addEventListener("click", () => {
            const lyricsTab = document.getElementById("lyrics-tab");
            if (lyricsTab.style.visibility === "hidden" || lyricsTab.style.opacity === "0") {
                lyricsTab.style.visibility = "visible";
                lyricsTab.style.opacity = "1";
                toggleLyricsViewBtn.textContent = "Hide Panel";
            } else {
                lyricsTab.style.visibility = "hidden";
                lyricsTab.style.opacity = "0";
                toggleLyricsViewBtn.textContent = "Show Panel";
                showToast("Lyrics Hidden 🙈", 1000);
            }
        });

        // Resize marquees on window resize
        window.addEventListener("resize", debounce(updateTitleMarquee, 250));

        setupKeyboardShortcuts();
    }

    // Bootstrap app
    document.addEventListener("DOMContentLoaded", initApp);
})();
