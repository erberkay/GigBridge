import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { PressableScale } from '../../components/common/PressableScale';

const TABS = ['Sanatçılar', 'Mekanlar', 'Etkinlikler'];

const GENRE_GRADIENTS: Record<string, readonly [string, string]> = {
  Electronic: ['#8B5CF6', '#6D28D9'],
  House: ['#8B5CF6', '#6D28D9'],
  Jazz: ['#F59E0B', '#D97706'],
  'Pop Rock': ['#EC4899', '#BE185D'],
  Pop: ['#EC4899', '#BE185D'],
  'Hip-Hop': ['#F97316', '#EA580C'],
  'R&B': ['#06B6D4', '#0891B2'],
};
const DEFAULT_GRAD: readonly [string, string] = [Colors.primary, Colors.primaryDark ?? Colors.primary];

const FAVE_ARTISTS = [
  { id: '1', name: 'DJ Berkay', genre: 'Electronic • House', rating: 4.9, followers: '2.4K' },
  { id: '2', name: 'Kerem Görsev', genre: 'Jazz', rating: 4.8, followers: '8K' },
  { id: '3', name: 'Koray Avcı', genre: 'Pop Rock', rating: 4.7, followers: '45K' },
  { id: '4', name: 'Ceza', genre: 'Hip-Hop', rating: 4.8, followers: '120K' },
];

const FAVE_VENUES = [
  { id: '1', name: 'Babylon Club', city: 'İstanbul • Beyoğlu', rating: 4.8, capacity: 600, genre: 'Electronic, Pop' },
  { id: '2', name: 'Nardis Jazz', city: 'İstanbul • Galata', rating: 4.9, capacity: 150, genre: 'Jazz' },
  { id: '3', name: "Berkay Er'in Sahnesi", city: 'Aydın • Kuşadası', rating: 5.0, capacity: 300, genre: 'Electronic' },
];

const FAVE_EVENTS = [
  { id: '1', title: 'Jazz Gecesi', venue: 'Babylon Club', artist: 'Kerem Görsev', date: '20 Mart • 21:00', genre: 'Jazz', price: 'Ücretsiz' },
  { id: '2', title: 'Electronic Night', venue: 'Zorlu PSM', artist: 'Kolsch', date: '25 Mart • 22:00', genre: 'Electronic', price: '₺150' },
  { id: '3', title: 'DJ Berkay Live Set', venue: "Berkay Er'in Sahnesi", artist: 'DJ Berkay', date: 'Her C.tesi • 23:00', genre: 'Electronic', price: '₺200' },
];

function getGrad(genre: string): readonly [string, string] {
  const key = Object.keys(GENRE_GRADIENTS).find((k) => genre.includes(k));
  return key ? GENRE_GRADIENTS[key] : DEFAULT_GRAD;
}

export default function FavoritesScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState(0);
  const [artists, setArtists] = useState(FAVE_ARTISTS);
  const [venues, setVenues] = useState(FAVE_VENUES);
  const [events, setEvents] = useState(FAVE_EVENTS);

  const removeArtist = (id: string) => {
    Alert.alert('Favorilerden Kaldır', 'Bu sanatçıyı favorilerden kaldırmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Kaldır', style: 'destructive', onPress: () => setArtists((p) => p.filter((a) => a.id !== id)) },
    ]);
  };
  const removeVenue = (id: string) => {
    Alert.alert('Favorilerden Kaldır', 'Bu mekanı favorilerden kaldırmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Kaldır', style: 'destructive', onPress: () => setVenues((p) => p.filter((v) => v.id !== id)) },
    ]);
  };
  const removeEvent = (id: string) => {
    Alert.alert('Favorilerden Kaldır', 'Bu etkinliği favorilerden kaldırmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Kaldır', style: 'destructive', onPress: () => setEvents((p) => p.filter((e) => e.id !== id)) },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1A0A2E', Colors.background]} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Favorilerim</Text>
          <View style={styles.totalBadge}>
            <Ionicons name="heart" size={12} color={Colors.error} />
            <Text style={styles.totalBadgeText}>{artists.length + venues.length + events.length}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Sekmeler */}
      <View style={styles.tabs}>
        {TABS.map((tab, i) => (
          <PressableScale
            key={tab}
            style={[styles.tab, activeTab === i && styles.tabActive]}
            onPress={() => setActiveTab(i)}
            scaleTo={0.95}
          >
            <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{tab}</Text>
            <View style={[styles.tabCountBadge, activeTab === i && styles.tabCountBadgeActive]}>
              <Text style={[styles.tabCount, activeTab === i && { color: Colors.primary }]}>
                {i === 0 ? artists.length : i === 1 ? venues.length : events.length}
              </Text>
            </View>
          </PressableScale>
        ))}
      </View>

      {/* Sanatçılar */}
      {activeTab === 0 && (
        <FlatList
          data={artists}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState iconName="mic-outline" text="Favori sanatçı yok." />}
          renderItem={({ item }) => {
            const gc = getGrad(item.genre);
            return (
              <PressableScale
                style={styles.card}
                onPress={() => navigation.navigate('ArtistDetail', { artist: item })}
                scaleTo={0.97}
              >
                <LinearGradient colors={gc as any} style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.sub}>{item.genre}</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Ionicons name="star" size={11} color={Colors.accent} />
                      <Text style={styles.stat}>{item.rating}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="people-outline" size={11} color={Colors.textSecondary} />
                      <Text style={styles.stat}>{item.followers}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeArtist(item.id)}>
                  <Ionicons name="heart" size={22} color={Colors.error} />
                </TouchableOpacity>
              </PressableScale>
            );
          }}
        />
      )}

      {/* Mekanlar */}
      {activeTab === 1 && (
        <FlatList
          data={venues}
          keyExtractor={(v) => v.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState iconName="business-outline" text="Favori mekan yok." />}
          renderItem={({ item }) => {
            const gc = getGrad(item.genre);
            return (
              <PressableScale
                style={styles.card}
                onPress={() => navigation.navigate('VenueDetail', { venue: item })}
                scaleTo={0.97}
              >
                <LinearGradient colors={gc as any} style={[styles.avatar, { borderRadius: 14 }]}>
                  <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
                    <Text style={styles.sub}>{item.city}</Text>
                  </View>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Ionicons name="star" size={11} color={Colors.accent} />
                      <Text style={styles.stat}>{item.rating}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="people-outline" size={11} color={Colors.textSecondary} />
                      <Text style={styles.stat}>{item.capacity} kişi</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeVenue(item.id)}>
                  <Ionicons name="heart" size={22} color={Colors.error} />
                </TouchableOpacity>
              </PressableScale>
            );
          }}
        />
      )}

      {/* Etkinlikler */}
      {activeTab === 2 && (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState iconName="ticket-outline" text="Favori etkinlik yok." />}
          renderItem={({ item }) => {
            const gc = getGrad(item.genre);
            return (
              <PressableScale
                style={styles.eventCard}
                onPress={() => navigation.navigate('EventDetail', { event: item })}
                scaleTo={0.97}
              >
                <LinearGradient colors={gc as any} style={styles.eventBanner}>
                  <Text style={styles.eventBannerLetter}>{item.title.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
                <View style={styles.eventInfo}>
                  <Text style={styles.name} numberOfLines={1}>{item.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <Ionicons name="mic-outline" size={11} color={Colors.textSecondary} />
                    <Text style={styles.sub} numberOfLines={1}>{item.artist}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
                    <Text style={styles.sub} numberOfLines={1}>{item.venue}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="time-outline" size={11} color={Colors.textMuted} />
                    <Text style={[styles.stat]}>{item.date}</Text>
                  </View>
                </View>
                <View style={styles.eventRight}>
                  <Text style={[styles.eventPrice, item.price === 'Ücretsiz' && { color: Colors.success }]}>{item.price}</Text>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeEvent(item.id)}>
                    <Ionicons name="heart" size={22} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </PressableScale>
            );
          }}
        />
      )}
    </View>
  );
}

function EmptyState({ iconName, text }: { iconName: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={iconName} size={48} color={Colors.textMuted} style={{ marginBottom: 16 }} />
      <Text style={styles.emptyText}>{text}</Text>
      <Text style={styles.emptySubText}>Sanatçı, mekan veya etkinlik sayfalarında kalp simgesine basarak ekleyebilirsiniz.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  backBtn: { marginBottom: Spacing.sm, padding: 4, alignSelf: 'flex-start' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800' },
  totalBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.error + '22',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.error + '44',
  },
  totalBadgeText: { color: Colors.error, fontSize: FontSize.xs, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: 8,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  tabActive: { backgroundColor: Colors.primary + '22', borderColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  tabCountBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  tabCountBadgeActive: { backgroundColor: Colors.primary + '33' },
  tabCount: { color: Colors.textMuted, fontSize: FontSize.xs },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 110, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
    gap: 12,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  info: { flex: 1 },
  name: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 2 },
  sub: { color: Colors.textMuted, fontSize: FontSize.xs },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stat: { color: Colors.textSecondary, fontSize: FontSize.xs },
  removeBtn: { padding: 4 },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  eventBanner: { width: 56, alignItems: 'center', justifyContent: 'center' },
  eventBannerLetter: { fontSize: 22, fontWeight: '900', color: 'rgba(255,255,255,0.95)' },
  eventInfo: { flex: 1, padding: 12 },
  eventRight: { alignItems: 'flex-end', justifyContent: 'space-between', padding: 12 },
  eventPrice: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600', marginBottom: 8 },
  emptySubText: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
});
