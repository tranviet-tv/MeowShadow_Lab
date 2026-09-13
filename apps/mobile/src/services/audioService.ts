// Audio Service - Native background audio playback engine using expo-av
// English comments only per project rules

import { Audio, AVPlaybackStatus, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";

export interface PlaybackState {
  isLoaded: boolean;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  rate: number;
  shouldPlay: boolean;
}

export type PlaybackStatusListener = (state: PlaybackState) => void;

class AudioPlaybackService {
  private sound: Audio.Sound | null = null;
  private isConfigured = false;
  private statusListeners: Set<PlaybackStatusListener> = new Set();
  private currentUri: string | null = null;

  /**
   * Configure native audio session for background playback and silent mode override
   */
  async configureAudioSession(): Promise<void> {
    if (this.isConfigured) return;

    try {
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
      });
      this.isConfigured = true;
    } catch (error) {
      console.warn("Audio session setup notice:", error);
    }
  }

  /**
   * Subscribe to playback status updates
   */
  addStatusListener(listener: PlaybackStatusListener): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyListeners(status: AVPlaybackStatus): void {
    if (!status.isLoaded) {
      const unloadedState: PlaybackState = {
        isLoaded: false,
        isPlaying: false,
        positionMillis: 0,
        durationMillis: 0,
        rate: 1.0,
        shouldPlay: false,
      };
      this.statusListeners.forEach((fn) => fn(unloadedState));
      return;
    }

    const state: PlaybackState = {
      isLoaded: true,
      isPlaying: status.isPlaying,
      positionMillis: status.positionMillis,
      durationMillis: status.durationMillis ?? 0,
      rate: status.rate,
      shouldPlay: status.shouldPlay,
    };
    this.statusListeners.forEach((fn) => fn(state));
  }

  /**
   * Load audio from remote URL or local file path
   */
  async loadAudio(uri: string, initialPositionMillis = 0): Promise<void> {
    await this.configureAudioSession();

    if (this.sound) {
      try {
        await this.sound.unloadAsync();
      } catch (err) {
        // Ignore unloading errors if already released
      }
      this.sound = null;
    }

    this.currentUri = uri;

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: false,
          positionMillis: initialPositionMillis,
          progressUpdateIntervalMillis: 100,
        },
        (status) => this.notifyListeners(status)
      );

      this.sound = sound;
    } catch (error) {
      console.error("Failed to load audio track:", error);
      throw error;
    }
  }

  /**
   * Start or resume playback
   */
  async play(): Promise<void> {
    if (!this.sound) return;
    try {
      await this.sound.playAsync();
    } catch (error) {
      console.error("Audio play failed:", error);
    }
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    if (!this.sound) return;
    try {
      await this.sound.pauseAsync();
    } catch (error) {
      console.error("Audio pause failed:", error);
    }
  }

  /**
   * Toggle between play and pause
   */
  async togglePlay(): Promise<void> {
    if (!this.sound) return;
    const status = await this.sound.getStatusAsync();
    if (status.isLoaded) {
      if (status.isPlaying) {
        await this.pause();
      } else {
        await this.play();
      }
    }
  }

  /**
   * Seek to specific position in milliseconds
   */
  async seekToMillis(positionMillis: number): Promise<void> {
    if (!this.sound) return;
    try {
      await this.sound.setPositionAsync(Math.max(0, positionMillis));
    } catch (error) {
      console.error("Audio seek failed:", error);
    }
  }

  /**
   * Set playback rate speed (e.g. 0.8x, 1.0x, 1.25x, 1.5x)
   */
  async setPlaybackRate(rate: number): Promise<void> {
    if (!this.sound) return;
    try {
      await this.sound.setRateAsync(rate, true);
    } catch (error) {
      console.error("Audio rate change failed:", error);
    }
  }

  /**
   * Unload and clean up audio resources
   */
  async unload(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.unloadAsync();
      } catch (err) {
        // Ignore
      }
      this.sound = null;
      this.currentUri = null;
    }
  }
}

export const audioService = new AudioPlaybackService();
