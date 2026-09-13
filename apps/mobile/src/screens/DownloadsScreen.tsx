// Downloads Screen - Connected to SQLite Local Storage and Cloud Sync
// English comments only per project rules

import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useOfflineStore } from "../stores/offlineStore";
import { LocalLessonRecord } from "../db/sqlite";
import { Colors, Shadows } from "../theme/colors";

export const DownloadsScreen: React.FC = () => {
  const {
    lessons,
    isSyncing,
    totalStorageMb,
    fetchOfflineLessons,
    deleteOfflineLesson,
    syncProgress,
  } = useOfflineStore();

  useEffect(() => {
    fetchOfflineLessons();
  }, [fetchOfflineLessons]);

  const handleSync = async () => {
    const count = await syncProgress();
    alert(`Đồng bộ thành công! ${count} phiên luyện nghe đã được ghi nhận lên Gateway PostgreSQL.`);
  };

  const renderItem = ({ item }: { item: LocalLessonRecord }) => {
    const estimatedMb = ((item.duration_sec / 60) * 1.4).toFixed(1);
    const dateFormatted = new Date(item.downloaded_at).toLocaleDateString("vi-VN");

    return (
      <View style={[styles.lessonCard, Shadows.card]}>
        <View style={styles.cardMain}>
          <View style={styles.titleRow}>
            <Text style={styles.lessonTitle}>{item.title}</Text>
            <View style={styles.langPill}>
              <Text style={styles.langPillText}>{item.target_language.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>💾 {estimatedMb} MB</Text>
            <Text style={styles.metaText}>⏱ {Math.round(item.duration_sec)}s</Text>
            <Text style={styles.metaText}>📅 {dateFormatted}</Text>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.sqliteBadge}>
              <Text style={styles.sqliteBadgeText}>✓ Lưu trong SQLite Cục Bộ</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteOfflineLesson(item.id)}
        >
          <Text style={styles.deleteButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bộ Nhớ Ngoại Tuyến</Text>
        <Text style={styles.headerSubtitle}>Nghe bài học không cần mạng với SQLite</Text>
      </View>

      {/* Storage & Sync Overview Card */}
      <View style={[styles.overviewCard, Shadows.card]}>
        <View style={styles.storageInfo}>
          <Text style={styles.storageLabel}>Dung lượng SQLite đã dùng:</Text>
          <Text style={styles.storageValue}>{totalStorageMb} MB / 500 MB</Text>
        </View>

        <TouchableOpacity
          style={[styles.syncButton, isSyncing && styles.syncingButton]}
          activeOpacity={0.8}
          onPress={handleSync}
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
              Hãy vào Thư viện và bấm "Tải Về" để lưu file .mp3 và .srt vào bộ nhớ điện thoại.
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 10,
  },
  lessonTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
    flex: 1,
  },
  langPill: {
    backgroundColor: Colors.primaryGlow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  langPillText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: "700",
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
  sqliteBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.accentGreen + "20",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sqliteBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.accentGreen,
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
