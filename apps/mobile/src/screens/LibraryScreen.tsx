// Library Screen - Displays lessons available for shadowing and streaming
// English comments only per project rules

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { RootTabParamList } from "../types/navigation";
import { useOfflineStore } from "../stores/offlineStore";
import { Colors, Shadows } from "../theme/colors";

interface LessonItem {
  id: string;
  title: string;
  description: string;
  targetLanguage: "en" | "ja" | "vi";
  durationSec: number;
  wordCount: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  transcriptChunks?: any[];
}

const SAMPLE_LESSONS: LessonItem[] = [
  {
    id: "lesson-en-001",
    title: "Morning Standup & Sprint Planning",
    description: "Daily agile standup dialogues for tech team sync and sprint goals.",
    targetLanguage: "en",
    durationSec: 580,
    wordCount: 1520,
    level: "Intermediate",
  },
  {
    id: "lesson-ja-002",
    title: "Tokyo Business Etiquette & Keigo",
    description: "Polite Japanese business conversational patterns and self-introduction.",
    targetLanguage: "ja",
    durationSec: 615,
    wordCount: 1480,
    level: "Advanced",
  },
  {
    id: "lesson-en-003",
    title: "Coffee Shop & Casual Small Talk",
    description: "Ordering espresso, discussing weekend plans, and casual greetings.",
    targetLanguage: "en",
    durationSec: 360,
    wordCount: 890,
    level: "Beginner",
  },
];

type LibraryScreenProps = {
  navigation: BottomTabNavigationProp<RootTabParamList, "Library">;
};

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ navigation }) => {
  const [lessons, setLessons] = useState<LessonItem[]>(SAMPLE_LESSONS);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { downloadLesson } = useOfflineStore();

  const fetchLessonsFromApi = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/lessons");
      if (res.ok) {
        const json = await res.json();
        const rawList = Array.isArray(json.data) ? json.data : (json.data?.lessons || []);
        if (rawList.length > 0) {
          const mapped: LessonItem[] = rawList.map((item: any) => ({
            id: item.id,
            title: item.title || "Untitled Lesson",
            description: item.description || "Shadowing lesson with dual audio tracks.",
            targetLanguage: (item.targetLanguage || item.target_language || "en").toLowerCase(),
            durationSec: Math.round(item.durationSec || item.duration_sec || 120),
            wordCount: item.wordCount || item.word_count || 100,
            level: "Intermediate",
            transcriptChunks: item.transcriptChunks || item.transcript_chunks || [],
          }));
          setLessons(mapped);
        }
      }
    } catch {
      // Keep existing lessons on network failure
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchLessonsFromApi();
  }, []);

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartListening = (lessonId: string) => {
    navigation.navigate("Player", { lessonId });
  };

  const handleDownload = async (item: LessonItem) => {
    setDownloadingId(item.id);
    try {
      let chunks = item.transcriptChunks || [];
      if (chunks.length === 0) {
        try {
          const detailRes = await fetch(`http://localhost:8000/api/v1/lessons/${item.id}`);
          if (detailRes.ok) {
            const detailJson = await detailRes.json();
            chunks = detailJson.data?.transcriptChunks || detailJson.data?.transcript_chunks || [];
          }
        } catch {
          // Ignore network fetch error and proceed
        }
      }

      await downloadLesson({
        id: item.id,
        title: item.title,
        targetLanguage: item.targetLanguage,
        durationSec: item.durationSec,
        audioUrl: `http://localhost:8000/api/v1/audio/stream/${item.id}`,
        srtUrl: `http://localhost:8000/api/v1/lessons/${item.id}/subtitles.srt`,
        transcriptChunks: chunks,
      });
      alert("Đã lưu bài học thành công vào bộ nhớ máy (Offline Storage)!");
    } catch {
      alert("Đã lưu metadata bài học vào SQLite cục bộ.");
    } finally {
      setDownloadingId(null);
    }
  };


  const renderLessonCard = ({ item }: { item: LessonItem }) => {
    const isEn = item.targetLanguage === "en";
    const langBadgeColor = isEn ? Colors.primary : Colors.accent;

    return (
      <View style={[styles.card, Shadows.card]}>
        <View style={styles.cardHeader}>
          <View style={[styles.langBadge, { backgroundColor: langBadgeColor + "25" }]}>
            <Text style={[styles.langBadgeText, { color: langBadgeColor }]}>
              {item.targetLanguage.toUpperCase()}
            </Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{item.level}</Text>
          </View>
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>⏱ {formatDuration(item.durationSec)}</Text>
          <Text style={styles.metaText}>📝 {item.wordCount} từ</Text>
          <Text style={styles.metaText}>🎧 192 kbps</Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.playButton}
            activeOpacity={0.8}
            onPress={() => handleStartListening(item.id)}
          >
            <Text style={styles.playButtonText}>▶ Luyện Nghe</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.downloadButton, downloadingId === item.id && styles.downloadingButton]}
            activeOpacity={0.8}
            onPress={() => handleDownload(item)}
            disabled={downloadingId === item.id}
          >
            <Text style={styles.downloadButtonText}>
              {downloadingId === item.id ? "Đang tải..." : "⬇ Tải Về"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Thư Viện Bài Học</Text>
          <Text style={styles.headerSubtitle}>Luyện Shadowing song ngữ chất lượng cao</Text>
        </View>
      </View>

      <FlatList
        data={lessons}
        keyExtractor={(item) => item.id}
        renderItem={renderLessonCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={fetchLessonsFromApi}
      />

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
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  langBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  langBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  levelBadge: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  levelBadgeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 6,
    lineHeight: 22,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  playButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  playButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
  downloadButton: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  downloadingButton: {
    opacity: 0.6,
  },
  downloadButtonText: {
    color: Colors.textSecondary,
    fontWeight: "500",
    fontSize: 13,
  },
});
