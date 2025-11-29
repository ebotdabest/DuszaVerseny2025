/**
 * Modern Audio Player – Sleek Spotify-inspired design
 * - Spinning icon that stays in place on hover
 * - Controls expand horizontally to the side
 * - Clean shadcn aesthetic
 */
(function () {
  'use strict';

  const DEFAULT_OPTIONS = {
    musicPath: './music',
    sfxPath: './sfx',
    accentColor: '#1db954',
    corner: 'top-right',
    theme: 'dark',
  };

  class AudioPlayer {
    constructor(options = {}) {
      this.options = { ...DEFAULT_OPTIONS, ...options };
      this.currentTrack = null;
      this.isPlaying = false;
      this.volume = 1.0;
      this.userInteracted = false;
      this.playlist = [];
      this.currentIndex = -1;
      this.autoPlay = true;

      this.injectStyles();
      this.createPlayer();
      this.setTheme(this.options.theme);
      this.setAccentColor(this.options.accentColor);
      this.setCorner(this.options.corner);

      // Try multiple interaction triggers
      const triggerInteraction = () => {
        if (!this.userInteracted) {
          this.initAudio();
        }
      };

      document.addEventListener('click', triggerInteraction, { once: true });
      document.addEventListener('touchstart', triggerInteraction, { once: true });
      document.addEventListener('keydown', triggerInteraction, { once: true });
      document.addEventListener('mousemove', triggerInteraction, { once: true });

      // Try to init on page visibility change (works in some contexts)
      document.addEventListener('visibilitychange', triggerInteraction, { once: true });
    }

    initAudio() {
      if (this.audioContext) return;
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.userInteracted = true;

      // Play pending track if there is one
      if (this.pendingTrack) {
        const track = this.pendingTrack;
        this.pendingTrack = null;
        this.play(track);
      } else if (this.playlist.length > 0 && this.currentIndex === -1) {
        this.currentIndex = 0;
        this.play(this.playlist[0]);
      }
    }

    injectStyles() {
      if (document.getElementById('audio-player-styles')) return;

      const css = `
        .audio-player-container {
          position: fixed;
          z-index: 2147483647;
          display: flex;
          align-items: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .audio-player-container.corner-left {
          flex-direction: row;
        }

        .audio-player-container.corner-right {
          flex-direction: row-reverse;
        }

        .audio-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: hsl(var(--audio-bg));
          border: 1px solid hsl(var(--audio-border));
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          transition: box-shadow 0.2s;
          z-index: 2;
        }

        .audio-icon-wrapper:hover {
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
        }

        .audio-icon {
          width: 24px;
          height: 24px;
          color: hsl(var(--audio-accent));
          animation: spin 3s linear infinite;
        }

        .audio-player-container.playing .audio-icon {
          animation: spin 2s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .audio-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          background: hsl(var(--audio-bg));
          border: 1px solid hsl(var(--audio-border));
          border-radius: 24px;
          padding: 8px 16px;
          opacity: 0;
          pointer-events: none;
          transform: scale(0.95);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          white-space: nowrap;
        }

        .audio-player-container.corner-left .audio-controls {
          margin-left: -8px;
          padding-left: 20px;
        }

        .audio-player-container.corner-right .audio-controls {
          margin-right: -8px;
          padding-right: 20px;
        }

        .audio-player-container:hover .audio-controls {
          opacity: 1;
          pointer-events: all;
          transform: scale(1);
        }

        .audio-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: hsl(var(--audio-foreground));
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .audio-btn:hover {
          background: hsl(var(--audio-accent) / 0.1);
          color: hsl(var(--audio-accent));
        }

        .audio-btn.play-btn {
          background: hsl(var(--audio-accent));
          color: white;
        }

        .audio-btn.play-btn:hover {
          background: hsl(var(--audio-accent-hover));
          transform: scale(1.05);
        }

        .audio-track-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          max-width: 150px;
          margin: 0 8px;
        }

        .audio-track-title {
          font-size: 13px;
          font-weight: 500;
          color: hsl(var(--audio-foreground));
          font-family: system-ui, -apple-system, sans-serif;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .audio-track-status {
          font-size: 11px;
          color: hsl(var(--audio-muted));
          font-family: system-ui, -apple-system, sans-serif;
        }

        .audio-volume-group {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-left: 8px;
          border-left: 1px solid hsl(var(--audio-border));
        }

        .audio-volume-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: hsl(var(--audio-foreground));
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .audio-volume-btn:hover {
          background: hsl(var(--audio-accent) / 0.1);
          color: hsl(var(--audio-accent));
        }

        .audio-volume-slider {
          width: 80px;
          height: 4px;
          -webkit-appearance: none;
          appearance: none;
          background: hsl(var(--audio-border));
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }

        .audio-volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: hsl(var(--audio-accent));
          cursor: pointer;
          transition: transform 0.2s;
        }

        .audio-volume-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        .audio-volume-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: hsl(var(--audio-accent));
          border: none;
          cursor: pointer;
        }

        /* Dark theme (default) */
        :root {
          --audio-bg: 0 0% 10%;
          --audio-foreground: 0 0% 98%;
          --audio-border: 0 0% 20%;
          --audio-muted: 0 0% 60%;
          --audio-accent: 142 76% 36%;
          --audio-accent-hover: 142 76% 32%;
        }

        /* Light theme */
        body.audio-light {
          --audio-bg: 0 0% 100%;
          --audio-foreground: 0 0% 10%;
          --audio-border: 0 0% 90%;
          --audio-muted: 0 0% 45%;
          --audio-accent: 142 76% 36%;
          --audio-accent-hover: 142 76% 32%;
        }
      `;

      const style = document.createElement('style');
      style.id = 'audio-player-styles';
      style.textContent = css;
      document.head.appendChild(style);
    }

    createPlayer() {
      this.container = document.createElement('div');
      this.container.className = 'audio-player-container';

      // Icon wrapper
      this.iconWrapper = document.createElement('div');
      this.iconWrapper.className = 'audio-icon-wrapper';

      // SVG icon (music note)
      this.icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this.icon.setAttribute('class', 'audio-icon');
      this.icon.setAttribute('viewBox', '0 0 24 24');
      this.icon.setAttribute('fill', 'none');
      this.icon.setAttribute('stroke', 'currentColor');
      this.icon.setAttribute('stroke-width', '2');
      this.icon.setAttribute('stroke-linecap', 'round');
      this.icon.setAttribute('stroke-linejoin', 'round');
      this.icon.innerHTML = '<path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>';

      this.iconWrapper.appendChild(this.icon);

      // Controls panel
      this.controlsEl = document.createElement('div');
      this.controlsEl.className = 'audio-controls';

      // Track info
      this.trackInfo = document.createElement('div');
      this.trackInfo.className = 'audio-track-info';
      this.trackTitle = document.createElement('div');
      this.trackTitle.className = 'audio-track-title';
      this.trackTitle.textContent = 'Ready';
      this.trackStatus = document.createElement('div');
      this.trackStatus.className = 'audio-track-status';
      this.trackStatus.textContent = 'No track';
      this.trackInfo.append(this.trackTitle, this.trackStatus);

      // Control buttons
      this.prevBtn = this.createButton('⏮', 'audio-btn');
      this.playBtn = this.createButton('▶', 'audio-btn play-btn');
      this.nextBtn = this.createButton('⏭', 'audio-btn');

      // Volume group
      this.volumeGroup = document.createElement('div');
      this.volumeGroup.className = 'audio-volume-group';

      this.volumeBtn = this.createButton('🔊', 'audio-volume-btn');

      this.volumeSlider = document.createElement('input');
      this.volumeSlider.type = 'range';
      this.volumeSlider.min = '0';
      this.volumeSlider.max = '100';
      this.volumeSlider.value = '100';
      this.volumeSlider.className = 'audio-volume-slider';

      this.volumeGroup.append(this.volumeBtn, this.volumeSlider);

      this.controlsEl.append(
        this.trackInfo,
        this.prevBtn,
        this.playBtn,
        this.nextBtn,
        this.volumeGroup
      );

      this.container.append(this.iconWrapper, this.controlsEl);
      document.body.appendChild(this.container);

      // Events
      this.iconWrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!this.userInteracted) {
          this.initAudio();
        } else {
          this.togglePlay();
        }
      });
      this.playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePlay();
      });
      this.prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.previous();
      });
      this.nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.next();
      });
      this.volumeSlider.addEventListener('input', (e) => {
        e.stopPropagation();
        this.setVolume(e.target.value / 100);
      });
      this.volumeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMute();
      });

      this.setVolume(1.0);
    }

    createButton(content, className) {
      const btn = document.createElement('button');
      btn.className = className;
      btn.textContent = content;
      return btn;
    }

    togglePlay() {
      if (!this.userInteracted) {
        this.initAudio();
        this.userInteracted = true;
      }

      if (this.isPlaying) {
        this.pause();
      } else {
        this.resume();
      }
    }

    play(trackPath) {
      if (!this.userInteracted) {
        // Queue the track to play after user interaction
        this.pendingTrack = trackPath;
        this.trackTitle.textContent = 'Ready to play';
        this.trackStatus.textContent = 'Move mouse to start';
        this.playBtn.textContent = '▶';
        this.container.classList.remove('playing');
        this.isPlaying = false;
        return;
      }

      if (this.currentTrack) {
        this.currentTrack.pause();
        this.currentTrack.removeEventListener('ended', this.handleTrackEnd);
      }

      const url = `${this.options.musicPath}/${trackPath}`;
      this.currentTrack = new Audio(url);
      this.currentTrack.volume = this.volume;

      // Add ended event listener for auto-continue
      this.handleTrackEnd = () => {
        if (this.autoPlay) {
          this.next();
        }
      };
      this.currentTrack.addEventListener('ended', this.handleTrackEnd);

      this.currentTrack.play().catch(e => console.warn('Failed to play:', e.message));

      this.isPlaying = true;
      this.playBtn.textContent = '⏸';
      this.container.classList.add('playing');
      this.setTitle(trackPath);
      this.trackStatus.textContent = 'Playing';
      this.pendingTrack = null;
    }

    resume() {
      if (this.currentTrack) {
        this.currentTrack.play().catch(console.warn);
        this.isPlaying = true;
        this.playBtn.textContent = '⏸';
        this.container.classList.add('playing');
        this.trackStatus.textContent = 'Playing';
      }
    }

    pause() {
      if (this.currentTrack) {
        this.currentTrack.pause();
        this.isPlaying = false;
        this.playBtn.textContent = '▶';
        this.container.classList.remove('playing');
        this.trackStatus.textContent = 'Paused';
      }
    }

    next() {
      if (this.playlist.length === 0) return;

      this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
      this.play(this.playlist[this.currentIndex]);
    }

    previous() {
      if (this.playlist.length === 0) return;

      this.currentIndex = this.currentIndex - 1;
      if (this.currentIndex < 0) this.currentIndex = this.playlist.length - 1;
      this.play(this.playlist[this.currentIndex]);
    }

    setPlaylist(tracks) {
      this.playlist = Array.isArray(tracks) ? tracks : [tracks];
      this.currentIndex = -1;
    }

    shuffleArray(array) {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    playPlaylist(tracks, options = {}) {
      // Support both old signature (tracks, startIndex) and new (tracks, {random, startIndex})
      let startIndex = 0;
      let random = false;

      if (typeof options === 'number') {
        // Old signature: playPlaylist(tracks, startIndex)
        startIndex = options;
      } else {
        // New signature: playPlaylist(tracks, {random, startIndex})
        random = options.random || false;
        startIndex = options.startIndex || 0;
      }

      let playlistToUse = Array.isArray(tracks) ? tracks : [tracks];

      if (random) {
        playlistToUse = this.shuffleArray(playlistToUse);
        startIndex = 0; // Always start at beginning of shuffled playlist
      }

      this.playlist = playlistToUse;
      this.currentIndex = startIndex;
      this.play(this.playlist[this.currentIndex]);
    }

    setAutoPlay(enabled) {
      this.autoPlay = enabled;
    }

    setTitle(path) {
      const name = path.split('/').pop().replace(/\.[^/.]+$/, '') || 'Unknown';
      this.trackTitle.textContent = name;
    }

    playSfx(sfxPath, customVolume = null) {
      if (!this.userInteracted) return;

      const url = `${this.options.sfxPath}/${sfxPath}`;
      const audio = new Audio(url);
      audio.volume = customVolume !== null ? customVolume : this.volume;
      audio.play().catch(() => { });
    }

    setVolume(v) {
      this.volume = v;
      if (this.currentTrack) this.currentTrack.volume = v;
      this.volumeSlider.value = v * 100;
      this.updateVolumeIcon(v);
    }

    toggleMute() {
      if (this.volume > 0) {
        this.prevVolume = this.volume;
        this.setVolume(0);
      } else {
        this.setVolume(this.prevVolume || 1.0);
      }
    }

    updateVolumeIcon(v) {
      const vol = v * 100;
      if (vol === 0) this.volumeBtn.textContent = '🔇';
      else if (vol < 50) this.volumeBtn.textContent = '🔉';
      else this.volumeBtn.textContent = '🔊';
    }

    setCorner(corner) {
      const isLeft = corner.includes('left');
      const isTop = corner.includes('top');

      this.container.classList.toggle('corner-left', isLeft);
      this.container.classList.toggle('corner-right', !isLeft);

      const pos = {
        top: isTop ? '20px' : 'auto',
        bottom: isTop ? 'auto' : '20px',
        left: isLeft ? '20px' : 'auto',
        right: isLeft ? 'auto' : '20px'
      };

      Object.assign(this.container.style, pos);
    }

    setTheme(theme) {
      document.body.classList.toggle('audio-light', theme === 'light');
    }

    setAccentColor(color) {
      // Convert hex to HSL for CSS custom property
      const hsl = this.hexToHSL(color);
      document.documentElement.style.setProperty('--audio-accent', hsl);
    }

    hexToHSL(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return '142 76% 36%';

      let r = parseInt(result[1], 16) / 255;
      let g = parseInt(result[2], 16) / 255;
      let b = parseInt(result[3], 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;

      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }

      h = Math.round(h * 360);
      s = Math.round(s * 100);
      l = Math.round(l * 100);

      return `${h} ${s}% ${l}%`;
    }
  }

  window.AudioPlayer = AudioPlayer;
})();