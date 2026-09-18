// KaraokeSubtitleStream - Synchronized dialogue scroll viewer with real-time active highlighting
// English comments only per project rules

import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { usePlayerStore } from "../stores/playerStore";
import { Colors } from "../theme/colors";

export const KaraokeSubtitleStream: React.FC = () => {
  const { subtitles, activeSubtitleIndex, jumpToSubtitle } = usePlayerStore();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Smoothly scroll active subtitle into approximate center view
    if (scrollViewRef.current && activeSubtitleIndex >= 0) {
      const estimatedItemHeight = 90;
      scrollViewRef.current.scrollTo({
        y: Math.max(0, activeSubtitleIndex * estimatedItemHeight - 120),
        animated: true,
      });
    }
  }, [activeSubtitleIndex]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {subtitles.map((sub, idx) => {
        const isActive = idx === activeSubtitleIndex;
        return (
          <TouchableOpacity
            key={sub.id}
            activeOpacity={0.75}
            onPress={() => jumpToSubtitle(idx)}
            style={[styles.chunkCard, isActive && styles.activeChunkCard]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.timeTag, isActive && styles.activeTimeTag]}>
                {formatTime(sub.startTimeSec)} – {formatTime(sub.endTimeSec)}
              </Text>
              {isActive && (
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>🔊 Đang Đọc</Text>
                </View>
              )}
            </View>

            {/* Target Language Line */}
            <Text style={[styles.targetText, isActive && styles.activeTargetText]}>
              {sub.textTarget || (sub as any).text || sub.textVi}
            </Text>

            {/* Vietnamese Meaning Line */}
            {Boolean(sub.textVi && sub.textTarget && sub.textVi !== sub.textTarget) && (
              <Text style={[styles.viText, isActive && styles.activeViText]}>
                {sub.textVi}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 12,
  },
  chunkCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeChunkCard: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  cardHeader: {
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
    fontWeight: "700",
  },
  activePill: {
    backgroundColor: Colors.primaryGlow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: "700",
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
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  activeViText: {
    color: Colors.textSecondary,
  },
});
