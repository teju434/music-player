// ==========================================
// TARA Play Studio - Client-Side Music API Service
// ==========================================

const MusicAPI = {
    /**
     * Helper: Execute a JSONP request to bypass CORS restrictions
     */
    jsonp(url) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
            window[callbackName] = (data) => {
                delete window[callbackName];
                document.body.removeChild(script);
                resolve(data);
            };
            
            const script = document.createElement('script');
            script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
            script.onerror = (err) => {
                delete window[callbackName];
                document.body.removeChild(script);
                reject(new Error("JSONP request failed"));
            };
            document.body.appendChild(script);
        });
    },

    /**
     * Format raw iTunes response into our player catalog schema
     */
    formatTrack(item) {
        // Premium dynamic colors tailored to matching artwork profiles
        const gradients = [
            ["#ba0c2f", "#4a040d"], // Crimson red
            ["#1db954", "#191414"], // Spotify green
            ["#007aff", "#002d5a"], // Apple blue
            ["#ff2d55", "#4e0010"], // Apple pink
            ["#ff9500", "#543000"], // Orange gold
            ["#5856d6", "#1c1b48"]  // Violet wave
        ];
        const colorPair = gradients[Math.abs(item.trackId || 0) % gradients.length];
        
        const cover = item.artworkUrl100 || "assets/images/cover1.svg";
        const coverLarge = cover.replace("100x100bb.jpg", "500x500bb.jpg");

        return {
            id: item.trackId,
            title: item.trackName,
            artist: item.artistName,
            movie: item.collectionName || "Single",
            album: item.collectionName || "Single",
            audio: item.previewUrl,
            cover: cover,
            coverLarge: coverLarge,
            year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : "N/A",
            category: item.primaryGenreName || "Music",
            themeColors: colorPair
        };
    },

    /**
     * Search songs by query
     */
    async search(query) {
        try {
            const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=25`;
            const data = await this.jsonp(url);
            if (!data || !data.results) return [];
            return data.results.map(this.formatTrack);
        } catch (err) {
            console.error("MusicAPI search error:", err);
            return [];
        }
    },

    /**
     * Get trending charts (Top popular tracks)
     */
    async getTrending() {
        try {
            const url = `https://itunes.apple.com/search?term=pop&media=music&limit=15`;
            const data = await this.jsonp(url);
            if (!data || !data.results) return [];
            return data.results.map(this.formatTrack);
        } catch (err) {
            console.error("MusicAPI getTrending error:", err);
            return [];
        }
    },

    /**
     * Get language-specific lists (Telugu, Hindi, English, Tamil)
     */
    async getLanguageSongs(language) {
        try {
            const url = `https://itunes.apple.com/search?term=${encodeURIComponent(language)}&media=music&limit=12`;
            const data = await this.jsonp(url);
            if (!data || !data.results) return [];
            return data.results.map(this.formatTrack);
        } catch (err) {
            console.error(`MusicAPI getLanguageSongs error for ${language}:`, err);
            return [];
        }
    }
};

// Expose globally
window.MusicAPI = MusicAPI;
