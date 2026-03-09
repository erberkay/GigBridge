import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { PressableScale } from '../../components/common/PressableScale';

const GENRE_COLORS: Record<string, readonly [string, string]> = {
  Jazz: ['#F59E0B', '#D97706'],
  Electronic: ['#8B5CF6', '#6D28D9'],
  Rock: ['#EF4444', '#B91C1C'],
  Pop: ['#EC4899', '#BE185D'],
  Akustik: ['#10B981', '#059669'],
  'Hip-Hop': ['#F97316', '#EA580C'],
  'R&B': ['#06B6D4', '#0891B2'],
};

const DEFAULT_COLORS: readonly [string, string] = [Colors.primary, Colors.primaryDark];

const ALL_EVENTS = [
  { id: '1', title: 'Jazz Gecesi', venue: 'Babylon Club', artist: 'Kerem Görsev', date: 'Bugün', time: '21:00', genre: 'Jazz', attendees: 124, price: 'Ücretsiz', hot: false },
  { id: '2', title: 'Electronic Night', venue: 'Zorlu PSM', artist: 'Kolsch', date: 'Yarın', time: '22:00', genre: 'Electronic', attendees: 340, price: '₺150', hot: true },
  { id: '3', title: 'Akustik Akşam', venue: 'Nardis', artist: 'Aytaç Doğan', date: 'Cuma', time: '20:30', genre: 'Akustik', attendees: 80, price: '₺80', hot: false },
  { id: '4', title: 'Rock Partisi', venue: 'IF Performance', artist: 'Pinhani', date: 'Cumartesi', time: '21:00', genre: 'Rock', attendees: 450, price: '₺200', hot: true },
  { id: '5', title: 'Hip-Hop Night', venue: 'Salon İKSV', artist: 'Ceza', date: 'Pazar', time: '22:00', genre: 'Hip-Hop', attendees: 280, price: '₺120', hot: false },
  { id: '6', title: 'Deep House Set', venue: 'Suma Beach', artist: 'Aydın Doğan', date: '15 Mart', time: '23:00', genre: 'Electronic', attendees: 500, price: '₺180', hot: true },
  { id: '7', title: 'Pop Gecesi', venue: 'Beyrut Performance', artist: 'Sertab Erener', date: '16 Mart', time: '20:00', genre: 'Pop', attendees: 320, price: '₺250', hot: false },
  { id: '8', title: 'R&B Lounge', venue: 'Soho House', artist: 'Müjde Ar', date: '17 Mart', time: '21:30', genre: 'R&B', attendees: 150, price: '₺100', hot: false },
];

const GENRES = ['Tümü', 'Jazz', 'Electronic', 'Rock', 'Pop', 'Akustik', 'Hip-Hop', 'R&B'];

export default function EventsScreen({ navigation }: any) {
  const [selectedGenre, setSelectedGenre] = useState('Tümü');
  const [search, setSearch] = useState('');

  const filtered = ALL_EVENTS.filter((e) => {
    const matchGenre = selectedGenre === 'Tümü' || e.genre === selectedGenre;
    const matchSearch = search === '' ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.artist.toLowerCase().includes(search.toLowerCase()) ||
      e.venue.toLowerCase().includes(search.toLowerCase());
    return matchGenre && matchSearch;
  });

  const tonight = filtered.filter((e) => e.date === 'Bugün' || e.date === 'Yarın');
  const upcoming = filtered.filter((e) => e.date !== 'Bugün' && e.date !== 'Yarın');

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#0D0520', '#0A0A0F']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerMid}>
          <Text style={styles.title}>Etkinlikler</Text>
          <View style={styles.countBadge}>
            <Text style={styles.count}>{filtered.length}</Text>
          </View>
        </View>
        {/* Arama */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Etkinlik, sanatçı veya mekan ara..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Tür filtresi */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreList}
        style={styles.genreScroll}
      >
        {GENRES.map((g) => (
          <PressableScale
            key={g}
            style={[styles.genreChip, selectedGenre === g && styles.genreChipActive, selectedGenre === g && GENRE_COLORS[g] && { borderColor: GENRE_COLORS[g][0] }]}
            onPress={() => setSelectedGenre(g)}
            scaleTo={0.94}
          >
            {selectedGenre === g && GENRE_COLORS[g] ? (
              <LinearGradient colors={GENRE_COLORS[g] as any} style={styles.genreChipGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={[styles.genreText, styles.genreTextActive]}>{g}</Text>
              </LinearGradient>
            ) : (
              <Text style={[styles.genreText, selectedGenre === g && styles.genreTextActive]}>{g}</Text>
            )}
          </PressableScale>
        ))}
      </ScrollView>

      {/* Etkinlik listesi */}
      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          tonight.length > 0 && search === '' && selectedGenre === 'Tümü' ? (
            <Text style={styles.sectionLabel}>Bu Gece & Yarın</Text>
          ) : null
        }
        renderItem={({ item, index }) => {
          const colors = GENRE_COLORS[item.genre] ?? DEFAULT_COLORS;
          const showUpcomingLabel =
            search === '' && selectedGenre === 'Tümü' &&
            index === tonight.length && upcoming.length > 0;
          return (
            <>
              {showUpcomingLabel && (
                <Text style={styles.sectionLabel}>Yaklaşan Etkinlikler</Text>
              )}
              <PressableScale
                style={styles.eventCard}
                onPress={() => navigation.navigate('EventDetail', { event: item })}
                scaleTo={0.97}
              >
                {/* Left colored gradient banner */}
                <LinearGradient colors={colors as any} style={styles.cardBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.cardBannerLetter}>{item.title.charAt(0)}</Text>
                  {item.hot && <Ionicons name="flame" size={15} color="rgba(255,255,255,0.9)" />}
                </LinearGradient>

                {/* Event info */}
                <View style={styles.eventInfo}>
                  <View style={styles.eventTop}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={[styles.priceBadge, item.price === 'Ücretsiz' && styles.freeBadge]}>
                      <Text style={[styles.priceText, item.price === 'Ücretsiz' && styles.freeText]}>{item.price}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <Ionicons name="mic-outline" size={11} color={Colors.textSecondary} />
                    <Text style={styles.eventArtist} numberOfLines={1}>{item.artist}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 9 }}>
                    <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
                    <Text style={styles.eventVenue} numberOfLines={1}>{item.venue}</Text>
                  </View>
                  <View style={styles.eventBottom}>
                    <View style={styles.timeBadge}>
                      <Text style={styles.timeBadgeDate}>{item.date}</Text>
                      <Text style={styles.timeBadgeTime}>{item.time}</Text>
                    </View>
                    <View style={styles.attendeesBadge}>
                      <Ionicons name="people-outline" size={11} color={Colors.textMuted} />
                      <Text style={styles.attendeesText}>{item.attendees}</Text>
                    </View>
                  </View>
                </View>

                {/* Genre color accent bar on right edge */}
                <View style={[styles.genreAccent, { backgroundColor: colors[0] }]} />
              </PressableScale>
            </>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="musical-notes-outline" size={48} color={Colors.textMuted} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>Bu kriterlere uygun etkinlik bulunamadı.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  backText: { color: Colors.text, fontSize: FontSize.lg },
  headerMid: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.md },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800' },
  countBadge: {
    backgroundColor: Colors.primary + '33', borderRadius: BorderRadius.full,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.primary + '55',
  },
  count: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '800' },
  clearText: { color: Colors.textMuted, fontSize: 14, padding: 4 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 2,
    marginBottom: Spacing.sm,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm, paddingVertical: 13 },
  genreScroll: { maxHeight: 50, marginBottom: Spacing.sm },
  genreList: { paddingHorizontal: Spacing.lg, gap: 8, alignItems: 'center' },
  genreChip: {
    borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    overflow: 'hidden',
  },
  genreChipActive: { borderColor: Colors.primary },
  genreChipGrad: { paddingHorizontal: 16, paddingVertical: 8 },
  genreText: { color: Colors.textSecondary, fontSize: FontSize.sm, paddingHorizontal: 14, paddingVertical: 7 },
  genreTextActive: { color: '#fff', fontWeight: '700' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: 10 },
  sectionLabel: {
    color: Colors.primary,
    fontSize: 10, fontWeight: '800',
    letterSpacing: 1.5, textTransform: 'uppercase',
    marginTop: 12, marginBottom: 6,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardBanner: {
    width: 72,
    alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingTop: 8,
  },
  cardBannerLetter: {
    fontSize: 28, fontWeight: '900',
    color: 'rgba(255,255,255,0.95)',
  },
  cardBannerHot: { fontSize: 15 },
  eventInfo: { flex: 1, padding: 13, paddingRight: 6 },
  eventTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 },
  eventTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '800', flex: 1, marginRight: 8 },
  priceBadge: {
    paddingHorizontal: 9, paddingVertical: 3,
    backgroundColor: Colors.accent + '22',
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.accent + '44',
  },
  freeBadge: { backgroundColor: Colors.success + '22', borderColor: Colors.success + '44' },
  priceText: { color: Colors.accent, fontSize: 10, fontWeight: '800' },
  freeText: { color: Colors.success, fontWeight: '800' },
  eventArtist: { color: Colors.textSecondary, fontSize: 12, marginBottom: 2 },
  eventVenue: { color: Colors.textMuted, fontSize: 11, marginBottom: 9 },
  eventBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  timeBadgeDate: { color: Colors.textMuted, fontSize: 10 },
  timeBadgeTime: { color: Colors.text, fontSize: 10, fontWeight: '800' },
  attendeesBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  attendeesText: { color: Colors.textMuted, fontSize: 10 },
  genreAccent: { width: 3 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.xl },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },
});
