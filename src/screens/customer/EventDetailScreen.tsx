import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc, deleteDoc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
// ERR-EVENTDETAIL-001 Katılım kaydedilemedi
const ERR = { ATTEND_FAILED: 'ERR-EVENTDETAIL-001' } as const;

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

const DEFAULT_EVENT = {
  title: 'Electronic Night', venue: 'Babylon Club', artist: 'DJ Armin',
  date: 'Bugün', time: '22:00', genre: 'Electronic', attendees: 340, price: '₺150',
};

export default function EventDetailScreen({ route, navigation }: any) {
  const event = route.params?.event ?? DEFAULT_EVENT;
  const userId      = useAuthStore((s) => s.userId);
  const displayName = useAuthStore((s) => s.displayName);
  const [attending, setAttending] = useState(false);
  const [attendLoading, setAttendLoading] = useState(false);

  const eventId = event.id ?? event.title;
  const genreColors = GENRE_COLORS[event.genre] ?? [Colors.primary, Colors.primaryDark];
  const displayDate = event.time ? `${event.date} ${event.time}` : event.date;

  // Kullanıcının katılım durumunu yükle
  useEffect(() => {
    if (!userId || userId.startsWith('demo_')) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'events', eventId, 'attendees', userId));
        setAttending(snap.exists());
      } catch { /* sessizce geç */ }
    })();
  }, [eventId, userId]);

  const handleAttend = useCallback(async () => {
    if (!userId || userId.startsWith('demo_')) {
      Alert.alert('Giriş Gerekli', 'Etkinliğe katılmak için giriş yapmalısınız.');
      return;
    }
    setAttendLoading(true);
    try {
      const attendeeRef = doc(db, 'events', eventId, 'attendees', userId);
      const eventRef = doc(db, 'events', eventId);
      if (!attending) {
        await setDoc(attendeeRef, { userId, displayName: displayName ?? '', joinedAt: serverTimestamp() });
        try { await updateDoc(eventRef, { attendeeCount: increment(1) }); } catch { /* event olmayabilir */ }
        setAttending(true);
        Alert.alert('Harika!', 'Etkinliğe katılım isteğiniz alındı.');
      } else {
        await deleteDoc(attendeeRef);
        try { await updateDoc(eventRef, { attendeeCount: increment(-1) }); } catch { /* event olmayabilir */ }
        setAttending(false);
      }
    } catch {
      Alert.alert('Hata', `Katılım kaydedilemedi. (${ERR.ATTEND_FAILED})`);
    } finally {
      setAttendLoading(false);
    }
  }, [userId, displayName, eventId, attending]);

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
            colors={[...genreColors]}
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
            <Ionicons name="people" size={16} color="#A78BFA" style={styles.statIcon} />
            <Text style={styles.statValue}>{event.attendees}</Text>
            <Text style={styles.statLabel}>Katılımcı</Text>
          </LinearGradient>
          <LinearGradient colors={[Colors.accent + 'CC', '#D97706CC']} style={styles.statCard}>
            <Ionicons name="ticket-outline" size={16} color="#fff" style={styles.statIcon} />
            <Text style={[styles.statValue, styles.statValueWhite]}>{event.price}</Text>
            <Text style={[styles.statLabel, styles.statLabelWhite]}>Bilet</Text>
          </LinearGradient>
          <LinearGradient colors={['#1A2E1A', '#0F3D1F']} style={styles.statCard}>
            <Ionicons name="flame" size={16} color={Colors.success} style={styles.statIcon} />
            <Text style={[styles.statValue, styles.statValueSuccess]}>Sıcak</Text>
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
            onPress={() => navigation.navigate('VenueDetail', { venue: { name: event.venue } })}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#0D3B5E', '#1A5276']} style={styles.infoCardAvatar}>
              <Text style={styles.infoCardAvatarText}>{event.venue?.charAt(0)?.toUpperCase() ?? 'M'}</Text>
            </LinearGradient>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardName}>{event.venue}</Text>
              <Text style={styles.infoCardSub}>İstanbul, Türkiye</Text>
              <View style={styles.ratingRow}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Ionicons key={i} name="star" size={10} color={Colors.accent} />
                ))}
                <Text style={styles.ratingText}>4.7 · Gece Kulübü</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
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
            <LinearGradient colors={[...genreColors]} style={styles.infoCardAvatar}>
              <Text style={styles.infoCardAvatarText}>{event.artist?.charAt(0)?.toUpperCase() ?? 'S'}</Text>
            </LinearGradient>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardName}>{event.artist}</Text>
              <Text style={styles.infoCardSub}>{event.genre}</Text>
              <View style={styles.ratingRow}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Ionicons key={i} name="star" size={10} color={Colors.accent} />
                ))}
                <Text style={styles.ratingText}>4.9 · 12K takipçi</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Katılımcılar */}
        <TouchableOpacity style={styles.section} onPress={() => navigation.navigate('EventAttendees', { event })}>
          <View style={styles.attendeesHeader}>
            <Text style={styles.sectionTitle}>Katılıyor ({event.attendees})</Text>
            <View style={styles.seeAllRow}>
              <Text style={styles.seeAttendeesText}>Tümünü Gör</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} />
            </View>
          </View>
          <View style={styles.attendeeAvatars}>
            {DEMO_ATTENDEES.map((a, i) => (
              <LinearGradient
                key={i}
                colors={a.colors}
                style={[styles.attendeeAvatar, i > 0 && styles.attendeeAvatarOverlap]}
              >
                <Text style={styles.attendeeInitial}>{a.name?.charAt(0)?.toUpperCase() ?? '?'}</Text>
              </LinearGradient>
            ))}
            <View style={styles.attendeeMore}>
              <Text style={styles.attendeeMoreText}>+{Math.max(0, event.attendees - DEMO_ATTENDEES.length)}</Text>
            </View>
          </View>
          <Text style={styles.attendeesHint}>Pro hesapla tüm katılımcıları gör ve tanış →</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
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
          disabled={attendLoading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={attending ? [Colors.success, '#059669'] : [...genreColors]}
            style={[styles.attendBtnGrad, attendLoading && { opacity: 0.6 }]}
          >
            {attending && !attendLoading && <Ionicons name="checkmark-circle" size={18} color="#fff" style={styles.attendIcon} />}
            <Text style={styles.attendBtnText}>
              {attendLoading ? 'Yükleniyor...' : attending ? 'Katılıyorum' : 'Katıl'}
            </Text>
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
  statIcon: { marginBottom: 4 },
  statValue: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: 4 },
  statValueWhite: { color: '#FFF' },
  statValueSuccess: { color: Colors.success },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  statLabelWhite: { color: 'rgba(255,255,255,0.7)' },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: {
    color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md,
    paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
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
  ratingText: { color: Colors.textMuted, fontSize: FontSize.xs },
  attendeeAvatars: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  attendeeAvatar: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  attendeeAvatarOverlap: { marginLeft: -10 },
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
  seeAllRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
  attendBtn: { flex: 2, borderRadius: 10, overflow: 'hidden' },
  attendBtnGrad: { paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  attendBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  bottomSpacer: { height: 100 },
  attendIcon: { marginRight: 6 },
});
