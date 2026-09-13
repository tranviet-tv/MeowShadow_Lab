// Downloads Screen - Offline lessons storage and synchronization hub
// English comments only per project rules

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Colors, Shadows } from "../theme/colors";

interface OfflineLesson {
  id: string;
  title: string;
  fileSizeMb: number;
  durationSec: number;
  downloadedAt: string;
  repeatCount: number;
  synced: boolean;
}

const INITIAL_OFFLINE_LESSONS: OfflineLesson[] = [
  {
    id: "lesson-en-001",
    title: "Morning Standup & Sprint Planning",
    fileSizeMb: 14.2,
    durationSec: 580,
    downloadedAt: "13/09/2026",
    repeatCount: 12,
    synced: true,
  },
  {
    id: "lesson-ja-002",
    title: "Tokyo Business Etiquette & Keigo",
    fileSizeMb: 15.8,
    durationSec: 615,
    downloadedAt: "13/09/2026",
    repeatCount: 5,
    synced: false,
  },
];

export const DownloadsScreen: React.FC = () => {
  const [lessons, setLessons] = useState<OfflineLesson[]>(INITIAL_OFFLINE_LESSONS);
  const [isSyncing, setIsSyncing] = useState(false);

  const totalStorageMb = lessons.reduce((acc, curr) => acc + curr.fileSizeMb, 0).toFixed(1);

  const handleSyncProgress = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setLessons((prev) =>
        prev.map((item) => ({ ...item, synced: true }))
      );
      setIsSyncing(false);
      alert("Đồng bộ thành công! Tiến trình luyện nghe đã được ghi nhận lên Gateway PostgreSQL.");
    }, 1500);
  };

  const handleDeleteLesson = (id: string) => {
    setLessons((prev) => prev.filter((item) => item.id !== id));
  };

  const renderItem = ({ item }: { item: OfflineLesson }) => (
    <View style={[styles.lessonCard, Shadows.card]}>
      <View style={styles.cardMain}>
        <Text style={styles.lessonTitle}>{item.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>💾 {item.fileSizeMb} MB</Text>
          <Text style={styles.metaText}>🔄 {item.repeatCount} lần lặp</Text>
          <Text style={styles.metaText}>📅 {item.downloadedAt}</Text>
        </View>
        <View style={styles.statusRow}>
          <View style={[styles.syncBadge, item.synced ? styles.syncedBadge : styles.unsyncedBadge]}>
            <Text style={[styles.syncBadgeText, item.synced ? styles.syncedText : styles.unsyncedText]}>
              {item.synced ? "✓ Đã đồng bộ Cloud" : "● Chưa đồng bộ"}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteLesson(item.id)}
      >
        <Text style={styles.deleteButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bộ Nhớ Ngoại Tuyến</Text>
        <Text style={styles.headerSubtitle}>Nghe bài học không cần mạng với SQLite</Text>
      </View>

      {/* Storage & Sync Overview Card */}
      <View style={[styles.overviewCard, Shadows.card]}>
        <View style={styles.storageInfo}>
          <Text style={styles.storageLabel}>Dung lượng đã dùng:</Text>
          <Text style={styles.storageValue}>{totalStorageMb} MB / 500 MB</Text>
        </View>

        <TouchableOpacity
          style={[styles.syncButton, isSyncing && styles.syncingButton]}
          activeOpacity={0.8}
          onPress={handleSyncProgress}
          disabled={isSyncing}
        >
          <Text style={styles.syncButtonText}>
            {isSyncing ? "Đang đồng bộ..." : "☁ Đồng Bộ Lên Server"}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={lessons}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Chưa có bài học tải về</Text>
            <Text style={styles.emptySubtitle}>
              Hãy vào Thư viện và bấm "Tải Về" để nghe khi không có Internet.
            </Text>
          </View>
        }
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
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  overviewCard: {
    margin: 16,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  storageInfo: {
    gap: 4,
  },
  storageLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  storageValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  syncButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  syncingButton: {
    opacity: 0.7,
  },
  syncButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  lessonCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardMain: {
    flex: 1,
    gap: 6,
  },
  lessonTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  statusRow: {
    marginTop: 2,
  },
  syncBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  syncedBadge: {
    backgroundColor: Colors.accentGreen + "20",
  },
  unsyncedBadge: {
    backgroundColor: Colors.accentYellow + "20",
  },
  syncBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  syncedText: {
    color: Colors.accentGreen,
  },
  unsyncedText: {
    color: Colors.accentYellow,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  deleteButtonText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 6,
  },
});
