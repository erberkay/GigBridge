import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, onSnapshot, getDocs, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../theme';
import { PressableScale } from '../../components/common/PressableScale';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const GENRE_COLORS: Record<string, [string, string]> = {
  Electronic: ['#6C3FC5', '#3B1FA0'],
  Jazz:       ['#D97706', '#92400E'],
  'Pop Rock': ['#BE185D', '#831843'],
  Pop:        ['#DB2777', '#9D174D'],
  Akustik:    ['#047857', '#064E3B'],
  'Hip-Hop':  ['#C2410C', '#7C2D12'],
};

const ARTIST_SUGGESTIONS = [
  { id: '1', name: 'DJ Armin',      genre: 'Electronic', rating: 4.9, price: '₺4.500', attendance: '+30%' },
  { id: '2', name: 'Kerem Görsev',  genre: 'Jazz',       rating: 4.8, price: '₺3.200', attendance: '+25%' },
  { id: '3', name: 'Koray Avcı',    genre: 'Pop Rock',   rating: 4.7, price: '₺6.000', attendance: '+40%' },
];

const RECENT_ANALYTICS = [
  { label: 'Bu Hafta Katılım', value: '1.240', trend: '+12%', positive: true,  icon: 'people'         as IoniconName },
  { label: 'Ort. Puan',        value: '4.6',   trend: '+0.2', positive: true,  icon: 'star'           as IoniconName },
  { label: 'Yorum Sayısı',     value: '89',    trend: '+34',  positive: true,  icon: 'chatbubble'     as IoniconName },
  { label: 'İptal Oranı',      value: '%3',    trend: '-1%',  positive: true,  icon: 'close-circle'   as IoniconName },
];

const UPCOMING_EVENTS = [
  { id: '1', title: 'Electronic Night', artist: 'DJ Armin',     date: '10 Mart', time: '22:00', status: 'confirmed', fee: '₺14.500', genre: 'Electronic' },
  { id: '2', title: 'Jazz Evening',     artist: 'Kerem Görsev', date: '15 Mart', time: '21:00', status: 'pending',   fee: '₺9.600',  genre: 'Jazz' },
  { id: '3', title: 'Hip-Hop Night',    artist: 'Ceza',         date: '22 Mart', time: '22:30', status: 'confirmed', fee: '₺24.000', genre: 'Hip-Hop' },
  { id: '4', title: 'Pop Geceleri',     artist: 'Merve Özbey',  date: '29 Mart', time: '21:30', status: 'pending',   fee: '₺16.500', genre: 'Pop' },
];

const CALENDAR_WEEKS = [
  { week: '10–16 Mart', events: ['10 Mart — Electronic Night', '15 Mart — Jazz Evening'] },
  { week: '17–23 Mart', events: ['22 Mart — Hip-Hop Night'] },
  { week: '24–30 Mart', events: ['29 Mart — Pop Geceleri'] },
  { week: '31 Mart – 6 Nisan', events: [] },
];

const QUICK_ACTIONS: { icon: IoniconName; label: string; colors: [string, string]; onPress: string }[] = [
  { icon: 'search',         label: 'Sanatçı Bul', colors: [Colors.venueColor, '#D97706'],   onPress: 'FindArtist' },
  { icon: 'bar-chart',      label: 'Analitik',    colors: [Colors.primary, Colors.primaryDark], onPress: 'Analytics' },
  { icon: 'calendar',       label: 'Takvim',      colors: [Colors.success, '#059669'],       onPress: '__calendar' },
  { icon: 'chatbubbles',    label: 'Mesajlar',    colors: [Colors.customerColor, '#0891B2'], onPress: 'VenueMessages' },
];

export default function VenueHomeScreen({ navigation }: any) {
  const displayName = useAuthStore((s) => s.displayName);
  const userId      = useAuthStore((s) => s.userId);

  const [calendarVisible, setCalendarVisible]         = useState(false);
  const [venueEvents, setVenueEvents]                 = useState<any[]>([]);
  const [artistSuggestions, setArtistSuggestions]     = useState<any[]>([]);
  const [refreshing, setRefreshing]                   = useState(false);
  const [reloadKey, setReloadKey]                     = useState(0);

  // Mekanın kendi etkinliklerini Firestore'dan yükle
  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'events'), where('venueId', '==', userId));
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) return;
      const loaded = snap.docs.map((d) => {
        const data = d.data();
        const genreRaw = Array.isArray(data.genre) ? data.genre[0] : data.genre;
        const rawFee = data.fee ?? data.price;
        return {
          id:     d.id,
          title:  data.title ?? '',
          artist: data.artistName ?? data.artist ?? '',
          date:   data.date ?? data.dateLabel ?? '',
          time:   data.startTime ?? data.time ?? '',
          status: ['upcoming', 'live'].includes(data.status) ? 'confirmed' : (data.status ?? 'pending'),
          fee:    rawFee == null || rawFee === 0 ? 'Belirtilmemiş' : `₺${rawFee}`,
          genre:  genreRaw ?? '',
        };
      });
      setVenueEvents(loaded);
    }, (err) => console.warn('[VenueHome] events:', err));
    return () => unsub();
  }, [userId, reloadKey]);

  // Önerilen sanatçıları Firestore'dan yükle
  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, 'users'), where('userType', '==', 'artist'), limit(3));
        const snap = await getDocs(q);
        if (snap.empty) return;
        const loaded = snap.docs.map((d) => {
          const data = d.data();
          const genreRaw = Array.isArray(data.genres) ? data.genres[0] : (data.genre ?? '');
          const priceMin = data.priceMin ?? data.price;
          return {
            id:         d.id,
            name:       data.displayName ?? data.name ?? '',
            genre:      genreRaw ?? '',
            rating:     data.rating ?? 0,
            price:      priceMin != null ? `₺${priceMin}` : '',
            attendance: '—',
          };
        });
        setArtistSuggestions(loaded);
      } catch (err) { console.warn('[VenueHome] artists:', err); }
    })();
  }, [reloadKey]);

  const activeEvents  = useMemo(
    () => (venueEvents.length > 0 ? venueEvents : UPCOMING_EVENTS),
    [venueEvents],
  );
  const activeArtists = useMemo(
    () => (artistSuggestions.length > 0 ? artistSuggestions : ARTIST_SUGGESTIONS),
    [artistSuggestions],
  );

  const confirmedCount = useMemo(
    () => activeEvents.filter((e) => e.status === 'confirmed').length,
    [activeEvents],
  );
  const monthlyRevenue = useMemo(() => {
    const total = activeEvents
      .filter((e) => e.status === 'confirmed')
      .reduce((sum, e) => {
        const num = parseFloat(String(e.fee).replace(/[₺\s]/g, '').replace(/\./g, '').replace(',', '.'));
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
    return total > 0 ? `₺${total.toLocaleString('tr-TR')}` : '₺0';
  }, [activeEvents]);

  const handleQuickAction = useCallback((action: string) => {
    if (action === '__calendar') { setCalendarVisible(true); return; }
    navigation.navigate(action);
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setReloadKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.venueColor} />}
    >

      {/* ── HEADER ── */}
      <LinearGradient colors={['#1C1000', '#120C00', Colors.background]} style={styles.header}>
        <View style={styles.ambientGlow} />
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.venueName}>{displayName ?? 'Mekan'}</Text>
          </View>
          <PressableScale scaleTo={0.92} onPress={() => navigation.navigate('Notifications')} style={styles.notifBtn}>
            <LinearGradient colors={['#1E1800', '#140F00']} style={styles.notifGrad}>
              <Ionicons name="notifications-outline" size={20} color={Colors.textSecondary} />
            </LinearGradient>
          </PressableScale>
        </View>

        {/* Revenue highlight bar */}
        <View style={styles.revenueBar}>
          <View style={styles.revenueLeft}>
            <Text style={styles.revenueLabel}>Bu Ay Gelir</Text>
            <Text style={styles.revenueValue}>{monthlyRevenue}</Text>
          </View>
          <View style={styles.revenueDivider} />
          <View style={styles.revenueRight}>
            <Text style={styles.revenueLabel}>Onaylı Etkinlik</Text>
            <Text style={styles.revenueValue}>{confirmedCount}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── ANALİTİK KARTLAR ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.analyticsRow}
        style={styles.analyticsScroll}
      >
        {RECENT_ANALYTICS.map((item) => (
          <View key={item.label} style={[styles.analyticCard, Shadow.sm]}>
            <View style={[styles.analyticIconWrap, item.positive ? styles.analyticIconWrapPos : styles.analyticIconWrapNeg]}>
              <Ionicons name={item.icon} size={16} color={item.positive ? Colors.success : Colors.error} />
            </View>
            <Text style={styles.analyticValue}>{item.value}</Text>
            <Text style={styles.analyticLabel}>{item.label}</Text>
            <View style={styles.analyticTrendRow}>
              <Ionicons
                name={item.positive ? 'arrow-up' : 'arrow-down'}
                size={10}
                color={item.positive ? Colors.success : Colors.error}
              />
              <Text style={[styles.analyticTrend, item.positive ? styles.analyticTrendPos : styles.analyticTrendNeg]}>
                {item.trend}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── HIZLI AKSİYONLAR ── */}
      <View style={styles.quickActions}>
        {QUICK_ACTIONS.map((qa) => (
          <PressableScale key={qa.label} style={styles.quickAction} onPress={() => handleQuickAction(qa.onPress)} scaleTo={0.93}>
            <LinearGradient colors={qa.colors} style={styles.quickActionGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name={qa.icon} size={22} color="#fff" />
              <Text style={styles.quickLabel}>{qa.label}</Text>
            </LinearGradient>
          </PressableScale>
        ))}
      </View>

      {/* ── YAKLAŞAN ETKİNLİKLER ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>TAKVİM</Text>
            <Text style={styles.sectionTitle}>Yaklaşan Etkinlikler</Text>
          </View>
          <PressableScale onPress={() => navigation.navigate('FindArtist')} style={styles.seeAllBtn} scaleTo={0.93}>
            <Ionicons name="add-circle-outline" size={14} color={Colors.venueColor} />
            <Text style={styles.seeAllText}>Ekle</Text>
          </PressableScale>
        </View>

        {activeEvents.map((event) => {
          const gc = [...(GENRE_COLORS[event.genre] ?? ['#475569', '#1E293B'])] as [string, string];
          const isConfirmed = event.status === 'confirmed';
          return (
            <PressableScale
              key={event.id}
              style={[styles.eventRow, Shadow.sm]}
              scaleTo={0.98}
              onPress={() => Alert.alert(event.title, `Sanatçı: ${event.artist}\nTarih: ${event.date} — ${event.time}\nÜcret: ${event.fee}\nDurum: ${isConfirmed ? 'Onaylandı ✓' : 'Onay Bekliyor'}`)}
            >
              <View style={[styles.eventStatusBar, isConfirmed ? styles.eventStatusBarConfirmed : styles.eventStatusBarPending]} />
              <LinearGradient colors={gc} style={styles.eventGenreTag} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.eventGenreText}>{event.genre.substring(0, 2)}</Text>
              </LinearGradient>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <View style={styles.eventMetaRow}>
                  <Ionicons name="mic-outline" size={11} color={Colors.textSecondary} />
                  <Text style={styles.eventArtist}>{event.artist}</Text>
                </View>
              </View>
              <View style={styles.eventRight}>
                <View style={styles.eventDateRow}>
                  <Ionicons name="calendar-outline" size={11} color={Colors.textMuted} />
                  <Text style={styles.eventDate}>{event.date}</Text>
                </View>
                <Text style={styles.eventFee}>{event.fee}</Text>
                <View style={[styles.statusBadge, isConfirmed ? styles.statusBadgeConfirmed : styles.statusBadgePending]}>
                  <Text style={[styles.statusText, isConfirmed ? styles.statusTextConfirmed : styles.statusTextPending]}>
                    {isConfirmed ? 'Onaylı' : 'Bekliyor'}
                  </Text>
                </View>
              </View>
            </PressableScale>
          );
        })}
      </View>

      {/* ── ÖNERİLEN SANATÇILAR ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>SİZE ÖZEL</Text>
            <Text style={styles.sectionTitle}>Önerilen Sanatçılar</Text>
          </View>
          <PressableScale onPress={() => navigation.navigate('FindArtist')} style={styles.seeAllBtn} scaleTo={0.93}>
            <Text style={styles.seeAllText}>Tümünü Gör</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.venueColor} />
          </PressableScale>
        </View>

        {activeArtists.map((artist) => {
          const gc = [...(GENRE_COLORS[artist.genre] ?? ['#4A4A6A', '#2A2A4A'])] as [string, string];
          return (
            <PressableScale
              key={artist.id}
              style={[styles.artistCard, Shadow.sm]}
              scaleTo={0.98}
              onPress={() => navigation.navigate('FindArtist')}
            >
              <LinearGradient colors={gc} style={styles.artistAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.artistInitial}>{artist.name.charAt(0)}</Text>
              </LinearGradient>

              <View style={styles.artistInfo}>
                <Text style={styles.artistName}>{artist.name}</Text>
                <Text style={styles.artistGenre}>{artist.genre}</Text>
                <View style={styles.artistMetrics}>
                  <Ionicons name="trending-up" size={11} color={Colors.success} />
                  <Text style={styles.metricItem}>{artist.attendance} katılım</Text>
                </View>
              </View>

              <View style={styles.artistRight}>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={11} color={Colors.accent} />
                  <Text style={styles.artistRating}>{artist.rating}</Text>
                </View>
                <Text style={styles.artistPrice}>{artist.price}</Text>
                <PressableScale
                  style={styles.inviteBtn}
                  onPress={() => navigation.navigate('FindArtist')}
                  scaleTo={0.93}
                >
                  <LinearGradient colors={[Colors.venueColor, '#D97706']} style={styles.inviteBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.inviteBtnText}>Davet Et</Text>
                  </LinearGradient>
                </PressableScale>
              </View>
            </PressableScale>
          );
        })}
      </View>

      <View style={styles.bottomSpacer} />

      {/* ── TAKVİM MODAL ── */}
      <Modal visible={calendarVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Etkinlik Takvimi</Text>
                <Text style={styles.modalSub}>Mart 2026</Text>
              </View>
              <PressableScale scaleTo={0.9} onPress={() => setCalendarVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </PressableScale>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {CALENDAR_WEEKS.map((week) => (
                <View key={week.week} style={styles.calWeek}>
                  <Text style={styles.calWeekLabel}>{week.week}</Text>
                  {week.events.length === 0
                    ? <Text style={styles.calEmpty}>Etkinlik yok</Text>
                    : week.events.map((ev, i) => (
                      <View key={i} style={styles.calEventRow}>
                        <View style={[styles.calDot, styles.calDotVenue]} />
                        <Text style={styles.calEventText}>{ev}</Text>
                      </View>
                    ))
                  }
                </View>
              ))}
              <PressableScale
                style={styles.addEventBtn}
                onPress={() => { setCalendarVisible(false); navigation.navigate('FindArtist'); }}
                scaleTo={0.97}
              >
                <LinearGradient colors={[Colors.venueColor, '#D97706']} style={styles.addEventBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.addEventBtnText}>Yeni Etkinlik Ekle</Text>
                </LinearGradient>
              </PressableScale>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: { paddingTop: 56, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.lg, overflow: 'hidden' },
  ambientGlow: {
    position: 'absolute', top: -40, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: Colors.venueColor + '15',
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: Spacing.lg,
  },
  greeting: { color: Colors.textMuted, fontSize: FontSize.sm, letterSpacing: 0.3, marginBottom: 3 },
  venueName: { color: Colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  notifBtn: { borderRadius: 14, overflow: 'hidden' },
  notifGrad: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.venueColor + '33',
  },

  // Revenue bar
  revenueBar: {
    flexDirection: 'row',
    backgroundColor: Colors.venueColor + '12',
    borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.venueColor + '28',
    overflow: 'hidden',
  },
  revenueLeft: { flex: 1, padding: Spacing.md },
  revenueRight: { flex: 1, padding: Spacing.md },
  revenueDivider: { width: 1, backgroundColor: Colors.venueColor + '28' },
  revenueLabel: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: 5 },
  revenueValue: { color: Colors.venueColor, fontSize: FontSize.xl, fontWeight: '800' },
  revenueValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revenueTrendBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: Colors.success + '18',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  revenueTrend: { color: Colors.success, fontSize: 9, fontWeight: '700' },

  // Analytics
  analyticsRow: { gap: 10, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  analyticsScroll: { marginBottom: Spacing.sm },
  bottomSpacer: { height: 110 },
  analyticCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
    minWidth: 130,
  },
  analyticIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  analyticValue: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', marginBottom: 4 },
  analyticLabel: { color: Colors.textMuted, fontSize: 10, marginBottom: 6 },
  analyticTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  analyticTrend: { fontSize: FontSize.xs, fontWeight: '700' },

  // Quick Actions
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: Spacing.lg },
  quickAction: {},
  quickActionGrad: {
    width: 76, height: 76,
    borderRadius: BorderRadius.lg,
    alignItems: 'center', justifyContent: 'center',
    gap: 6,
    ...Shadow.sm,
  },
  quickLabel: { color: '#fff', fontSize: 9, fontWeight: '700', textAlign: 'center' },

  // Sections
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: Spacing.md },
  sectionEyebrow: { color: Colors.venueColor, fontSize: 10, fontWeight: '800', letterSpacing: 1.8, marginBottom: 4 },
  sectionTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '800', letterSpacing: -0.3 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  seeAllText: { color: Colors.venueColor, fontSize: FontSize.xs, fontWeight: '600' },

  // Events
  eventRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md, gap: 12,
    marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  eventStatusBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  eventGenreTag: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  eventGenreText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  eventInfo: { flex: 1 },
  eventTitle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 4 },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventArtist: { color: Colors.textSecondary, fontSize: FontSize.xs },
  eventRight: { alignItems: 'flex-end', gap: 5 },
  eventDateRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  eventDate: { color: Colors.textMuted, fontSize: 10 },
  eventFee: { color: Colors.success, fontSize: FontSize.xs, fontWeight: '700' },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusText: { fontSize: 9, fontWeight: '700' },

  // Artists
  artistCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md, gap: 12,
    marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  artistAvatar: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  artistInitial: { fontSize: 22, fontWeight: '900', color: '#fff' },
  artistInfo: { flex: 1 },
  artistName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 3 },
  artistGenre: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: 5 },
  artistMetrics: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricItem: { color: Colors.success, fontSize: FontSize.xs, fontWeight: '600' },
  artistRight: { alignItems: 'flex-end', gap: 5 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  artistRating: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: '700' },
  artistPrice: { color: Colors.success, fontSize: FontSize.xs, fontWeight: '700' },
  inviteBtn: { borderRadius: BorderRadius.sm, overflow: 'hidden' },
  inviteBtnGrad: { paddingHorizontal: 12, paddingVertical: 7, alignItems: 'center' },
  inviteBtnText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: Spacing.xl, paddingTop: Spacing.md,
    maxHeight: '78%',
    borderTopWidth: 1, borderColor: Colors.border,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: Spacing.md,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  modalTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', letterSpacing: -0.3 },
  modalSub: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 3 },
  modalCloseBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  calWeek: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  calWeekLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 8 },
  calEmpty: { color: Colors.textMuted, fontSize: FontSize.xs, fontStyle: 'italic' },
  calEventRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  calDot: { width: 6, height: 6, borderRadius: 3 },
  calEventText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  addEventBtn: { borderRadius: BorderRadius.md, overflow: 'hidden', marginTop: Spacing.sm, marginBottom: Spacing.lg },
  addEventBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  addEventBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  analyticIconWrapPos: { backgroundColor: Colors.success + '18' },
  analyticIconWrapNeg: { backgroundColor: Colors.error + '18' },
  analyticTrendPos: { color: Colors.success },
  analyticTrendNeg: { color: Colors.error },
  eventStatusBarConfirmed: { backgroundColor: Colors.success },
  eventStatusBarPending: { backgroundColor: Colors.accent },
  statusBadgeConfirmed: { backgroundColor: Colors.success + '18', borderColor: Colors.success + '44' },
  statusBadgePending: { backgroundColor: Colors.accent + '18', borderColor: Colors.accent + '44' },
  statusTextConfirmed: { color: Colors.success },
  statusTextPending: { color: Colors.accent },
  calDotVenue: { backgroundColor: Colors.venueColor },
});
