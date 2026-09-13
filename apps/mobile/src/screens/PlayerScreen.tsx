// Player Screen - Full interactive audio player and karaoke subtitle viewer
// English comments only per project rules

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { RootTabParamList } from "../types/navigation";
import { Colors, Shadows } from "../theme/colors";

type PlayerScreenRouteProp = RouteProp<RootTabParamList, "Player">;

interface SubtitleLineItem {
  id: string;
  startTimeSec: number;
  endTimeSec: number;
  lang: string;
  textVi: string;
  textTarget: string;
}

const SAMPLE_SUBTITLES: SubtitleLineItem[] = [
  {
    id: "sub-1",
    startTimeSec: 0.0,
    endTimeSec: 4.2,
    lang: "en",
    textVi: "Chào buổi sáng mọi người, cảm ơn vì đã tham gia buổi họp đúng giờ.",
    textTarget: "Good morning everyone, thank you for joining the standup on time.",
  },
  {
    id: "sub-2",
    startTimeSec: 4.5,
    endTimeSec: 9.8,
    lang: "en",
    textVi: "Hôm nay chúng ta sẽ xem xét tiến độ của sprint và các vấn đề cần giải quyết.",
    textTarget: "Today we will review our sprint progress and discuss any blockers.",
  },
  {
    id: "sub-3",
    startTimeSec: 10.2,
    endTimeSec: 15.6,
    lang: "en",
    textVi: "Tính năng phát audio chạy nền trên điện thoại đã được kết nối xong.",
    textTarget: "The background audio playback service on mobile is fully wired up.",
  },
  {
    id: "sub-4",
    startTimeSec: 16.0,
    endTimeSec: 21.4,
    lang: "en",
    textVi: "Bạn có thể bấm nút Repeat để nhại lại câu thoại vừa nghe ngay lập tức.",
    textTarget: "You can hit the Repeat button to immediately shadow the current chunk.",
  },
];

export const PlayerScreen: React.FC<{ route?: PlayerScreenRouteProp }> = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(6.2);
  const [activeSubIndex, setActiveSubIndex] = useState(1);
  const [repeatCount, setRepeatCount] = useState(2);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  const durationSec = 21.4;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (offsetSec: number) => {
    const nextTime = Math.max(0, Math.min(durationSec, currentTimeSec + offsetSec));
    setCurrentTimeSec(nextTime);
  };

  const handleRepeatChunk = () => {
    const currentSub = SAMPLE_SUBTITLES[activeSubIndex];
    if (currentSub) {
      setCurrentTimeSec(currentSub.startTimeSec);
      setRepeatCount((prev) => prev + 1);
    }
  };

  const handleSelectSubtitle = (index: number) => {
    setActiveSubIndex(index);
    setCurrentTimeSec(SAMPLE_SUBTITLES[index].startTimeSec);
  };

  const cycleSpeed = () => {
    const speeds = [0.8, 1.0, 1.2, 1.5];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
  };

  const progressPercent: `${number}%` = `${Math.min(100, Math.round((currentTimeSec / durationSec) * 100))}%`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Đang Luyện Nghe</Text>
        <Text style={styles.lessonTitle}>Morning Standup & Sprint Planning</Text>
      </View>

      {/* Synchronized Subtitles Stream */}
      <ScrollView style={styles.subtitlesContainer} contentContainerStyle={styles.subtitlesContent}>
        {SAMPLE_SUBTITLES.map((sub, idx) => {
          const isActive = idx === activeSubIndex;
          return (
            <TouchableOpacity
              key={sub.id}
              activeOpacity={0.7}
              onPress={() => handleSelectSubtitle(idx)}
              style={[
                styles.subtitleCard,
                isActive && styles.activeSubtitleCard,
              ]}
            >
              <View style={styles.subtitleHeader}>
                <Text style={[styles.timeTag, isActive && styles.activeTimeTag]}>
                  {formatTime(sub.startTimeSec)} - {formatTime(sub.endTimeSec)}
                </Text>
                {isActive && (
                  <View style={styles.speakingBadge}>
                    <Text style={styles.speakingBadgeText}>Đang đọc</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.targetText, isActive && styles.activeTargetText]}>
                {sub.textTarget}
              </Text>
              <Text style={[styles.viText, isActive && styles.activeViText]}>
                {sub.textVi}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Audio Playback Controls Bar */}
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
          <TouchableOpacity style={styles.secondaryButton} onPress={cycleSpeed}>
            <Text style={styles.speedButtonText}>{playbackSpeed}x</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.seekButton} onPress={() => handleSeek(-5)}>
            <Text style={styles.seekButtonText}>-5s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.playButton, Shadows.glow]}
            activeOpacity={0.8}
            onPress={handleTogglePlay}
          >
            <Text style={styles.playIcon}>{isPlaying ? "❚❚" : "▶"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.seekButton} onPress={() => handleSeek(5)}>
            <Text style={styles.seekButtonText}>+5s</Text>
          </TouchableOpacity>

          {/* Repeat Chunk Button (Key Shadowing Feature) */}
          <TouchableOpacity
            style={[styles.repeatButton, Shadows.glow]}
            activeOpacity={0.8}
            onPress={handleRepeatChunk}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLabel: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  lessonTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: 2,
  },
  subtitlesContainer: {
    flex: 1,
  },
  subtitlesContent: {
    padding: 16,
    gap: 12,
  },
  subtitleCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeSubtitleCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceLight,
  },
  subtitleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  timeTag: {
    fontSize: 11,
    color: Colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  activeTimeTag: {
    color: Colors.primary,
    fontWeight: "600",
  },
  speakingBadge: {
    backgroundColor: Colors.primaryGlow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  speakingBadgeText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "600",
  },
  targetText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 4,
  },
  activeTargetText: {
    color: Colors.textPrimary,
  },
  viText: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  activeViText: {
    color: Colors.textSecondary,
  },
  controlsContainer: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
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
  secondaryButton: {
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
    width: 58,
    height: 58,
    borderRadius: 29,
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
    borderWidth: 1,
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
