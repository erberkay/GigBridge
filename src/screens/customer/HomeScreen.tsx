import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Dimensions, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../theme';
import { PressableScale } from '../../components/common/PressableScale';

const { width } = Dimensions.get('window');

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const FEATURED_EVENTS = [
  { id: '1', title: 'Jazz Gecesi', venue: 'Babylon Club', artist: 'Kerem Görsev', date: 'Bugün', time: '21:00', genre: 'Jazz', attendees: 124, price: 'Ücretsiz', hot: false },
  { id: '2', title: 'Electronic Night', venue: 'Zorlu PSM', artist: 'Kolsch', date: 'Yarın', time: '22:00', genre: 'Electronic', attendees: 340, price: '₺150', hot: true },
  { id: '3', title: 'Akustik Akşam', venue: 'Nardis', artist: 'Aytaç Doğan', date: 'Cuma', time: '20:30', genre: 'Akustik', attendees: 80, price: '₺80', hot: false },
];

const POPULAR_ARTISTS = [
  { id: 'berkay', name: 'DJ Berkay', genre: 'Electronic', rating: 4.9, followers: '2.4K', photo: require('../../assets/dj_berkay.jpg') },
  { id: '1', name: 'DJ Armin', genre: 'Trance', rating: 4.8, followers: '12K' },
  { id: '2', name: 'Kerem Görsev', genre: 'Jazz', rating: 4.8, followers: '8K' },
  { id: '3', name: 'Koray Avcı', genre: 'Pop Rock', rating: 4.7, followers: '45K' },
  { id: '4', name: 'Merve Özbey', genre: 'Pop', rating: 4.6, followers: '32K' },
];

const POPULAR_VENUES = [
  { id: '1', name: 'Babylon Club', city: 'İstanbul', rating: 4.8, capacity: 600, genre: 'Electronic' },
  { id: '2', name: 'Nardis Jazz', city: 'İstanbul', rating: 4.9, capacity: 150, genre: 'Jazz' },
  { id: '3', name: 'Zorlu PSM', city: 'İstanbul', rating: 4.7, capacity: 2000, genre: 'Çeşitli' },
];

const GENRE_COLORS: Record<string, [string, string]> = {
  Electronic: ['#7C3AED', '#4C1D95'],
  Jazz:       ['#D97706', '#92400E'],
  Trance:     ['#4F46E5', '#312E81'],
  'Pop Rock': ['#BE185D', '#831843'],
  Pop:        ['#DB2777', '#9D174D'],
  Rock:       ['#B91C1C', '#7F1D1D'],
  Akustik:    ['#047857', '#064E3B'],
  'Hip-Hop':  ['#C2410C', '#7C2D12'],
  Çeşitli:    ['#475569', '#1E293B'],
};

const QUICK_ACTIONS: { icon: IoniconName; label: string; route: string; colors: [string, string] }[] = [
  { icon: 'map-outline',     label: 'Harita',    route: 'Map',       colors: ['#0891B2', '#0E7490'] },
  { icon: 'flame',           label: 'Popüler',   route: 'Events',    colors: ['#DC2626', '#991B1B'] },
  { icon: 'ticket-outline',  label: 'Etkinlik',  route: 'Events',    colors: ['#7C3AED', '#4C1D95'] },
  { icon: 'heart',           label: 'Favoriler', route: 'Favorites', colors: ['#DB2777', '#9D174D'] },
  { icon: 'people',          label: 'Takip',     route: 'Following', colors: ['#059669', '#065F46'] },
];

export default function CustomerHomeScreen({ navigation }: any) {
  const { displayName } = useAuthStore();
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Günaydın';
    if (h < 18) return 'İyi Günler';
    return 'İyi Akşamlar';
  };

  const filtered = FEATURED_EVENTS.filter((e) =>
    !searchText ||
    e.title.toLowerCase().includes(searchText.toLowerCase()) ||
    e.artist.toLowerCase().includes(searchText.toLowerCase()) ||
    e.venue.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {/* ── HEADER ── */}
      <LinearGradient colors={['#180A2E', '#0E0618', Colors.background]} style={styles.header}>
        {/* Ambient glow */}
        <View style={styles.ambientGlow} />

        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.userName}>{displayName?.split(' ')[0] ?? 'Hoş Geldin'}</Text>
          </View>
          <PressableScale scaleTo={0.92} onPress={() => navigation.navigate('Notifications')} style={styles.notifBtn}>
            <LinearGradient colors={['#1E1530', '#140E22']} style={styles.notifGrad}>
              <Ionicons name="notifications-outline" size={20} color={Colors.textSecondary} />
              <View style={styles.notifDot} />
            </LinearGradient>
          </PressableScale>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Sanatçı, mekan veya etkinlik ara..."
            placeholderTextColor={Colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ── QUICK ACTIONS ── */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActionsContent}
        style={styles.quickActionsScroll}
      >
        {QUICK_ACTIONS.map((qa) => (
          <PressableScale key={qa.label} onPress={() => navigation.navigate(qa.route)} scaleTo={0.9}>
            <LinearGradient colors={qa.colors} style={styles.quickActionTile} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name={qa.icon} size={24} color="#fff" />
            </LinearGradient>
            <Text style={styles.quickActionLabel}>{qa.label}</Text>
          </PressableScale>
        ))}
      </ScrollView>

      {/* ── BU GECE ── */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>BUGÜN & YARIN</Text>
          <Text style={styles.sectionTitle}>Bu Gece</Text>
        </View>
        <PressableScale onPress={() => navigation.navigate('Events')} style={styles.seeAllBtn} scaleTo={0.93}>
          <Text style={styles.seeAllText}>Tümünü Gör</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
        </PressableScale>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventCardsContent}>
        {(filtered.length === 0 ? FEATURED_EVENTS : filtered).map((event) => {
          const gc = GENRE_COLORS[event.genre] ?? ['#4A4A6A', '#2A2A4A'];
          return (
            <PressableScale
              key={event.id}
              style={[styles.eventCard, Shadow.md]}
              onPress={() => navigation.navigate('EventDetail', { event })}
              scaleTo={0.97}
            >
              {/* Gradient banner */}
              <LinearGradient colors={gc} style={styles.eventCardBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.eventCardBannerTop}>
                  {event.hot && (
                    <View style={styles.hotBadge}>
                      <Ionicons name="flame" size={10} color="#fff" />
                      <Text style={styles.hotText}>Trend</Text>
                    </View>
                  )}
                  <View style={[styles.genrePill, !event.hot && { marginLeft: 'auto' }]}>
                    <Text style={styles.genrePillText}>{event.genre}</Text>
                  </View>
                </View>
                <Text style={styles.cardBannerLetter}>{event.title.charAt(0)}</Text>
              </LinearGradient>

              {/* Card body */}
              <View style={styles.eventCardBody}>
                <Text style={styles.eventCardTitle} numberOfLines={1}>{event.title}</Text>
                <View style={styles.eventMetaRow}>
                  <Ionicons name="mic-outline" size={11} color={Colors.textSecondary} />
                  <Text style={styles.eventCardArtist} numberOfLines={1}>{event.artist}</Text>
                </View>
                <View style={styles.eventMetaRow}>
                  <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
                  <Text style={styles.eventCardVenue} numberOfLines={1}>{event.venue}</Text>
                </View>
                <View style={styles.eventCardFooter}>
                  <View style={styles.eventTimeBadge}>
                    <Text style={styles.eventTimeDay}>{event.date}</Text>
                    <View style={styles.eventTimeDivider} />
                    <Text style={styles.eventTimeClock}>{event.time}</Text>
                  </View>
                  <View style={[styles.priceBadge, event.price === 'Ücretsiz' && styles.freeBadge]}>
                    <Text style={[styles.priceText, event.price === 'Ücretsiz' && styles.freeText]}>{event.price}</Text>
                  </View>
                </View>
              </View>

              {/* Bottom color accent */}
              <View style={[styles.eventCardAccent, { backgroundColor: gc[0] }]} />
            </PressableScale>
          );
        })}
      </ScrollView>

      {/* ── SANATÇILAR ── */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>ÖNERİLEN</Text>
          <Text style={styles.sectionTitle}>Sanatçılar</Text>
        </View>
        <PressableScale onPress={() => navigation.navigate('Following')} style={styles.seeAllBtn} scaleTo={0.93}>
          <Text style={styles.seeAllText}>Tümünü Gör</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
        </PressableScale>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistCardsContent}>
        {POPULAR_ARTISTS.map((artist) => {
          const gc = GENRE_COLORS[artist.genre] ?? [Colors.primary, Colors.primaryDark];
          return (
            <PressableScale
              key={artist.id}
              style={styles.artistCard}
              onPress={() => navigation.navigate('ArtistDetail', { artist })}
              scaleTo={0.93}
            >
              <View style={[styles.artistAvatarRing, { borderColor: gc[0] + '66' }]}>
                {'photo' in artist && artist.photo
                  ? <Image source={artist.photo} style={styles.artistAvatarImg} />
                  : (
                    <LinearGradient colors={gc} style={styles.artistAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <Text style={styles.artistInitial}>{artist.name.charAt(0)}</Text>
                    </LinearGradient>
                  )
                }
              </View>
              <Text style={styles.artistCardName} numberOfLines={1}>{artist.name}</Text>
              <Text style={styles.artistCardGenre} numberOfLines={1}>{artist.genre}</Text>
              <View style={styles.artistCardRating}>
                <Ionicons name="star" size={10} color={Colors.accent} />
                <Text style={styles.artistRatingVal}>{artist.rating}</Text>
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>

      {/* ── MEKANLAR ── */}
      <View style={[styles.sectionHeader, { marginTop: Spacing.sm }]}>
        <View>
          <Text style={styles.sectionEyebrow}>YAKINDA</Text>
          <Text style={styles.sectionTitle}>Popüler Mekanlar</Text>
        </View>
      </View>

      <View style={styles.venueList}>
        {POPULAR_VENUES.map((venue) => {
          const gc = GENRE_COLORS[venue.genre] ?? [Colors.venueColor, '#0A7A9E'];
          return (
            <PressableScale
              key={venue.id}
              style={[styles.venueCard, Shadow.sm]}
              onPress={() => navigation.navigate('VenueDetail', { venue })}
              scaleTo={0.98}
            >
              <View style={[styles.venueAccentBar, { backgroundColor: gc[0] }]} />
              <LinearGradient colors={gc} style={styles.venueAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.venueInitial}>{venue.name.charAt(0)}</Text>
              </LinearGradient>
              <View style={styles.venueInfo}>
                <Text style={styles.venueName}>{venue.name}</Text>
                <View style={styles.venueMeta}>
                  <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
                  <Text style={styles.venueMetaText}>{venue.city}</Text>
                  <View style={styles.venueDot} />
                  <Ionicons name="people-outline" size={11} color={Colors.textMuted} />
                  <Text style={styles.venueMetaText}>{venue.capacity}</Text>
                </View>
              </View>
              <View style={styles.venueRight}>
                <View style={styles.venueRatingRow}>
                  <Ionicons name="star" size={11} color={Colors.accent} />
                  <Text style={styles.venueRating}>{venue.rating}</Text>
                </View>
                <View style={[styles.venueGenrePill, { backgroundColor: gc[0] + '22' }]}>
                  <Text style={[styles.venueGenreText, { color: gc[0] }]}>{venue.genre}</Text>
                </View>
              </View>
            </PressableScale>
          );
        })}
      </View>

      {/* ── PRO BANNER ── */}
      <PressableScale
        style={[styles.proBanner, Shadow.md]}
        onPress={() => navigation.navigate('ProAccount')}
        scaleTo={0.98}
      >
        <LinearGradient colors={['#1A0533', '#2D1B69', '#1A0533']} style={styles.proGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {/* Glow orbs */}
          <View style={styles.proGlowLeft} />
          <View style={styles.proGlowRight} />

          <View style={styles.proLeft}>
            <Text style={styles.proEyebrow}>EXCLUSIVE</Text>
            <Text style={styles.proTitle}>GigBridge Pro</Text>
            <Text style={styles.proDesc}>Katılımcı listeleri, erken erişim{'\n'}ve sınırsız keşif</Text>
          </View>
          <View style={styles.proRight}>
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.proCtaBtn}>
              <Text style={styles.proCtaText}>Keşfet</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </LinearGradient>
          </View>
        </LinearGradient>
      </PressableScale>

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: { paddingTop: 56, paddingBottom: Spacing.lg, overflow: 'hidden' },
  ambientGlow: {
    position: 'absolute', top: -40, right: -40,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: Colors.primary + '18',
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg,
  },
  greeting: { color: Colors.textMuted, fontSize: FontSize.sm, letterSpacing: 0.3, marginBottom: 3 },
  userName: { color: Colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  notifBtn: { borderRadius: 14, overflow: 'hidden' },
  notifGrad: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  notifDot: {
    position: 'absolute', top: 9, right: 9,
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: Colors.error,
    borderWidth: 1.5, borderColor: Colors.background,
  },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 2,
  },
  searchBarFocused: {
    borderColor: Colors.primary + '66',
    backgroundColor: Colors.surfaceAlt,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm, paddingVertical: 13 },

  // Quick Actions
  quickActionsScroll: { marginTop: Spacing.lg },
  quickActionsContent: { paddingHorizontal: Spacing.lg, gap: 12 },
  quickActionTile: {
    width: 62, height: 62, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
    ...Shadow.sm,
  },
  quickActionLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '600', textAlign: 'center' },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg, marginTop: Spacing.xl, marginBottom: Spacing.md,
  },
  sectionEyebrow: {
    color: Colors.primary, fontSize: 10, fontWeight: '800',
    letterSpacing: 1.8, marginBottom: 4,
  },
  sectionTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', letterSpacing: -0.3 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' },

  // Event Cards
  eventCardsContent: { paddingHorizontal: Spacing.lg, gap: 14, paddingBottom: 4 },
  eventCard: {
    width: width * 0.68,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  eventCardBanner: { height: 115, padding: Spacing.md, justifyContent: 'space-between' },
  eventCardBannerTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hotBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: BorderRadius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  hotText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  genrePill: {
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: BorderRadius.full,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  genrePillText: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  cardBannerLetter: {
    fontSize: 46, fontWeight: '900', color: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-end', lineHeight: 48,
  },
  eventCardBody: { padding: Spacing.md, paddingBottom: Spacing.md + 3 },
  eventCardTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '800', marginBottom: 6, letterSpacing: -0.2 },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  eventCardArtist: { color: Colors.textSecondary, fontSize: FontSize.xs, flex: 1 },
  eventCardVenue: { color: Colors.textMuted, fontSize: FontSize.xs, flex: 1 },
  eventCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  eventTimeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.surface2, borderRadius: BorderRadius.sm,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  eventTimeDay: { color: Colors.textSecondary, fontSize: 10, fontWeight: '500' },
  eventTimeDivider: { width: 1, height: 10, backgroundColor: Colors.border },
  eventTimeClock: { color: Colors.text, fontSize: 10, fontWeight: '800' },
  priceBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accent + '22',
    borderWidth: 1, borderColor: Colors.accent + '44',
  },
  freeBadge: { backgroundColor: Colors.success + '22', borderColor: Colors.success + '44' },
  priceText: { color: Colors.accent, fontSize: 10, fontWeight: '800' },
  freeText: { color: Colors.success },
  eventCardAccent: { height: 2 },

  // Artist Cards
  artistCardsContent: { paddingHorizontal: Spacing.lg, gap: 16, paddingBottom: 4 },
  artistCard: { width: 90, alignItems: 'center' },
  artistAvatarRing: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8, padding: 2,
  },
  artistAvatar: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
  },
  artistAvatarImg: { width: 68, height: 68, borderRadius: 34 },
  artistInitial: { fontSize: 26, fontWeight: '900', color: '#fff' },
  artistCardName: { color: Colors.text, fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  artistCardGenre: { color: Colors.textMuted, fontSize: 10, textAlign: 'center', marginBottom: 4 },
  artistCardRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  artistRatingVal: { color: Colors.accent, fontSize: 10, fontWeight: '700' },

  // Venue Cards
  venueList: { paddingHorizontal: Spacing.lg, gap: 10 },
  venueCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md, gap: 12,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  venueAccentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  venueAvatar: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  venueInitial: { fontSize: 20, fontWeight: '900', color: '#fff' },
  venueInfo: { flex: 1 },
  venueName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 5 },
  venueMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  venueMetaText: { color: Colors.textMuted, fontSize: 10 },
  venueDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.textMuted },
  venueRight: { alignItems: 'flex-end', gap: 6 },
  venueRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  venueRating: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: '700' },
  venueGenrePill: { borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  venueGenreText: { fontSize: 9, fontWeight: '700' },

  // Pro Banner
  proBanner: {
    marginHorizontal: Spacing.lg, marginTop: Spacing.xl,
    borderRadius: BorderRadius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.primary + '33',
  },
  proGradient: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: 16, overflow: 'hidden' },
  proGlowLeft: {
    position: 'absolute', left: -30, top: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.primary + '20',
  },
  proGlowRight: {
    position: 'absolute', right: -20, bottom: -20,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryDark + '30',
  },
  proLeft: { flex: 1 },
  proEyebrow: {
    color: Colors.primaryLight, fontSize: 9, fontWeight: '800',
    letterSpacing: 2, marginBottom: 5,
  },
  proTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '900', marginBottom: 6, letterSpacing: -0.3 },
  proDesc: { color: Colors.textSecondary, fontSize: FontSize.xs, lineHeight: 18 },
  proRight: {},
  proCtaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: BorderRadius.md, paddingHorizontal: 16, paddingVertical: 11,
  },
  proCtaText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800' },
});
