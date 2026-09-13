// Settings Screen - App configuration, API Gateway host, and Kokoro AI TTS switcher
// English comments only per project rules

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Colors, Shadows } from "../theme/colors";

export const SettingsScreen: React.FC = () => {
  const [useLocalTts, setUseLocalTts] = useState(false);
  const [backgroundAudioEnabled, setBackgroundAudioEnabled] = useState(true);
  const [autoRepeatChunk, setAutoRepeatChunk] = useState(true);

  const handleClearCache = () => {
    alert("Đã xóa bộ nhớ đệm audio tạm thời (0 MB freed).");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cài Đặt Hệ Thống</Text>
        <Text style={styles.headerSubtitle}>Tùy chỉnh phát âm thanh & kết nối máy chủ</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Section 1: Audio Playback */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ÂM THANH & TRÌNH PHÁT</Text>
          <View style={[styles.card, Shadows.card]}>
            <View style={styles.row}>
              <View style={styles.rowLabelContainer}>
                <Text style={styles.rowLabel}>Phát khi tắt màn hình (Background)</Text>
                <Text style={styles.rowDesc}>Giữ âm thanh phát liên tục ngoài màn hình khóa</Text>
              </View>
              <Switch
                value={backgroundAudioEnabled}
                onValueChange={setBackgroundAudioEnabled}
                trackColor={{ false: Colors.surfaceLight, true: Colors.primary }}
                thumbColor="#FFF"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowLabelContainer}>
                <Text style={styles.rowLabel}>Tự động tạm dừng để nhại (Auto Repeat)</Text>
                <Text style={styles.rowDesc}>Chờ 1.5s sau mỗi câu để người học luyện nhại</Text>
              </View>
              <Switch
                value={autoRepeatChunk}
                onValueChange={setAutoRepeatChunk}
                trackColor={{ false: Colors.surfaceLight, true: Colors.primary }}
                thumbColor="#FFF"
              />
            </View>
          </View>
        </View>

        {/* Section 2: AI Engine Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BỘ MÁY TỔNG HỢP GIỌNG ĐỌC (TTS ENGINE)</Text>
          <View style={[styles.card, Shadows.card]}>
            <View style={styles.row}>
              <View style={styles.rowLabelContainer}>
                <Text style={styles.rowLabel}>Local AI TTS (Kokoro / Offline)</Text>
                <Text style={styles.rowDesc}>
                  Chạy mô hình Kokoro-82M trực tiếp trên máy không cần mạng
                </Text>
              </View>
              <Switch
                value={useLocalTts}
                onValueChange={setUseLocalTts}
                trackColor={{ false: Colors.surfaceLight, true: Colors.accent }}
                thumbColor="#FFF"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.engineStatusRow}>
              <Text style={styles.engineLabel}>Engine hiện tại:</Text>
              <Text style={[styles.engineValue, { color: useLocalTts ? Colors.accent : Colors.primary }]}>
                {useLocalTts ? "Kokoro-82M (Local Offline)" : "Edge-TTS (High-Definition Neural)"}
              </Text>
            </View>
          </View>
        </View>

        {/* Section 3: Connectivity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KẾT NỐI MÁY CHỦ</Text>
          <View style={[styles.card, Shadows.card]}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gateway Endpoint:</Text>
              <Text style={styles.infoValue}>http://localhost:8000</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>WebSocket Streaming:</Text>
              <Text style={styles.infoValue}>ws://localhost:8000/ws/render</Text>
            </View>
          </View>
        </View>

        {/* Section 4: Cache & Storage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DỮ LIỆU & BỘ NHỚ</Text>
          <View style={[styles.card, Shadows.card]}>
            <TouchableOpacity style={styles.actionRow} onPress={handleClearCache}>
              <Text style={styles.dangerActionText}>Xóa bộ nhớ đệm audio tạm</Text>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionTitle}>MeowShadow Lab Mobile</Text>
          <Text style={styles.versionText}>Phiên bản v3.2.0 • Sprint 12 Release</Text>
        </View>
      </ScrollView>
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
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabelContainer: {
    flex: 1,
    paddingRight: 12,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  rowDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 12,
  },
  engineStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  engineLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  engineValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textPrimary,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dangerActionText: {
    fontSize: 14,
    color: Colors.accentRed,
    fontWeight: "500",
  },
  actionArrow: {
    fontSize: 18,
    color: Colors.textMuted,
  },
  versionContainer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 4,
  },
  versionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  versionText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
