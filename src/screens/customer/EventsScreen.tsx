import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
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

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
const GENRE_ICONS: Record<string, IoniconName> = {
  Jazz:       'musical-note-outline',
  Electronic: 'radio-outline',
  Rock:       'flash-outline',
  Pop:        'star-outline',
  Akustik:    'musical-notes-outline',
  'Hip-Hop':  'mic-outline',
  'R&B':      'headset-outline',
};

function CardInner({ item, colors }: { item: any; colors: readonly [string, string] }) {
  const isFree = item.price === 'Ücretsiz';
  return (
    <View style={styles.cardInner}>
      <View style={styles.cardTop}>
        {item.hot && (
          <View style={styles.hotBadge}>
            <Ionicons name="flame" size={10} color="#fff" />
            <Text style={styles.hotText}>HOT</Text>
          </View>
        )}
        <View style={styles.flex1} />
        <View style={[styles.priceBadge, isFree && styles.freeBadge]}>
          <Text style={[styles.priceText, isFree && styles.freeText]}>{item.price}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <View style={[styles.genrePill, { borderColor: colors[0] + '88', backgroundColor: colors[0] + '28' }]}>
          <Text style={[styles.genrePillText, { color: colors[0] }]}>{item.genre}</Text>
        </View>
        <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.eventMetaRow}>
          <Ionicons name="mic-outline" size={11} color="rgba(255,255,255,0.55)" />
          <Text style={styles.eventArtist} numberOfLines={1}>{item.artist}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.45)" />
          <Text style={styles.eventVenue} numberOfLines={1}>{item.venue}</Text>
        </View>
        <View style={styles.timeBadge}>
          <Ionicons name="calendar-outline" size={10} color="rgba(255,255,255,0.5)" />
          <Text style={styles.timeBadgeText}>{item.date} · {item.time}</Text>
        </View>
      </View>
    </View>
  );
}

const ALL_EVENTS = [
  { id: '1', title: 'Jazz Gecesi', venue: 'Babylon Club', artist: 'Kerem Görsev', date: 'Bugün', time: '21:00', genre: 'Jazz', attendees: 124, price: 'Ücretsiz', hot: false, banner: require('../../assets/banner_jazz.png') },
  { id: '2', title: 'Electronic Night', venue: 'Zorlu PSM', artist: 'Kolsch', date: 'Yarın', time: '22:00', genre: 'Electronic', attendees: 340, price: '₺150', hot: true, banner: require('../../assets/banner_electronic.png') },
  { id: '3', title: 'Akustik Akşam', venue: 'Nardis', artist: 'Aytaç Doğan', date: 'Cuma', time: '20:30', genre: 'Akustik', attendees: 80, price: '₺80', hot: false, banner: require('../../assets/banner_acoustic.png') },
  { id: '4', title: 'Rock Partisi', venue: 'IF Performance', artist: 'Pinhani', date: 'Cumartesi', time: '21:00', genre: 'Rock', attendees: 450, price: '₺200', hot: true, banner: require('../../assets/banner_rock.png') },
  { id: '5', title: 'Hip-Hop Night', venue: 'Salon İKSV', artist: 'Ceza', date: 'Pazar', time: '22:00', genre: 'Hip-Hop', attendees: 280, price: '₺120', hot: false, banner: require('../../assets/banner_hiphop.png') },
  { id: '6', title: 'Deep House Set', venue: 'Suma Beach', artist: 'Aydın Doğan', date: '15 Mart', time: '23:00', genre: 'Electronic', attendees: 500, price: '₺180', hot: true, banner: require('../../assets/banner_deephouse.png') },
  { id: '7', title: 'Pop Gecesi', venue: 'Beyrut Performance', artist: 'Sertab Erener', date: '16 Mart', time: '20:00', genre: 'Pop', attendees: 320, price: '₺250', hot: false, banner: require('../../assets/banner_pop.png') },
  { id: '8', title: 'R&B Lounge', venue: 'Soho House', artist: 'Müjde Ar', date: '17 Mart', time: '21:30', genre: 'R&B', attendees: 150, price: '₺100', hot: false, banner: require('../../assets/banner_rnb.png') },
];

const GENRES = ['Tümü', 'Jazz', 'Electronic', 'Rock', 'Pop', 'Akustik', 'Hip-Hop', 'R&B'];

const TR_FULL_MONTH = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const TR_DAY_FULL  = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
const TR_DAY_SHORT = ['Paz','Pzt','Sal','Çar','Per','Cum','Cte'];

type DateFilterItem = { key: string; label: string; sub: string; dayName: string; dateStr: string };

function buildDateFilters(): DateFilterItem[] {
  const today = new Date();
  const filters: DateFilterItem[] = [{ key: 'all', label: 'Tümü', sub: '', dayName: '', dateStr: '' }];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dayName = i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : TR_DAY_FULL[d.getDay()];
    const label   = i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : TR_DAY_SHORT[d.getDay()];
    const dateStr = `${d.getDate()} ${TR_FULL_MONTH[d.getMonth()]}`;
    filters.push({ key: dayName, label, sub: d.getDate().toString(), dayName, dateStr });
  }
  return filters;
}
const DATE_FILTERS = buildDateFilters();

function eventMatchesDate(eventDate: string, filter: DateFilterItem): boolean {
  if (filter.key === 'all') return true;
  return eventDate === filter.dayName || eventDate === filter.dateStr;
}

export default function EventsScreen({ navigation }: any) {
  const [selectedGenre, setSelectedGenre]   = useState('Tümü');
  const [selectedDateKey, setSelectedDateKey] = useState('all');
  const [search, setSearch]                 = useState('');
  const [firestoreEvents, setFirestoreEvents] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'events'), where('status', '==', 'upcoming'));
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) return;
      const loaded = snap.docs.map((d) => {
        const data = d.data();
        const genreRaw = Array.isArray(data.genre) ? data.genre[0] : data.genre;
        const rawPrice = data.price;
        return {
          id: d.id,
          title:     data.title ?? '',
          venue:     data.venueName ?? data.venue ?? '',
          artist:    data.artistName ?? data.artist ?? '',
          date:      data.date ?? data.dateLabel ?? '',
          time:      data.startTime ?? data.time ?? '',
          genre:     genreRaw ?? '',
          attendees: data.attendeeCount ?? 0,
          price:     rawPrice == null || rawPrice === 0 ? 'Ücretsiz' : `₺${rawPrice}`,
          hot:       (data.attendeeCount ?? 0) > 400,
          banner:    null,
        };
      });
      setFirestoreEvents(loaded);
    }, (err) => console.warn('[EventsScreen] onSnapshot:', err));
    return () => unsub();
  }, []);

  const activeEvents = useMemo(
    () => (firestoreEvents.length > 0 ? firestoreEvents : ALL_EVENTS),
    [firestoreEvents],
  );

  const selectedDateFilter = useMemo(
    () => DATE_FILTERS.find((f) => f.key === selectedDateKey) ?? DATE_FILTERS[0],
    [selectedDateKey],
  );

  const filtered = useMemo(() =>
    activeEvents.filter((e) => {
      const matchGenre  = selectedGenre === 'Tümü' || e.genre === selectedGenre;
      const matchDate   = eventMatchesDate(e.date, selectedDateFilter);
      const matchSearch = search === '' ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.artist.toLowerCase().includes(search.toLowerCase()) ||
        e.venue.toLowerCase().includes(search.toLowerCase());
      return matchGenre && matchDate && matchSearch;
    }), [activeEvents, selectedGenre, selectedDateFilter, search]);

  const tonight = useMemo(() =>
    filtered.filter((e) => e.date === 'Bugün' || e.date === 'Yarın'), [filtered]);

  const upcoming = useMemo(() =>
    filtered.filter((e) => e.date !== 'Bugün' && e.date !== 'Yarın'), [filtered]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1A0533', '#0D0520', '#0A0A0F'] as const} style={styles.header}>
        <View style={styles.headerGlow} />
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Etkinlikler</Text>
          <View style={styles.countBadge}>
            <Text style={styles.count}>{filtered.length}</Text>
          </View>
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Etkinlik, sanatçı veya mekan ara..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
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
        {GENRES.map((g) => {
          const isActive = selectedGenre === g;
          const icon = GENRE_ICONS[g];
          return (
            <PressableScale
              key={g}
              style={[styles.genreChip, isActive && styles.genreChipActive, isActive && GENRE_COLORS[g] && { borderColor: GENRE_COLORS[g][0] }]}
              onPress={() => setSelectedGenre(g)}
              scaleTo={0.94}
            >
              {isActive && GENRE_COLORS[g] && (
                <LinearGradient colors={[...GENRE_COLORS[g]]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              )}
              {icon && <Ionicons name={icon} size={11} color={isActive ? '#fff' : Colors.textSecondary} />}
              <Text style={[styles.genreText, isActive && styles.genreTextActive]}>{g}</Text>
            </PressableScale>
          );
        })}
      </ScrollView>

      {/* Gün filtresi */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateList}
        style={styles.dateScroll}
      >
        {DATE_FILTERS.map((df) => {
          const isActive = selectedDateKey === df.key;
          return (
            <PressableScale
              key={df.key}
              style={[styles.dateChip, isActive && styles.dateChipActive]}
              onPress={() => setSelectedDateKey(df.key)}
              scaleTo={0.93}
            >
              {isActive ? (
                <LinearGradient colors={['#7C3AED', '#4C1D95']} style={styles.dateChipGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={[styles.dateChipLabel, styles.dateChipLabelActive, df.sub === '' && styles.dateChipLabelOnly]}>{df.label}</Text>
                  {df.sub !== '' && <Text style={[styles.dateChipSub, styles.dateChipSubActive]}>{df.sub}</Text>}
                </LinearGradient>
              ) : (
                <>
                  <Text style={[styles.dateChipLabel, df.sub === '' && styles.dateChipLabelOnly]}>{df.label}</Text>
                  {df.sub !== '' && <Text style={styles.dateChipSub}>{df.sub}</Text>}
                </>
              )}
            </PressableScale>
          );
        })}
      </ScrollView>

      {/* Etkinlik listesi */}
      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        style={styles.listFlex}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          tonight.length > 0 && search === '' && selectedGenre === 'Tümü' && selectedDateKey === 'all' ? (
            <View style={styles.sectionLabelRow}>
              <View style={styles.sectionAccentBar} />
              <Text style={styles.sectionLabel}>BU GECE & YARIN</Text>
              <View style={styles.sectionCountBadge}>
                <Text style={styles.sectionCount}>{tonight.length}</Text>
              </View>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => {
          const colors = GENRE_COLORS[item.genre] ?? DEFAULT_COLORS;
          const showUpcomingLabel =
            search === '' && selectedGenre === 'Tümü' && selectedDateKey === 'all' &&
            index === tonight.length && upcoming.length > 0;
          return (
            <>
              {showUpcomingLabel && (
                <View style={styles.sectionLabelRow}>
                  <View style={styles.sectionAccentBar} />
                  <Text style={styles.sectionLabel}>YAKLAŞAN ETKİNLİKLER</Text>
                  <View style={styles.sectionCountBadge}>
                    <Text style={styles.sectionCount}>{upcoming.length}</Text>
                  </View>
                </View>
              )}
              <PressableScale
                style={styles.eventCard}
                onPress={() => navigation.navigate('EventDetail', { event: item })}
                scaleTo={0.97}
              >
                {'banner' in item && item.banner ? (
                  <ImageBackground source={item.banner} style={styles.cardImg} imageStyle={styles.cardImgStyle}>
                    <LinearGradient
                      colors={['transparent', 'transparent', 'rgba(8,8,14,0.82)', 'rgba(8,8,14,0.98)'] as const}
                      style={StyleSheet.absoluteFill}
                    />
                    <CardInner item={item} colors={colors} />
                  </ImageBackground>
                ) : (
                  <LinearGradient colors={[colors[0], colors[1], colors[1]] as [string, string, string]} style={styles.cardImg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <CardInner item={item} colors={colors} />
                  </LinearGradient>
                )}
              </PressableScale>
            </>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="musical-notes-outline" size={48} color={Colors.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>Bu kriterlere uygun etkinlik bulunamadı.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: 12, overflow: 'hidden' },
  headerGlow: { position: 'absolute', top: -60, right: -30, width: 220, height: 220, borderRadius: 110, backgroundColor: '#7C3AED1A' },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  backBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', flex: 1 },
  countBadge: {
    backgroundColor: Colors.primary + '33', borderRadius: BorderRadius.full,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.primary + '55',
  },
  count: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '800' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 0,
    marginBottom: 0,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm, paddingVertical: 11 },
  dateScroll: { marginBottom: 10, flexGrow: 0 },
  dateList: { paddingHorizontal: Spacing.lg, gap: 8, paddingVertical: 4 },
  dateChip: {
    minWidth: 52,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    overflow: 'hidden',
  },
  dateChipActive: { borderColor: '#7C3AED' },
  dateChipGrad: { alignItems: 'center', width: '100%' },
  dateChipLabel: {
    color: Colors.textSecondary,
    fontSize: 10, fontWeight: '700',
    paddingTop: 8, paddingHorizontal: 11,
    paddingBottom: 2,
    textAlign: 'center',
  },
  dateChipLabelActive: { color: '#fff' },
  dateChipLabelOnly: { paddingBottom: 8 },
  dateChipSub: {
    color: Colors.textMuted,
    fontSize: 15, fontWeight: '800',
    paddingBottom: 8, textAlign: 'center',
  },
  dateChipSubActive: { color: 'rgba(255,255,255,0.85)' },
  genreScroll: { marginBottom: Spacing.sm, flexGrow: 0 },
  genreList: { paddingHorizontal: Spacing.lg, gap: 8, paddingVertical: 4 },
  genreChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    overflow: 'hidden',
  },
  genreChipActive: { borderColor: Colors.primary },
  genreText: { color: Colors.textSecondary, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  genreTextActive: { color: '#fff' },
  listFlex: { flex: 1 },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: 10 },
  sectionLabelRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 10 },
  sectionAccentBar:  { width: 3, height: 16, backgroundColor: Colors.primary, borderRadius: 2 },
  sectionLabel:      { color: Colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, flex: 1 },
  sectionCountBadge: { backgroundColor: Colors.primary + '22', borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: Colors.primary + '44' },
  sectionCount:      { color: Colors.primary, fontSize: 10, fontWeight: '800' },

  eventCard:    { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  cardImg:      { height: 200, justifyContent: 'space-between' },
  cardImgStyle: { resizeMode: 'cover' },
  cardInner:    { flex: 1, justifyContent: 'space-between', padding: 14 },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start' },
  flex1:        { flex: 1 },
  cardContent:  { gap: 5 },
  eventTitle:   { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eventArtist:  { color: 'rgba(255,255,255,0.65)', fontSize: 11, flex: 1 },
  metaDot:      { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
  eventVenue:   { color: 'rgba(255,255,255,0.45)', fontSize: 11, flex: 1 },
  timeBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 4 },
  timeBadgeText:{ color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600' },
  hotBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EF4444', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 4 },
  hotText:      { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  priceBadge:   { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(245,158,11,0.2)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(245,158,11,0.5)' },
  freeBadge:    { backgroundColor: 'rgba(16,185,129,0.2)', borderColor: 'rgba(16,185,129,0.5)' },
  priceText:    { color: Colors.accent, fontSize: 11, fontWeight: '800' },
  freeText:     { color: Colors.success },
  genrePill:    { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: BorderRadius.full, borderWidth: 1 },
  genrePillText:{ fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.xl },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },
  clearBtn: { padding: 4 },
  emptyIcon: { marginBottom: 16 },
});
