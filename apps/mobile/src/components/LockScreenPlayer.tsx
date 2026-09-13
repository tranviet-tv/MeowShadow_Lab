// LockScreenPlayer - Native Lock-screen & Media Notification preview widget
// English comments only per project rules

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  DimensionValue,
} from "react-native";
import { usePlayerStore } from "../stores/playerStore";
import { Colors, Shadows } from "../theme/colors";

export const LockScreenPlayer: React.FC = () => {
  const {
    currentLesson,
    subtitles,
    activeSubtitleIndex,
    currentTimeSec,
    durationSec,
    isPlaying,
    repeatCount,
    togglePlay,
    seek,
    repeatCurrentChunk,
  } = usePlayerStore();

  const activeSub = subtitles[activeSubtitleIndex];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent: DimensionValue = `${Math.min(
    100,
    Math.round((currentTimeSec / (durationSec || 1)) * 100)
  )}%`;

  return (
    <View style={[styles.container, Shadows.card]}>
      {/* Top Banner: Device Lock-Screen / Notification Indicator */}
      <View style={styles.topBanner}>
        <View style={styles.deviceStatus}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.bannerText}>Màn Hình Khóa • Now Playing</Text>
        </View>
        <View style={styles.backgroundPill}>
          <View style={styles.greenDot} />
          <Text style={styles.backgroundPillText}>Background Audio</Text>
        </View>
      </View>

      {/* Track Info Card */}
      <View style={styles.contentRow}>
        {/* Cover Art / Icon */}
        <View style={[styles.coverArt, Shadows.glow]}>
          <Text style={styles.coverEmoji}>🐾</Text>
        </View>

        {/* Title and Active Subtitle Ticker */}
        <View style={styles.infoCol}>
          <View style={styles.titleRow}>
            <Text style={styles.lessonTitle} numberOfLines={1}>
              {currentLesson?.title || "Chưa chọn bài học"}
            </Text>
            <View style={styles.langBadge}>
              <Text style={styles.langBadgeText}>
                {currentLesson?.targetLanguage.toUpperCase() || "EN"}
              </Text>
            </View>
          </View>

          {/* Active Speaking Sentence on Lockscreen */}
          <Text style={styles.activeDialogue} numberOfLines={2}>
            {activeSub?.textTarget || "Đang chờ phát..."}
          </Text>
        </View>
      </View>

      {/* Progress Slider */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: progressPercent }]} />
        </View>
        <View style={styles.timeLabelsRow}>
          <Text style={styles.timeLabelText}>{formatTime(currentTimeSec)}</Text>
          <Text style={styles.timeLabelText}>{formatTime(durationSec)}</Text>
        </View>
      </View>

      {/* Lockscreen Controls Row */}
      <View style={styles.controlsRow}>
        {/* Backward 5s */}
        <TouchableOpacity
          style={styles.circleButton}
          activeOpacity={0.7}
          onPress={() => seek(-5)}
        >
          <Text style={styles.circleButtonText}>-5s</Text>
        </TouchableOpacity>

        {/* Play/Pause */}
        <TouchableOpacity
          style={[styles.primaryPlayButton, Shadows.glow]}
          activeOpacity={0.8}
          onPress={togglePlay}
        >
          <Text style={styles.primaryPlayIcon}>{isPlaying ? "❚❚" : "▶"}</Text>
        </TouchableOpacity>

        {/* Forward 5s */}
        <TouchableOpacity
          style={styles.circleButton}
          activeOpacity={0.7}
          onPress={() => seek(5)}
        >
          <Text style={styles.circleButtonText}>+5s</Text>
        </TouchableOpacity>

        {/* Repeat Chunk Button (P0 Shadowing Feature) */}
        <TouchableOpacity
          style={[styles.repeatChunkButton, Shadows.glow]}
          activeOpacity={0.8}
          onPress={repeatCurrentChunk}
        >
          <Text style={styles.repeatIcon}>↺</Text>
          <View>
            <Text style={styles.repeatTitle}>Repeat Chunk</Text>
            <Text style={styles.repeatSubtitle}>Nhại lại ({repeatCount})</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 16,
    marginVertical: 10,
  },
  topBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  deviceStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  lockIcon: {
    fontSize: 12,
  },
  bannerText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  backgroundPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.accentGreen + "20",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accentGreen,
  },
  backgroundPillText: {
    fontSize: 10,
    color: Colors.accentGreen,
    fontWeight: "600",
  },
  contentRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  coverArt: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  coverEmoji: {
    fontSize: 26,
  },
  infoCol: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lessonTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  langBadge: {
    backgroundColor: Colors.primaryGlow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  langBadgeText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: "700",
  },
  activeDialogue: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  progressContainer: {
    gap: 4,
    marginBottom: 14,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  timeLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeLabelText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  circleButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  primaryPlayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryPlayIcon: {
    color: "#FFF",
    fontSize: 18,
    marginLeft: 2,
  },
  repeatChunkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.accentGlow,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  repeatIcon: {
    fontSize: 18,
    color: Colors.accent,
    fontWeight: "700",
  },
  repeatTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  repeatSubtitle: {
    fontSize: 10,
    color: Colors.accent,
  },
});
