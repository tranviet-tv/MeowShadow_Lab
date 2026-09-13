// Player Screen - Interactive Karaoke Player, Subtitle Stream & Lock-screen Player Preview
// English comments only per project rules

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  DimensionValue,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { RootTabParamList } from "../types/navigation";
import { usePlayerStore } from "../stores/playerStore";
import { LockScreenPlayer } from "../components/LockScreenPlayer";
import { KaraokeSubtitleStream } from "../components/KaraokeSubtitleStream";
import { Colors, Shadows } from "../theme/colors";

type PlayerScreenRouteProp = RouteProp<RootTabParamList, "Player">;

export const PlayerScreen: React.FC<{ route?: PlayerScreenRouteProp }> = () => {
  const [activeTab, setActiveTab] = useState<"karaoke" | "lockscreen">("karaoke");

  const {
    currentLesson,
    currentTimeSec,
    durationSec,
    isPlaying,
    repeatCount,
    playbackRate,
    togglePlay,
    seek,
    repeatCurrentChunk,
    setPlaybackRate,
  } = usePlayerStore();

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent: DimensionValue = `${Math.min(
    100,
    Math.round((currentTimeSec / (durationSec || 1)) * 100)
  )}%`;

  const cycleSpeed = () => {
    const speeds = [0.8, 1.0, 1.2, 1.5];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    setPlaybackRate(speeds[nextIdx]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with mode switcher */}
      <View style={styles.header}>
        <View style={styles.titleInfo}>
          <Text style={styles.headerLabel}>Trình Phát Di Động</Text>
          <Text style={styles.lessonTitle} numberOfLines={1}>
            {currentLesson?.title || "Morning Standup & Sprint Planning"}
          </Text>
        </View>

        {/* View Mode Toggle: Karaoke View vs Lockscreen Widget */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === "karaoke" && styles.toggleBtnActive]}
            onPress={() => setActiveTab("karaoke")}
          >
            <Text
              style={[
                styles.toggleBtnText,
                activeTab === "karaoke" && styles.toggleBtnTextActive,
              ]}
            >
              Karaoke
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === "lockscreen" && styles.toggleBtnActive]}
            onPress={() => setActiveTab("lockscreen")}
          >
            <Text
              style={[
                styles.toggleBtnText,
                activeTab === "lockscreen" && styles.toggleBtnTextActive,
              ]}
            >
              Lock-Screen
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.body}>
        {activeTab === "karaoke" ? (
          <KaraokeSubtitleStream />
        ) : (
          <View style={styles.lockscreenPreviewContainer}>
            <Text style={styles.lockscreenHelperText}>
              Giao diện widget điều khiển tự động kích hoạt ngoài màn hình khóa iOS / Android khi khóa máy:
            </Text>
            <LockScreenPlayer />
          </View>
        )}
      </View>

      {/* Persistent Bottom Controls Bar */}
      <View style={[styles.controlsContainer, Shadows.card]}>
        {/* Progress Timeline */}
        <View style={styles.progressRow}>
          <Text style={styles.timeLabel}>{formatTime(currentTimeSec)}</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: progressPercent }]} />
          </View>
          <Text style={styles.timeLabel}>{formatTime(durationSec)}</Text>
        </View>

        {/* Buttons Row */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity style={styles.speedButton} onPress={cycleSpeed}>
            <Text style={styles.speedButtonText}>{playbackRate}x</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.seekButton} onPress={() => seek(-5)}>
            <Text style={styles.seekButtonText}>-5s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.playButton, Shadows.glow]}
            activeOpacity={0.8}
            onPress={togglePlay}
          >
            <Text style={styles.playIcon}>{isPlaying ? "❚❚" : "▶"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.seekButton} onPress={() => seek(5)}>
            <Text style={styles.seekButtonText}>+5s</Text>
          </TouchableOpacity>

          {/* Repeat Chunk Button (P0 Shadowing Feature) */}
          <TouchableOpacity
            style={[styles.repeatButton, Shadows.glow]}
            activeOpacity={0.8}
            onPress={repeatCurrentChunk}
          >
            <Text style={styles.repeatButtonIcon}>↺</Text>
            <Text style={styles.repeatButtonText}>Lặp lại ({repeatCount})</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleInfo: {
    flex: 1,
    marginRight: 10,
  },
  headerLabel: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: 2,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  toggleBtnTextActive: {
    color: "#FFF",
  },
  body: {
    flex: 1,
  },
  lockscreenPreviewContainer: {
    flex: 1,
    justifyContent: "center",
  },
  lockscreenHelperText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  controlsContainer: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  timeLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontVariant: ["tabular-nums"],
    width: 36,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  speedButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
  },
  speedButtonText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  seekButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
  },
  seekButtonText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: {
    color: "#FFF",
    fontSize: 20,
    marginLeft: 2,
  },
  repeatButton: {
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentGlow,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  repeatButtonIcon: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: "700",
  },
  repeatButtonText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },
});
