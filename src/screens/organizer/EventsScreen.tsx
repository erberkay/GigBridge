import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, query, where, onSnapshot, addDoc, deleteDoc, doc,
  serverTimestamp, orderBy,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';

const ACCENT = Colors.organizerColor;

const ERR = {
  CREATE_FAILED: 'ERR-ORG-EV-001',
  LOAD_FAILED:   'ERR-ORG-EV-002',
} as const;

const STATUS_COLORS = {
  upcoming: { bg: '#3B82F620', text: '#3B82F6', label: 'Yaklaşan' },
  live:     { bg: Colors.success + '20', text: Colors.success, label: 'Canlı' },
  past:     { bg: Colors.surfaceAlt, text: Colors.textMuted, label: 'Geçmiş' },
} as const;

export default function OrgEventsScreen({ navigation }: any) {
  const userId  = useAuthStore((s) => s.userId);
  const orgId   = useAuthStore((s) => s.orgId);
  const orgName = useAuthStore((s) => s.orgName);

  const [events, setEvents]           = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<'upcoming' | 'past'>('upcoming');
  const [createVisible, setCreateVisible] = useState(false);

  // Form state
  const [evTitle, setEvTitle]     = useState('');
  const [evVenue, setEvVenue]     = useState('');
  const [evDate, setEvDate]       = useState('');
  const [evTime, setEvTime]       = useState('');
  const [evDesc, setEvDesc]       = useState('');
  const [creating, setCreating]   = useState(false);

  useEffect(() => {
    if (!orgId) return;
    const unsub = onSnapshot(
      query(collection(db, 'events'), where('organizerId', '==', orgId), orderBy('createdAt', 'desc')),
      (snap) => {
        setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => { console.warn(ERR.LOAD_FAILED, err); setLoading(false); },
    );
    return unsub;
  }, [orgId]);

  const displayed = events.filter((e) =>
    tab === 'upcoming' ? e.status !== 'past' : e.status === 'past',
  );

  const handleCreate = useCallback(async () => {
    if (!evTitle.trim() || !evDate.trim()) {
      Alert.alert('Eksik Bilgi', 'Etkinlik adı ve tarihi zorunludur.');
      return;
    }
    if (!orgId || !userId) return;
    setCreating(true);
    try {
      await addDoc(collection(db, 'events'), {
        title:        evTitle.trim(),
        venueName:    evVenue.trim() || null,
        date:         evDate.trim(),
        startTime:    evTime.trim() || null,
        description:  evDesc.trim() || null,
        organizerId:  orgId,
        organizerName: orgName ?? '',
        createdBy:    userId,
        status:       'upcoming',
        attendeeCount: 0,
        genre:        [],
        createdAt:    serverTimestamp(),
      });
      setCreateVisible(false);
      setEvTitle(''); setEvVenue(''); setEvDate(''); setEvTime(''); setEvDesc('');
    } catch {
      Alert.alert('Hata', `Etkinlik oluşturulamadı. (${ERR.CREATE_FAILED})`);
    } finally {
      setCreating(false);
    }
  }, [evTitle, evVenue, evDate, evTime, evDesc, orgId, orgName, userId]);

  const handleEventPress = useCallback((item: any) => {
    Alert.alert(
      item.title ?? 'Etkinlik',
      `${item.date ?? ''}${item.startTime ? ` · ${item.startTime}` : ''}`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Etkinliği Sil',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Etkinliği Sil', 'Bu etkinlik kalıcı olarak silinecek. Emin misiniz?', [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await deleteDoc(doc(db, 'events', item.id));
                  } catch {
                    Alert.alert('Hata', 'Etkinlik silinemedi.');
                  }
                },
              },
            ]),
        },
      ],
    );
  }, []);

  const renderEvent = useCallback(({ item }: { item: any }) => {
    const sc = STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.upcoming;
    return (
      <TouchableOpacity style={styles.eventCard} onPress={() => handleEventPress(item)} activeOpacity={0.75}>
        <View style={styles.eventCardLeft}>
          <LinearGradient colors={[ACCENT, '#BE123C']} style={styles.eventIcon}>
            <Ionicons name="calendar" size={18} color="#fff" />
          </LinearGradient>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <Text style={styles.eventMeta}>
              {item.venueName ? `${item.venueName} · ` : ''}{item.date}{item.startTime ? ` ${item.startTime}` : ''}
            </Text>
            {item.description ? <Text style={styles.eventDesc} numberOfLines={1}>{item.description}</Text> : null}
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusText, { color: sc.text }]}>{sc.label}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [handleEventPress]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Etkinlikler</Text>
        <Text style={styles.subtitle}>{orgName ?? 'Organizasyonunuz'}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'upcoming' && styles.tabActive]}
          onPress={() => setTab('upcoming')}
        >
          <Text style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}>Aktif</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'past' && styles.tabActive]}
          onPress={() => setTab('past')}
        >
          <Text style={[styles.tabText, tab === 'past' && styles.tabTextActive]}>Geçmiş</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={ACCENT} />
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(e) => e.id}
          renderItem={renderEvent}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>
                {tab === 'upcoming' ? 'Aktif etkinlik yok' : 'Geçmiş etkinlik yok'}
              </Text>
            </View>
          }
        />
      )}

      {/* Oluştur Butonu */}
      <TouchableOpacity style={styles.fab} onPress={() => setCreateVisible(true)}>
        <LinearGradient colors={[ACCENT, '#BE123C']} style={styles.fabGrad}>
          <Ionicons name="add" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Oluştur Modal */}
      <Modal visible={createVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={styles.modalTitle}>Yeni Etkinlik</Text>

            <TextInput style={styles.input} placeholder="Etkinlik Adı *" placeholderTextColor={Colors.textMuted}
              value={evTitle} onChangeText={setEvTitle} />
            <TextInput style={styles.input} placeholder="Mekan Adı" placeholderTextColor={Colors.textMuted}
              value={evVenue} onChangeText={setEvVenue} />
            <TextInput style={styles.input} placeholder="Tarih (örn: 20 Nisan 2025)" placeholderTextColor={Colors.textMuted}
              value={evDate} onChangeText={setEvDate} />
            <TextInput style={styles.input} placeholder="Saat (örn: 21:00)" placeholderTextColor={Colors.textMuted}
              value={evTime} onChangeText={setEvTime} />
            <TextInput style={[styles.input, styles.inputMulti]} placeholder="Açıklama..."
              placeholderTextColor={Colors.textMuted} value={evDesc} onChangeText={setEvDesc}
              multiline numberOfLines={3} textAlignVertical="top" />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateVisible(false)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, creating && styles.btnDisabled]}
                onPress={handleCreate}
                disabled={creating}
              >
                {creating
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.createBtnText}>Oluştur</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800' },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2 },
  tabRow: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginVertical: Spacing.md, gap: 8 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tabActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  tabText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 120, gap: 10 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm },
  eventCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  eventCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  eventIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  eventInfo: { flex: 1 },
  eventTitle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  eventMeta: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  eventDesc: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 4 },
  statusBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 100, right: Spacing.lg,
    width: 56, height: 56, borderRadius: 28, overflow: 'hidden',
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 12,
  },
  fabGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalScroll: { padding: Spacing.xl },
  modalTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', marginBottom: Spacing.lg },
  input: {
    backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
    color: Colors.text, fontSize: FontSize.md, marginBottom: 10,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  cancelBtnText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
  createBtn: {
    flex: 2, paddingVertical: 14, borderRadius: BorderRadius.md,
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
  },
  createBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});
