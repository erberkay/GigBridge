import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ERR-ANALYTICS-001 Firestore sorgu hatası
const ERR = { FIRESTORE_QUERY: 'ERR-ANALYTICS-001' } as const;

const { width } = Dimensions.get('window');
const PERIODS = ['Bu Hafta', 'Bu Ay', '3 Ay', '1 Yıl'];

const DEMO_METRICS = {
  'Bu Hafta': { totalAttendance: 842, avgNight: 280, totalRevenue: 126300, avgRating: 4.6, newCustomers: 312, repeatRate: 63, cancelRate: 3 },
  'Bu Ay':    { totalAttendance: 3240, avgNight: 270, totalRevenue: 486000, avgRating: 4.7, newCustomers: 1180, repeatRate: 64, cancelRate: 2 },
  '3 Ay':     { totalAttendance: 9780, avgNight: 265, totalRevenue: 1467000, avgRating: 4.6, newCustomers: 3420, repeatRate: 65, cancelRate: 4 },
  '1 Yıl':    { totalAttendance: 38400, avgNight: 256, totalRevenue: 5760000, avgRating: 4.5, newCustomers: 14200, repeatRate: 63, cancelRate: 5 },
} as const;

const DEMO_GENRE_DATA = [
  { genre: 'Electronic', percent: 42, color: Colors.primary },
  { genre: 'Jazz', percent: 28, color: Colors.customerColor },
  { genre: 'Pop Rock', percent: 18, color: Colors.venueColor },
  { genre: 'Diğer', percent: 12, color: Colors.textMuted },
];

const DEMO_ARTISTS_BY_PERIOD: Record<string, { name: string; genre: string; attendance: number; rating: string; revenueLabel: string; trend: string }[]> = {
  'Bu Hafta': [
    { name: 'DJ Berkay', genre: 'Electronic', attendance: 380, rating: '4.9', revenueLabel: '₺76.000', trend: '+18%' },
    { name: 'Kerem Görsev', genre: 'Jazz', attendance: 290, rating: '4.8', revenueLabel: '₺52.200', trend: '+12%' },
    { name: 'Koray Avcı', genre: 'Pop Rock', attendance: 245, rating: '4.7', revenueLabel: '₺44.100', trend: '+8%' },
  ],
  'Bu Ay': [
    { name: 'DJ Berkay', genre: 'Electronic', attendance: 1520, rating: '4.9', revenueLabel: '₺304.000', trend: '+22%' },
    { name: 'Kerem Görsev', genre: 'Jazz', attendance: 1140, rating: '4.8', revenueLabel: '₺205.200', trend: '+15%' },
    { name: 'Koray Avcı', genre: 'Pop Rock', attendance: 890, rating: '4.7', revenueLabel: '₺160.200', trend: '+9%' },
  ],
  '3 Ay': [
    { name: 'DJ Berkay', genre: 'Electronic', attendance: 4600, rating: '4.9', revenueLabel: '₺920.000', trend: '+19%' },
    { name: 'Koray Avcı', genre: 'Pop Rock', attendance: 3200, rating: '4.7', revenueLabel: '₺576.000', trend: '+11%' },
    { name: 'Kerem Görsev', genre: 'Jazz', attendance: 2980, rating: '4.8', revenueLabel: '₺536.400', trend: '+7%' },
  ],
  '1 Yıl': [
    { name: 'DJ Berkay', genre: 'Electronic', attendance: 18200, rating: '4.9', revenueLabel: '₺3.640.000', trend: '+31%' },
    { name: 'Koray Avcı', genre: 'Pop Rock', attendance: 12400, rating: '4.7', revenueLabel: '₺2.232.000', trend: '+14%' },
    { name: 'Ceza', genre: 'Hip-Hop', attendance: 9800, rating: '4.8', revenueLabel: '₺1.960.000', trend: '+28%' },
  ],
};

const GENRE_GRAD_COLORS: Record<string, [string, string]> = {
  Electronic: ['#6C3FC5', '#3B1FA0'],
  Jazz: ['#1A6B4A', '#0D4A32'],
  'Pop Rock': ['#C53F7A', '#8B1A4A'],
  Pop: ['#C5713F', '#8B4A1A'],
  Akustik: ['#3F8BC5', '#1A5A8B'],
  'Hip-Hop': ['#8B3FC5', '#5A1A8B'],
};

const DEMO_WEEKLY_BARS = [
  { day: 'Pzt', value: 45 },
  { day: 'Sal', value: 30 },
  { day: 'Çar', value: 55 },
  { day: 'Per', value: 70 },
  { day: 'Cum', value: 95 },
  { day: 'Cmt', value: 100 },
  { day: 'Paz', value: 80 },
];

const DEMO_PEAK_HOURS = [
  { hour: '20:00', value: 40 },
  { hour: '21:00', value: 65 },
  { hour: '22:00', value: 88 },
  { hour: '23:00', value: 100 },
  { hour: '00:00', value: 95 },
  { hour: '01:00', value: 72 },
  { hour: '02:00', value: 45 },
];

const DEMO_REVIEWS = { avg: 4.7, distribution: [72, 18, 6, 3, 1], total: 284 };

const DEMO_RECENT_REVIEWS = [
  { author: 'Zeynep K.', rating: 5, text: 'Muhteşem ses sistemi ve atmosfer!', time: '2 gün önce' },
  { author: 'Mehmet A.', rating: 5, text: 'DJ Berkay\'ın seti inanılmazdı.', time: '5 gün önce' },
  { author: 'Selin T.', rating: 4, text: 'Harika gece, personel çok ilgiliydi.', time: '1 hafta önce' },
];

const GENRE_COLORS: Record<string, string> = {
  Electronic: Colors.primary,
  Jazz: Colors.customerColor,
  'Pop Rock': Colors.venueColor,
  Diğer: Colors.textMuted,
};

const AVATAR_COLORS: [string, string][] = [
  ['#6C3FC5', '#3B1FA0'], ['#C53F7A', '#8B1A4A'], ['#3FC5A0', '#1A8B6B'],
  ['#C5713F', '#8B4A1A'], ['#3F8BC5', '#1A5A8B'], ['#8B3FC5', '#5A1A8B'],
];
function getAvatarGrad(name: string): [string, string] {
  return AVATAR_COLORS[((name?.charCodeAt(0) || 65)) % AVATAR_COLORS.length];
}

function getPeriodStart(period: string): Date {
  const now = new Date();
  switch (period) {
    case 'Bu Hafta': return new Date(now.getTime() - 7 * 86400000);
    case 'Bu Ay': return new Date(now.getTime() - 30 * 86400000);
    case '3 Ay': return new Date(now.getTime() - 90 * 86400000);
    default: return new Date(now.getTime() - 365 * 86400000);
  }
}

export default function AnalyticsScreen() {
  const userId = useAuthStore((s) => s.userId);
  const [selectedPeriod, setSelectedPeriod] = useState('Bu Ay');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ totalAttendance: 0, avgNight: 0, totalRevenue: 0, avgRating: 0, newCustomers: 0, repeatRate: 0, cancelRate: 0 });
  const [genreData, setGenreData] = useState<{ genre: string; percent: number; color: string }[]>([]);
  const [artistPerfs, setArtistPerfs] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState({ avg: 0, distribution: [0, 0, 0, 0, 0], total: 0 });
  const [recentReviews, setRecentReviews] = useState(DEMO_RECENT_REVIEWS);

  const loadAnalytics = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const since = Timestamp.fromDate(getPeriodStart(selectedPeriod));
      const eventsSnap = await getDocs(
        query(collection(db, 'events'), where('venueId', '==', userId), where('createdAt', '>=', since)),
      );
      const events = eventsSnap.docs.map((d) => d.data());
      const totalAttendance = events.reduce((s, e) => s + (e.attendeeCount ?? 0), 0);
      const avgNight = events.length > 0 ? Math.round(totalAttendance / events.length) : 0;
      const totalRevenue = events.reduce((s, e) => s + ((e.ticketPrice ?? 0) * (e.attendeeCount ?? 0)), 0);

      const genreCount: Record<string, number> = {};
      events.forEach((e) => {
        const g = e.genre?.[0] ?? 'Diğer';
        genreCount[g] = (genreCount[g] ?? 0) + (e.attendeeCount ?? 0);
      });
      const totalForGenre = Math.max(1, Object.values(genreCount).reduce((a, b) => a + b, 0));
      const genreBreakdown = Object.entries(genreCount)
        .sort((a, b) => b[1] - a[1]).slice(0, 4)
        .map(([genre, count]) => ({ genre, percent: Math.round((count / totalForGenre) * 100), color: GENRE_COLORS[genre] ?? Colors.textMuted }));

      const artistMap: Record<string, any> = {};
      events.forEach((e) => {
        if (!e.artistId) return;
        if (!artistMap[e.artistId]) artistMap[e.artistId] = { name: e.artistName ?? 'Sanatçı', genre: e.genre?.[0] ?? '', attendance: 0, revenue: 0 };
        artistMap[e.artistId].attendance += e.attendeeCount ?? 0;
        artistMap[e.artistId].revenue += (e.ticketPrice ?? 0) * (e.attendeeCount ?? 0);
      });
      const topArtists = Object.values(artistMap)
        .sort((a, b) => b.attendance - a.attendance).slice(0, 3)
        .map((a) => ({ ...a, rating: '—', revenueLabel: `₺${a.revenue.toLocaleString('tr-TR')}`, trend: '+0%' }));

      const reviewsSnap = await getDocs(query(collection(db, 'venueReviews'), where('venueId', '==', userId)));
      const reviews = reviewsSnap.docs.map((d) => d.data());
      const dist = [0, 0, 0, 0, 0];
      let ratingSum = 0;
      reviews.forEach((r) => {
        const star = Math.round(r.overallRating ?? 0);
        if (star >= 1 && star <= 5) dist[star - 1]++;
        ratingSum += r.overallRating ?? 0;
      });
      const avgRating = reviews.length > 0 ? ratingSum / reviews.length : 0;
      const total = reviews.length || 1;
      const distPercent = [...dist].reverse().map((v) => Math.round((v / total) * 100));

      const hasRealData = events.length > 0 || reviews.length > 0;
      const demo = DEMO_METRICS[selectedPeriod as keyof typeof DEMO_METRICS] ?? DEMO_METRICS['Bu Ay'];
      if (hasRealData) {
        setMetrics({ totalAttendance, avgNight, totalRevenue, avgRating: parseFloat(avgRating.toFixed(1)), newCustomers: demo.newCustomers, repeatRate: demo.repeatRate, cancelRate: demo.cancelRate });
        setGenreData(genreBreakdown.length > 0 ? genreBreakdown : DEMO_GENRE_DATA);
        setArtistPerfs(topArtists.length > 0 ? topArtists : DEMO_ARTISTS_BY_PERIOD[selectedPeriod] ?? []);
        setReviewStats({ avg: parseFloat(avgRating.toFixed(1)), distribution: distPercent, total: reviews.length });
        if (reviews.length > 0) {
          setRecentReviews(reviews.slice(0, 3).map((r) => ({
            author: r.isAnonymous ? 'Anonim Sanatçı' : (r.artistName ?? 'Anonim'),
            rating: Math.round(r.overallRating ?? 0),
            text: r.comment ?? r.text ?? '',
            time: r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString('tr-TR') : 'Yakın zamanda',
          })));
        }
      } else {
        setMetrics(demo);
        setGenreData(DEMO_GENRE_DATA);
        setArtistPerfs(DEMO_ARTISTS_BY_PERIOD[selectedPeriod] ?? []);
        setReviewStats(DEMO_REVIEWS);
        setRecentReviews(DEMO_RECENT_REVIEWS);
      }
    } catch {
      console.warn(`[${ERR.FIRESTORE_QUERY}] Analytics verisi yüklenemedi, demo gösteriliyor.`);
      const demo = DEMO_METRICS[selectedPeriod as keyof typeof DEMO_METRICS] ?? DEMO_METRICS['Bu Ay'];
      setMetrics(demo);
      setGenreData(DEMO_GENRE_DATA);
      setArtistPerfs(DEMO_ARTISTS_BY_PERIOD[selectedPeriod] ?? []);
      setReviewStats(DEMO_REVIEWS);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedPeriod]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#1A0A00', Colors.background]} style={styles.header}>
        <Text style={styles.headerTitle}>Analitik</Text>
        <Text style={styles.headerSub}>Mekanınızın tüm performans verileri</Text>
      </LinearGradient>

      {/* Dönem seçici */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodScroll} contentContainerStyle={styles.periodContent}>
        {PERIODS.map((p) => (
          <TouchableOpacity key={p} style={[styles.periodChip, selectedPeriod === p && styles.periodChipActive]} onPress={() => setSelectedPeriod(p)}>
            <Text style={[styles.periodText, selectedPeriod === p && styles.periodTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={Colors.venueColor} style={styles.loader} />
      ) : (
        <>
          {/* Ana metrikler — 2x2 grid */}
          <View style={styles.metricsGrid}>
            <MetricCard label="Toplam Katılım" value={metrics.totalAttendance.toLocaleString('tr-TR')} iconName="people-outline" color={Colors.primary} />
            <MetricCard label="Ort. Gece Katılımı" value={metrics.avgNight.toString()} iconName="moon-outline" color={Colors.customerColor} />
            <MetricCard label="Toplam Gelir" value={metrics.totalRevenue > 0 ? `₺${(metrics.totalRevenue / 1000).toFixed(0)}K` : '—'} iconName="cash-outline" color={Colors.success} />
            <MetricCard label="Ort. Puan" value={metrics.avgRating > 0 ? metrics.avgRating.toString() : '—'} iconName="star-outline" color={Colors.accent} />
          </View>

          {/* İkincil metrikler */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.secondaryMetrics} style={styles.secondaryMetricsScroll}>
            <SecondaryMetric iconName="person-add-outline" label="Yeni Müşteri" value={metrics.newCustomers.toLocaleString('tr-TR')} />
            <SecondaryMetric iconName="refresh-outline" label="Tekrar Ziyaret" value={`%${metrics.repeatRate}`} />
            <SecondaryMetric iconName="close-circle-outline" label="İptal Oranı" value={`%${metrics.cancelRate}`} valueColor={Colors.error} />
            <SecondaryMetric iconName="ticket-outline" label="Etkinlik Sayısı" value={selectedPeriod === 'Bu Hafta' ? '3' : selectedPeriod === 'Bu Ay' ? '12' : selectedPeriod === '3 Ay' ? '37' : '142'} />
            <SecondaryMetric iconName="phone-portrait-outline" label="Online Bilet" value="%68" />
          </ScrollView>

          {/* Haftalık doluluk grafiği */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="bar-chart-outline" size={16} color={Colors.venueColor} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Günlük Doluluk Trendi</Text>
            </View>
            <View style={styles.barChartCard}>
              {DEMO_WEEKLY_BARS.map((bar) => (
                <View key={bar.day} style={styles.barCol}>
                  <Text style={styles.barValue}>{bar.value}%</Text>
                  <View style={styles.barWrapper}>
                    <LinearGradient
                      colors={[Colors.venueColor, Colors.venueColor + '88']}
                      style={[styles.bar, { height: `${bar.value}%` as any }]}
                    />
                  </View>
                  <Text style={styles.barDay}>{bar.day}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Peak saatler */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="time-outline" size={16} color={Colors.venueColor} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Yoğun Saatler</Text>
            </View>
            <View style={styles.peakCard}>
              {DEMO_PEAK_HOURS.map((h) => (
                <View key={h.hour} style={styles.peakRow}>
                  <Text style={styles.peakHour}>{h.hour}</Text>
                  <View style={styles.peakBarWrapper}>
                    <View style={[styles.peakBar, { width: `${h.value}%` as any, backgroundColor: h.value >= 90 ? Colors.success : h.value >= 60 ? Colors.accent : Colors.primary }]} />
                  </View>
                  <Text style={styles.peakValue}>{h.value}%</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Müzik türü dağılımı */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="musical-notes-outline" size={16} color={Colors.venueColor} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Müzik Türü Dağılımı</Text>
            </View>
            <View style={styles.genreCard}>
              {genreData.map((item) => (
                <View key={item.genre} style={styles.genreRow}>
                  <Text style={styles.genreLabel}>{item.genre}</Text>
                  <View style={styles.genreBarWrapper}>
                    <View style={[styles.genreBar, { width: `${item.percent}%` as any, backgroundColor: item.color }]} />
                  </View>
                  <Text style={[styles.genrePercent, { color: item.color }]}>{item.percent}%</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Cinsiyet ve yaş dağılımı */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="people-outline" size={16} color={Colors.venueColor} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Kitle Demografisi</Text>
            </View>
            <View style={styles.demoCard}>
              <View style={styles.demoRow}>
                <Text style={styles.demoLabel}>Cinsiyet</Text>
                <View style={styles.genderBar}>
                  <View style={[styles.genderSegment, styles.genderSegmentMale]} />
                  <View style={[styles.genderSegment, styles.genderSegmentFemale]} />
                </View>
                <View style={styles.genderLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, styles.legendDotMale]} />
                    <Text style={styles.legendText}>Erkek 52%</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, styles.legendDotFemale]} />
                    <Text style={styles.legendText}>Kadın 48%</Text>
                  </View>
                </View>
              </View>
              <View style={styles.divider} />
              <Text style={styles.demoLabel}>Yaş Dağılımı</Text>
              <View style={styles.ageRow}>
                {[{ label: '18-24', v: 28 }, { label: '25-34', v: 42 }, { label: '35-44', v: 21 }, { label: '45+', v: 9 }].map((a) => (
                  <View key={a.label} style={styles.ageItem}>
                    <Text style={styles.agePercent}>{a.v}%</Text>
                    <View style={styles.ageBarWrapper}>
                      <View style={[styles.ageBar, { height: `${a.v}%` as any }]} />
                    </View>
                    <Text style={styles.ageLabel}>{a.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Sanatçı performansları */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="mic-outline" size={16} color={Colors.venueColor} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Sanatçı Performansları</Text>
            </View>
            {artistPerfs.length === 0 ? (
              <View style={styles.emptyArtists}>
                <Ionicons name="mail-open-outline" size={20} color={Colors.textMuted} style={styles.sectionIcon} />
                <Text style={styles.emptyArtistsText}>Bu dönem için sanatçı verisi yok</Text>
              </View>
            ) : artistPerfs.map((artist, i) => (
              <View key={artist.name} style={styles.artistPerfCard}>
                <View style={styles.artistPerfRank}>
                  <Text style={styles.rankText}>#{i + 1}</Text>
                </View>
                <View style={styles.artistPerfAvatar}>
                  <LinearGradient
                    colors={[...(GENRE_GRAD_COLORS[artist.genre] ?? ['#4A4A6A', '#2A2A4A'])] as [string, string]}
                    style={styles.artistPerfAvatarGrad}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.artistPerfAvatarInitial}>{artist.name.charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                </View>
                <View style={styles.artistPerfInfo}>
                  <Text style={styles.artistPerfName}>{artist.name}</Text>
                  <Text style={styles.artistPerfGenre}>{artist.genre}</Text>
                  <View style={styles.artistPerfAttendanceRow}>
                    <Ionicons name="people-outline" size={11} color={Colors.textSecondary} />
                    <Text style={styles.artistPerfAttendance}> {artist.attendance.toLocaleString('tr-TR')} katılımcı</Text>
                  </View>
                </View>
                <View style={styles.artistPerfStats}>
                  <Text style={styles.artistPerfTrend}>{artist.trend}</Text>
                  <View style={styles.artistPerfRatingRow}>
                    <Ionicons name="star" size={11} color={Colors.accent} />
                    <Text style={styles.artistPerfRating}> {artist.rating}</Text>
                  </View>
                  <Text style={styles.artistPerfRevenue}>{artist.revenueLabel}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Yorum analizi */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="star-outline" size={16} color={Colors.venueColor} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Yorum & Puanlama</Text>
            </View>
            <View style={styles.reviewAnalysisCard}>
              <View style={styles.reviewScore}>
                <Text style={styles.reviewScoreValue}>{reviewStats.avg > 0 ? reviewStats.avg : '—'}</Text>
                <Text style={styles.reviewScoreLabel}>Ortalama Puan</Text>
                <View style={styles.reviewStarsRow}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Ionicons key={i} name="star" size={10} color={Colors.accent} />
                  ))}
                </View>
                <Text style={styles.reviewTotal}>{reviewStats.total} değerlendirme</Text>
              </View>
              <View style={styles.reviewBars}>
                {[5, 4, 3, 2, 1].map((star, idx) => (
                  <View key={star} style={styles.starRow}>
                    <View style={styles.starLabelRow}>
                      <Text style={styles.starLabelNum}>{star}</Text>
                      <Ionicons name="star" size={9} color={Colors.accent} />
                    </View>
                    <View style={styles.starBarWrapper}>
                      <View style={[styles.starBar, { width: `${reviewStats.distribution[idx]}%` as any }]} />
                    </View>
                    <Text style={styles.starPercent}>{reviewStats.distribution[idx]}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Son yorumlar */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="chatbubbles-outline" size={16} color={Colors.venueColor} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Son Yorumlar</Text>
            </View>
            {recentReviews.map((rev, i) => (
              <View key={i} style={styles.recentReviewCard}>
                <View style={styles.recentRevTop}>
                  <LinearGradient colors={[...getAvatarGrad(rev.author)]} style={styles.recentRevAvatar}>
                    <Text style={styles.recentRevAvatarText}>{rev.author.charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                  <View style={styles.recentRevContent}>
                    <Text style={styles.recentRevAuthor}>{rev.author}</Text>
                    <Text style={styles.recentRevTime}>{rev.time}</Text>
                  </View>
                  <View style={styles.recentRevRatingRow}>
                    {Array.from({ length: rev.rating }).map((_, idx) => (
                      <Ionicons key={idx} name="star" size={12} color={Colors.accent} />
                    ))}
                  </View>
                </View>
                <Text style={styles.recentRevText}>{rev.text}</Text>
              </View>
            ))}
          </View>

          {/* Gelir özeti */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="cash-outline" size={16} color={Colors.venueColor} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Gelir Özeti</Text>
            </View>
            <View style={styles.revenueCard}>
              <View style={styles.revenueRow}>
                <View style={styles.revenueItem}>
                  <Text style={styles.revenueItemLabel}>Bilet Geliri</Text>
                  <Text style={styles.revenueItemValue}>₺{(metrics.totalRevenue * 0.72 / 1000).toFixed(0)}K</Text>
                </View>
                <View style={styles.revenueDivider} />
                <View style={styles.revenueItem}>
                  <Text style={styles.revenueItemLabel}>İçecek / Bar</Text>
                  <Text style={styles.revenueItemValue}>₺{(metrics.totalRevenue * 0.21 / 1000).toFixed(0)}K</Text>
                </View>
                <View style={styles.revenueDivider} />
                <View style={styles.revenueItem}>
                  <Text style={styles.revenueItemLabel}>VIP / Masa</Text>
                  <Text style={styles.revenueItemValue}>₺{(metrics.totalRevenue * 0.07 / 1000).toFixed(0)}K</Text>
                </View>
              </View>
              <View style={styles.revenueBarRow}>
                <View style={[styles.revenueBarSegment, styles.revenueSegmentTickets]} />
                <View style={[styles.revenueBarSegment, styles.revenueSegmentBar]} />
                <View style={[styles.revenueBarSegment, styles.revenueSegmentVip]} />
              </View>
            </View>
          </View>
        </>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function MetricCard({ label, value, iconName, color }: { label: string; value: string; iconName: IoniconName; color: string }) {
  return (
    <View style={[styles.metricCard, { borderColor: color + '44' }]}>
      <LinearGradient colors={[color + '22', color + '08']} style={styles.metricGrad}>
        <Ionicons name={iconName} size={22} color={color} style={styles.metricIcon} />
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </LinearGradient>
    </View>
  );
}

function SecondaryMetric({ iconName, label, value, valueColor }: { iconName: IoniconName; label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.secondaryMetricCard}>
      <Ionicons name={iconName} size={18} color={Colors.venueColor} style={styles.secMetricIcon} />
      <Text style={[styles.secMetricValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      <Text style={styles.secMetricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  headerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  periodScroll: { marginBottom: Spacing.md, flexGrow: 0 },
  periodContent: { paddingHorizontal: Spacing.lg, gap: 8, paddingVertical: 4, alignItems: 'center' },
  periodChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  periodChipActive: { backgroundColor: Colors.venueColor, borderColor: Colors.venueColor },
  periodText: { color: Colors.textSecondary, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  periodTextActive: { color: '#fff' },

  metricsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg, gap: 10, marginBottom: Spacing.md,
  },
  metricCard: {
    width: (width - Spacing.lg * 2 - 10) / 2,
    borderRadius: BorderRadius.md, borderWidth: 1, overflow: 'hidden',
  },
  metricGrad: { padding: Spacing.md },
  metricValue: { fontSize: FontSize.xl, fontWeight: '800', marginBottom: 4 },
  metricLabel: { fontSize: FontSize.xs, color: Colors.textMuted },

  secondaryMetrics: { paddingHorizontal: Spacing.lg, gap: 10 },
  secondaryMetricCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center', minWidth: 90,
  },
  secMetricValue: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginBottom: 2 },
  secMetricLabel: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },

  barChartCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 130,
    gap: 8,
  },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barValue: { color: Colors.textMuted, fontSize: 8, marginBottom: 3 },
  barWrapper: { width: '100%', flex: 1, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4 },
  barDay: { color: Colors.textSecondary, fontSize: 9, marginTop: 4 },

  peakCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
    gap: 8,
  },
  peakRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  peakHour: { color: Colors.textSecondary, fontSize: FontSize.xs, width: 44 },
  peakBarWrapper: { flex: 1, height: 6, backgroundColor: Colors.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  peakBar: { height: 6, borderRadius: 3 },
  peakValue: { color: Colors.textMuted, fontSize: FontSize.xs, width: 32, textAlign: 'right' },

  genreCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, gap: 12,
  },
  genreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  genreLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, width: 80 },
  genreBarWrapper: { flex: 1, height: 8, backgroundColor: Colors.surfaceAlt, borderRadius: 4, overflow: 'hidden' },
  genreBar: { height: 8, borderRadius: 4 },
  genrePercent: { width: 36, fontSize: FontSize.sm, fontWeight: '700', textAlign: 'right' },

  demoCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
  },
  demoRow: { marginBottom: 12 },
  demoLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 10 },
  genderBar: {
    flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 10,
  },
  genderSegment: { height: 14 },
  genderLegend: { flexDirection: 'row', gap: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 14 },
  ageRow: { flexDirection: 'row', gap: 12, height: 80, alignItems: 'flex-end' },
  ageItem: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  agePercent: { fontSize: 10, fontWeight: '700', marginBottom: 4, color: Colors.venueColor },
  ageBarWrapper: { width: '100%', flex: 1, justifyContent: 'flex-end' },
  ageBar: { width: '100%', backgroundColor: Colors.venueColor + 'AA', borderRadius: 4 },
  ageLabel: { color: Colors.textMuted, fontSize: 9, marginTop: 4, textAlign: 'center' },

  artistPerfCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  artistPerfRank: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.venueColor + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  rankText: { color: Colors.venueColor, fontSize: FontSize.xs, fontWeight: '800' },
  artistPerfAvatar: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden' },
  artistPerfAvatarGrad: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  artistPerfAvatarInitial: { fontSize: 20, fontWeight: '900', color: '#fff' },
  emptyArtists: {
    paddingVertical: 14, paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  emptyArtistsText: { color: Colors.textMuted, fontSize: FontSize.sm },
  artistPerfInfo: { flex: 1 },
  artistPerfName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 2 },
  artistPerfGenre: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: 4 },
  artistPerfAttendanceRow: { flexDirection: 'row', alignItems: 'center' },
  artistPerfAttendance: { color: Colors.textSecondary, fontSize: FontSize.xs },
  artistPerfStats: { alignItems: 'flex-end', gap: 3 },
  artistPerfTrend: { color: Colors.success, fontSize: FontSize.xs, fontWeight: '700' },
  artistPerfRatingRow: { flexDirection: 'row', alignItems: 'center' },
  artistPerfRating: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: '700' },
  artistPerfRevenue: { color: Colors.success, fontSize: FontSize.xs, fontWeight: '700' },

  reviewAnalysisCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, gap: Spacing.md,
  },
  reviewScore: { alignItems: 'center', justifyContent: 'center', width: 90 },
  reviewScoreValue: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.accent },
  reviewScoreLabel: { fontSize: 9, color: Colors.textMuted, textAlign: 'center', marginTop: 4 },
  reviewStarsRow: { flexDirection: 'row', gap: 1, marginTop: 4 },
  reviewTotal: { color: Colors.textMuted, fontSize: 9, marginTop: 4, textAlign: 'center' },
  reviewBars: { flex: 1, gap: 6 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  starLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 30 },
  starLabelNum: { fontSize: FontSize.xs, color: Colors.textSecondary },
  starBarWrapper: { flex: 1, height: 6, backgroundColor: Colors.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  starBar: { height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  starPercent: { color: Colors.textMuted, fontSize: FontSize.xs, width: 28, textAlign: 'right' },

  recentReviewCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, marginBottom: 10,
  },
  recentRevTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  recentRevAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  recentRevAvatarText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  recentRevAuthor: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  recentRevTime: { color: Colors.textMuted, fontSize: FontSize.xs },
  recentRevRatingRow: { flexDirection: 'row', gap: 1 },
  recentRevText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },

  revenueCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
  },
  revenueRow: { flexDirection: 'row', marginBottom: 14 },
  revenueItem: { flex: 1, alignItems: 'center' },
  revenueItemLabel: { color: Colors.textMuted, fontSize: 10, marginBottom: 6 },
  revenueItemValue: { color: Colors.text, fontSize: FontSize.md, fontWeight: '800' },
  revenueDivider: { width: 1, backgroundColor: Colors.border },
  revenueBarRow: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 1 },
  revenueBarSegment: { height: 8 },
  revenueSegmentTickets: { flex: 0.72, backgroundColor: Colors.success },
  revenueSegmentBar: { flex: 0.21, backgroundColor: Colors.primary },
  revenueSegmentVip: { flex: 0.07, backgroundColor: Colors.accent },
  genderSegmentMale: { flex: 0.52, backgroundColor: Colors.primary },
  genderSegmentFemale: { flex: 0.48, backgroundColor: Colors.customerColor },
  legendDotMale: { backgroundColor: Colors.primary },
  legendDotFemale: { backgroundColor: Colors.customerColor },
  loader: { marginTop: 40 },
  secondaryMetricsScroll: { marginBottom: Spacing.lg },
  sectionIcon: { marginRight: 6 },
  recentRevContent: { flex: 1 },
  bottomSpacer: { height: 120 },
  metricIcon: { marginBottom: 8 },
  secMetricIcon: { marginBottom: 4 },
});
