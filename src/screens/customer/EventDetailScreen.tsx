import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';

const GENRE_COLORS: Record<string, readonly [string, string]> = {
  Jazz: ['#F59E0B', '#D97706'],
  Electronic: ['#8B5CF6', '#6D28D9'],
  Rock: ['#EF4444', '#B91C1C'],
  Pop: ['#EC4899', '#BE185D'],
  Akustik: ['#10B981', '#059669'],
  'Hip-Hop': ['#F97316', '#EA580C'],
  'R&B': ['#06B6D4', '#0891B2'],
};

const DEMO_ATTENDEES = [
  { name: 'Zeynep K.', colors: ['#8B5CF6', '#6D28D9'] as [string, string] },
  { name: 'Mehmet A.', colors: ['#EF4444', '#B91C1C'] as [string, string] },
  { name: 'Selin T.', colors: ['#10B981', '#059669'] as [string, string] },
  { name: 'Can B.', colors: ['#F59E0B', '#D97706'] as [string, string] },
  { name: 'Ali K.', colors: ['#EC4899', '#BE185D'] as [string, string] },
];

export default function EventDetailScreen({ route, navigation }: any) {
  const { event } = route.params ?? {
    event: {
      title: 'Electronic Night',
      venue: 'Babylon Club',
      artist: 'DJ Armin',
      date: 'Bugün',
      time: '22:00',
      genre: 'Electronic',
      attendees: 340,
      price: '₺150',
    },
  };
  const [attending, setAttending] = useState(false);

  const genreColors = GENRE_COLORS[event.genre] ?? [Colors.primary, Colors.primaryDark];
  const displayDate = event.time ? `${event.date} ${event.time}` : event.date;

  const handleAttend = () => {
    setAttending(!attending);
    if (!attending) {
      Alert.alert('Harika!', 'Etkinliğe katılım isteğiniz alındı.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient
          colors={['#0D001A', '#1A0A2E', Colors.background]}
          style={styles.hero}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>

          {/* Genre badge with genre color */}
          <LinearGradient
            colors={genreColors as any}
            style={styles.heroBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.heroBadgeText}>{event.genre}</Text>
          </LinearGradient>

          <Text style={styles.heroTitle}>{event.title}</Text>

          <View style={styles.heroMeta}>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaIcon}>
                <Ionicons name="mic-outline" size={14} color="rgba(255,255,255,0.8)" />
              </View>
              <Text style={styles.heroMetaItem}>{event.artist}</Text>
            </View>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaIcon}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
              </View>
              <Text style={styles.heroMetaItem}>{event.venue}</Text>
            </View>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaIcon}>
                <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
              </View>
              <Text style={styles.heroMetaItem}>{displayDate}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsRow}>
          <LinearGradient colors={['#1E1040', '#2D1B69']} style={styles.statCard}>
            <Text style={styles.statValue}>{event.attendees}</Text>
            <Text style={styles.statLabel}>Katılımcı</Text>
          </LinearGradient>
          <LinearGradient colors={[Colors.accent + 'CC', '#D97706CC']} style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#FFF' }]}>{event.price}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>Bilet</Text>
          </LinearGradient>
          <LinearGradient colors={['#1A2E1A', '#0F3D1F']} style={styles.statCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
              <Ionicons name="flame" size={14} color={Colors.success} />
              <Text style={[styles.statValue, { color: Colors.success }]}>Sıcak</Text>
            </View>
            <Text style={styles.statLabel}>Durum</Text>
          </LinearGradient>
        </View>

        {/* Hakkında */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Etkinlik Hakkında</Text>
          <Text style={styles.description}>
            {event.venue}'de unutulmaz bir {event.genre} gecesi! {event.artist} ile muhteşem bir müzik deneyimi yaşayın.
            Gece boyunca en iyi müzikler, ışık şovları ve dans eğlencesi sizi bekliyor.
          </Text>
        </View>

        {/* Mekan bilgisi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mekan</Text>
          <TouchableOpacity
            style={styles.infoCard}
            onPress={() => navigation.navigate('VenueDetail', { venue: { name: event.venue, city: 'İstanbul', rating: 4.7, capacity: 500 } })}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#0D3B5E', '#1A5276']} style={styles.infoCardAvatar}>
              <Text style={styles.infoCardAvatarText}>{event.venue.charAt(0)}</Text>
            </LinearGradient>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardName}>{event.venue}</Text>
              <Text style={styles.infoCardSub}>İstanbul, Türkiye</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingStars}>★★★★★</Text>
                <Text style={styles.ratingText}>4.7 · Gece Kulübü</Text>
              </View>
            </View>
            <Text style={styles.infoCardArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Sanatçı */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sanatçı</Text>
          <TouchableOpacity
            style={styles.infoCard}
            onPress={() => navigation.navigate('ArtistDetail', {
              artist: { name: event.artist, genre: event.genre, rating: 4.9, followers: '12K' }
            })}
            activeOpacity={0.8}
          >
            <LinearGradient colors={genreColors as any} style={styles.infoCardAvatar}>
              <Text style={styles.infoCardAvatarText}>{event.artist.charAt(0)}</Text>
            </LinearGradient>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardName}>{event.artist}</Text>
              <Text style={styles.infoCardSub}>{event.genre}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingStars}>★★★★★</Text>
                <Text style={styles.ratingText}>4.9 · 12K takipçi</Text>
              </View>
            </View>
            <Text style={styles.infoCardArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Katılımcılar */}
        <TouchableOpacity style={styles.section} onPress={() => navigation.navigate('EventAttendees', { event })}>
          <View style={styles.attendeesHeader}>
            <Text style={styles.sectionTitle}>Katılıyor ({event.attendees})</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.seeAttendeesText}>Tümünü Gör</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} />
            </View>
          </View>
          <View style={styles.attendeeAvatars}>
            {DEMO_ATTENDEES.map((a, i) => (
              <LinearGradient
                key={i}
                colors={a.colors}
                style={[styles.attendeeAvatar, { marginLeft: i > 0 ? -10 : 0 }]}
              >
                <Text style={styles.attendeeInitial}>{a.name.charAt(0)}</Text>
              </LinearGradient>
            ))}
            <View style={styles.attendeeMore}>
              <Text style={styles.attendeeMoreText}>+{event.attendees - 5}</Text>
            </View>
          </View>
          <Text style={styles.attendeesHint}>Pro hesapla tüm katılımcıları gör ve tanış →</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Alt buton */}
      <View style={styles.footer}>
        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>Bilet Fiyatı</Text>
          <Text style={styles.priceValue}>{event.price}</Text>
        </View>
        <TouchableOpacity
          style={styles.attendBtn}
          onPress={handleAttend}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={attending ? [Colors.success, '#059669'] : (genreColors as any)}
            style={styles.attendBtnGrad}
          >
            {attending && <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 6 }} />}
            <Text style={styles.attendBtnText}>{attending ? 'Katılıyorum' : 'Katıl'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { paddingTop: 56, paddingBottom: Spacing.xl, paddingHorizontal: Spacing.lg },
  backBtn: { marginBottom: Spacing.lg },
  backText: { color: Colors.textSecondary, fontSize: FontSize.md },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginBottom: 12,
  },
  heroBadgeText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
  heroTitle: { color: Colors.text, fontSize: 28, fontWeight: '800', marginBottom: Spacing.md },
  heroMeta: { gap: 10 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroMetaIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroMetaItem: { color: Colors.textSecondary, fontSize: FontSize.md },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: 10,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: 4 },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md },
  description: { color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 24 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
    gap: 12,
  },
  infoCardAvatar: {
    width: 52, height: 52,
    borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  infoCardAvatarText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  infoCardContent: { flex: 1 },
  infoCardName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: 2 },
  infoCardSub: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingStars: { color: Colors.accent, fontSize: 10, letterSpacing: 1 },
  ratingText: { color: Colors.textMuted, fontSize: FontSize.xs },
  infoCardArrow: { color: Colors.textMuted, fontSize: 20 },
  attendeeAvatars: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  attendeeAvatar: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  attendeeInitial: { color: '#fff', fontSize: 14, fontWeight: '800' },
  attendeeMore: {
    marginLeft: -10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    borderWidth: 2, borderColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  attendeeMoreText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  attendeesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  seeAttendeesText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
  attendeesHint: { color: Colors.textMuted, fontSize: FontSize.xs, fontStyle: 'italic' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
    gap: 16,
  },
  priceBox: { flex: 1 },
  priceLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  priceValue: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  attendBtn: { flex: 2, borderRadius: BorderRadius.md, overflow: 'hidden' },
  attendBtnGrad: { paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  attendBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});
