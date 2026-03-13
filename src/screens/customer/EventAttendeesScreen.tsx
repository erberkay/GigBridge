import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';

const AVATAR_PALETTES: [string, string][] = [
  ['#8B5CF6', '#6D28D9'],
  ['#EF4444', '#B91C1C'],
  ['#10B981', '#059669'],
  ['#F59E0B', '#D97706'],
  ['#EC4899', '#BE185D'],
  ['#06B6D4', '#0891B2'],
  ['#F97316', '#EA580C'],
  ['#6366F1', '#4F46E5'],
  ['#14B8A6', '#0D9488'],
  ['#A855F7', '#9333EA'],
  ['#84CC16', '#65A30D'],
  ['#FB7185', '#E11D48'],
];

const ATTENDEES = [
  { id: '1', name: 'Zeynep K.', genre: 'Electronic, Pop', mutual: 3, isFollowing: false },
  { id: '2', name: 'Mehmet A.', genre: 'Jazz, Akustik', mutual: 1, isFollowing: true },
  { id: '3', name: 'Selin T.', genre: 'Rock, Pop', mutual: 5, isFollowing: false },
  { id: '4', name: 'Can B.', genre: 'Electronic, Techno', mutual: 2, isFollowing: false },
  { id: '5', name: 'Ayşe M.', genre: 'Hip-Hop, R&B', mutual: 0, isFollowing: true },
  { id: '6', name: 'Berk Y.', genre: 'Pop, Akustik', mutual: 4, isFollowing: false },
  { id: '7', name: 'Deniz Ö.', genre: 'Jazz, Blues', mutual: 1, isFollowing: false },
  { id: '8', name: 'Hande K.', genre: 'Electronic, House', mutual: 6, isFollowing: true },
  { id: '9', name: 'Tarık S.', genre: 'Rock, Metal', mutual: 0, isFollowing: false },
  { id: '10', name: 'Gizem A.', genre: 'Pop, R&B', mutual: 2, isFollowing: false },
  { id: '11', name: 'Emre C.', genre: 'Hip-Hop, Rap', mutual: 1, isFollowing: true },
  { id: '12', name: 'Nur Y.', genre: 'Akustik, Folk', mutual: 3, isFollowing: false },
];

const FILTERS = [
  { key: 'all', label: 'Tümü' },
  { key: 'mutual', label: 'Ortak' },
  { key: 'following', label: 'Takip' },
];

export default function EventAttendeesScreen({ route, navigation }: any) {
  const event   = route.params?.event ?? { title: 'Etkinlik', attendees: 124 };
  const eventId = route.params?.event?.id ?? null;
  const userId  = useAuthStore((s) => s.userId);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [attendees, setAttendees] = useState(ATTENDEES);

  useEffect(() => {
    if (!eventId) return;
    const unsub = onSnapshot(
      collection(db, 'events', eventId, 'attendees'),
      (snap) => {
        if (snap.empty) { setAttendees([]); return; }
        const loaded = snap.docs.map((d) => {
          const data = d.data();
          return {
            id:          d.id,
            name:        data.displayName ?? data.name ?? 'Kullanıcı',
            genre:       data.genre ?? '',
            mutual:      0,
            isFollowing: false,
          };
        });
        setAttendees(loaded);
      },
      (err) => console.warn('[EventAttendees] onSnapshot:', err),
    );
    return () => unsub();
  }, [eventId]);

  const toggleFollow = useCallback(async (attendeeId: string) => {
    const current = attendees.find((a) => a.id === attendeeId);
    const isNowFollowing = !current?.isFollowing;
    setAttendees((prev) => prev.map((a) =>
      a.id === attendeeId ? { ...a, isFollowing: isNowFollowing } : a,
    ));
    if (!userId || userId.startsWith('demo_')) return;
    const followRef = doc(db, 'users', userId, 'following', attendeeId);
    try {
      if (isNowFollowing) {
        const item = attendees.find((a) => a.id === attendeeId);
        await setDoc(followRef, {
          artistId:   attendeeId,
          artistName: item?.name ?? '',
          genre:      item?.genre ?? '',
          followers:  '—',
          followedAt: serverTimestamp(),
        });
      } else {
        await deleteDoc(followRef);
      }
    } catch { /* local state already updated */ }
  }, [userId, attendees]);

  const filtered = useMemo(() =>
    attendees
      .filter((a) => {
        if (filter === 'mutual') return a.mutual > 0;
        if (filter === 'following') return a.isFollowing;
        return true;
      })
      .filter((a) => search === '' || a.name.toLowerCase().includes(search.toLowerCase())),
  [attendees, filter, search]);

  const handleMessage = useCallback((id: string, name: string) => {
    navigation.navigate('Messages', { recipientId: id, recipientName: name });
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Katılımcılar</Text>
        <Text style={styles.subtitle}>{event.title} • {attendees.length} kişi</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Katılımcı ara..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      {/* Filters */}
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(f) => f.key}
        extraData={filter}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        style={styles.filterScroll}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Pro notice */}
      <View style={styles.proNotice}>
        <Ionicons name="star" size={14} color={Colors.accent} />
        <Text style={styles.proNoticeText}>Pro özelliği: Katılımcılarla mesajlaşın ve bağlantı kurun</Text>
      </View>

      {/* Attendees list */}
      <FlatList
        data={filtered}
        keyExtractor={(a) => a.id}
        style={styles.listFlex}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const palette = AVATAR_PALETTES[index % AVATAR_PALETTES.length];
          return (
          <View style={styles.attendeeCard}>
            <LinearGradient colors={palette} style={styles.attendeeAvatar}>
              <Text style={styles.attendeeAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
            <View style={styles.attendeeInfo}>
              <Text style={styles.attendeeName}>{item.name}</Text>
              <Text style={styles.attendeeGenre}>{item.genre}</Text>
              {item.mutual > 0 && (
                <View style={styles.mutualRow}>
                  <Ionicons name="people-outline" size={11} color={Colors.customerColor} />
                  <Text style={styles.mutualText}>{item.mutual} ortak takip</Text>
                </View>
              )}
            </View>
            <View style={styles.attendeeActions}>
              <TouchableOpacity
                style={[styles.followBtn, item.isFollowing && styles.followingBtn]}
                onPress={() => toggleFollow(item.id)}
              >
                <Text style={[styles.followBtnText, item.isFollowing && styles.followingBtnText]}>
                  {item.isFollowing ? 'Takipte' : '+ Takip'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.msgBtn} onPress={() => handleMessage(item.id, item.name)}>
                <Ionicons name="chatbubble-outline" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={Colors.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>Eşleşen katılımcı bulunamadı.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  backBtn: { marginBottom: Spacing.sm, padding: 4, alignSelf: 'flex-start' },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.sm },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm, paddingVertical: 13 },
  filterScroll: { marginBottom: Spacing.md, flexGrow: 0 },
  filterList: { paddingHorizontal: Spacing.lg, gap: 8, paddingVertical: 4, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  filterChipActive: { backgroundColor: Colors.customerColor, borderColor: Colors.customerColor },
  filterText: { color: Colors.textSecondary, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  proNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: Colors.accent + '11',
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.accent + '33',
  },
  proNoticeText: { color: Colors.accent, fontSize: FontSize.xs, flex: 1 },
  listFlex: { flex: 1 },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 80, gap: 10 },
  attendeeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  attendeeAvatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  attendeeAvatarText: { fontSize: 18, fontWeight: '900', color: '#fff' },
  attendeeInfo: { flex: 1 },
  attendeeName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: 2 },
  attendeeGenre: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: 2 },
  mutualText: { color: Colors.customerColor, fontSize: FontSize.xs, fontWeight: '600' },
  attendeeActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  followBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(109,40,217,0.35)',
    backgroundColor: 'rgba(109,40,217,0.07)',
  },
  followingBtn: { backgroundColor: 'rgba(109,40,217,0.13)', borderColor: 'rgba(109,40,217,0.45)' },
  followBtnText: { color: '#A78BFA', fontSize: FontSize.xs, fontWeight: '700' },
  followingBtnText: { color: '#C084FC' },
  msgBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  searchIcon: { marginRight: 8 },
  mutualRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emptyIcon: { marginBottom: 16 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md },
});
