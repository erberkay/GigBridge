import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, updateDoc, collection, query, where, getDocs, getDoc, onSnapshot, Timestamp, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../theme';
import { PressableScale } from '../../components/common/PressableScale';

const MONTHLY_GOAL = 5;    // Ayda 5 performans hedefi
const MONTHLY_REWARD = 500; // ₺500 ödül

const INITIAL_OFFERS = [
  { id: '1', venue: 'Babylon Club', date: '15 Mart 2025', time: '22:00', fee: '₺3.500', genre: 'Electronic', status: 'pending' },
  { id: '2', venue: 'Nardis Jazz', date: '20 Mart 2025', time: '21:00', fee: '₺2.800', genre: 'Jazz', status: 'pending' },
];

const UPCOMING_GIGS = [
  { id: '1', venue: 'Zorlu PSM', date: '10 Mart 2025', time: '22:00', fee: '₺5.000', status: 'confirmed' },
  { id: '2', venue: 'IF Performance', date: '12 Mart 2025', time: '21:30', fee: '₺3.200', status: 'confirmed' },
];

const RECENT_REVIEWS = [
  { id: '1', author: 'Zeynep K.', rating: 5, comment: 'Harika bir performans! Sahne enerjisi çok iyiydi.', venue: 'Babylon Club' },
  { id: '2', author: 'Mehmet A.', rating: 4, comment: 'Çok başarılı bir gece. Teşekkürler!', venue: 'Nardis' },
];

// ERR-AHOME-001 Teklif kabul/red Firestore hatası  ERR-AHOME-002 Aylık performans sayısı yüklenemedi
const ERR = {
  OFFER_ACTION_FAILED:    'ERR-AHOME-001',
  MONTHLY_COUNT_FAILED:   'ERR-AHOME-002',
} as const;

export default function ArtistHomeScreen({ navigation }: any) {
  const displayName = useAuthStore((s) => s.displayName);
  const userId      = useAuthStore((s) => s.userId);
  const [monthlyGigCount, setMonthlyGigCount] = useState(0);
  const [realtimeOffers, setRealtimeOffers] = useState<typeof INITIAL_OFFERS>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [upcomingGigs, setUpcomingGigs]     = useState<typeof UPCOMING_GIGS>([]);
  const [recentReviews, setRecentReviews]   = useState<typeof RECENT_REVIEWS>([]);
  const [avgRating, setAvgRating]           = useState('—');
  const [totalEarnings, setTotalEarnings]   = useState('—');
  const [followerCount, setFollowerCount]   = useState('—');

  // Aylık onaylı performans sayısını + takipçi sayısını Firestore'dan çek
  useEffect(() => {
    if (!userId) return;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    Promise.all([
      getDocs(
        query(
          collection(db, 'invitations'),
          where('artistId', '==', userId),
          where('status', '==', 'accepted'),
          where('updatedAt', '>=', Timestamp.fromDate(startOfMonth)),
        ),
      ),
      getDoc(doc(db, 'users', userId)),
    ])
      .then(([snap, userSnap]) => {
        setMonthlyGigCount(snap.size);
        const fc = userSnap.data()?.followerCount ?? 0;
        setFollowerCount(fc >= 1000 ? `${(fc / 1000).toFixed(1)}K` : String(fc));
      })
      .catch(() => console.warn(`[${ERR.MONTHLY_COUNT_FAILED}] Aylık performans sayısı yüklenemedi.`));
  }, [userId]);

  // Gerçek zamanlı teklifleri Firestore'dan dinle
  useEffect(() => {
    if (!userId) { setLoadingOffers(false); return; }
    const isDemo = userId.startsWith('demo_');
    if (isDemo) { setRealtimeOffers(INITIAL_OFFERS); setLoadingOffers(false); return; }

    const unsub = onSnapshot(
      query(collection(db, 'invitations'), where('artistId', '==', userId), where('status', '==', 'pending')),
      (snap) => {
        const liveOffers = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            venue: data.venueName ?? 'Mekan',
            date: data.eventDate ?? '—',
            time: data.eventTime ?? '—',
            fee: data.fee ? `₺${data.fee.toLocaleString('tr-TR')}` : 'Belirtilmemiş',
            genre: data.genre ?? '—',
            status: 'pending' as const,
          };
        });
        setRealtimeOffers(liveOffers);
        setLoadingOffers(false);
      },
      () => { setRealtimeOffers([]); setLoadingOffers(false); },
    );
    return unsub;
  }, [userId]);

  // Kabul edilmiş davetlerden yaklaşan gig listesi + toplam kazanç
  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, 'invitations'),
      where('artistId', '==', userId),
      where('status', '==', 'accepted'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const loaded = snap.docs.map((d) => {
        const data = d.data();
        return {
          id:     d.id,
          venue:  data.venueName ?? '—',
          date:   data.eventDate ?? data.date ?? '—',
          time:   data.eventTime ?? data.time ?? '',
          fee:    data.fee != null ? `₺${data.fee.toLocaleString('tr-TR')}` : 'Belirtilmemiş',
          status: 'confirmed' as const,
        };
      });
      setUpcomingGigs(loaded);

      const total = snap.docs.reduce((sum, d) => {
        const fee = d.data().fee ?? 0;
        return sum + (typeof fee === 'number' ? fee : parseFloat(String(fee).replace(/[^0-9.]/g, '')) || 0);
      }, 0);
      const formatted = total >= 1000
        ? `₺${(total / 1000).toFixed(1)}K`
        : total > 0 ? `₺${total.toLocaleString('tr-TR')}` : '₺0';
      setTotalEarnings(formatted);
    }, (err) => console.warn('[ArtistHome] gigs onSnapshot:', err));
    return () => unsub();
  }, [userId]);

  // Son yorumları Firestore'dan yükle + ortalama puan hesapla
  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, 'reviews'),
      where('targetId', '==', userId),
      where('targetType', '==', 'artist'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const loaded = snap.docs.slice(0, 2).map((d) => {
        const data = d.data();
        return {
          id:      d.id,
          author:  data.authorName ?? 'Anonim',
          rating:  data.rating ?? 0,
          comment: data.comment ?? '',
          venue:   data.venueName ?? '',
        };
      });
      setRecentReviews(loaded);

      if (snap.size > 0) {
        const allRatings = snap.docs.map((d) => d.data().rating ?? 0);
        const avg = (allRatings.reduce((s, r) => s + r, 0) / allRatings.length).toFixed(1);
        setAvgRating(avg);
      }
    }, (err) => console.warn('[ArtistHome] reviews onSnapshot:', err));
    return () => unsub();
  }, [userId]);

  const handleOffer = useCallback(async (offerId: string, action: 'accept' | 'reject') => {
    const offer = realtimeOffers.find((o) => o.id === offerId);
    if (!offer) return;
    const label = action === 'accept' ? 'Kabul' : 'Reddet';
    Alert.alert(
      `Teklifi ${label}`,
      `${offer.venue} teklifini ${action === 'accept' ? 'kabul' : 'reddedeceksiniz'}. Emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: label,
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'invitations', offerId), {
                status: action === 'accept' ? 'accepted' : 'rejected',
                updatedAt: serverTimestamp(),
              });
              if (action === 'accept' && userId) {
                const newCount = monthlyGigCount + 1;
                setMonthlyGigCount(newCount);
                if (newCount >= MONTHLY_GOAL) {
                  await setDoc(
                    doc(db, 'users', userId),
                    { rewardEarned: true, rewardMonth: new Date().getMonth() + 1 },
                    { merge: true },
                  );
                }
              }
              setRealtimeOffers((prev) => prev.filter((o) => o.id !== offerId));
              Alert.alert(
                action === 'accept' ? 'Kabul Edildi!' : 'Reddedildi',
                action === 'accept'
                  ? `${offer.venue} teklifini kabul ettiniz. Performansınız takvime eklendi.`
                  : `${offer.venue} teklifi reddedildi.`,
              );
            } catch {
              Alert.alert('Hata', `İşlem gerçekleştirilemedi. (${ERR.OFFER_ACTION_FAILED})`);
            }
          },
        },
      ],
    );
  }, [realtimeOffers, monthlyGigCount, userId]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#1A0A2E', '#0F0618', Colors.background]} style={styles.header}>
        <View style={styles.ambientGlow} />
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.artistName}>{displayName ?? 'Sanatçı'}</Text>
          </View>
          <View style={styles.headerActions}>
            <PressableScale scaleTo={0.92} onPress={() => navigation.navigate('Notifications')} style={styles.notifBtn}>
              <LinearGradient colors={['#1E1530', '#140E22']} style={styles.notifGrad}>
                <Ionicons name="notifications-outline" size={20} color={Colors.textSecondary} />
              </LinearGradient>
            </PressableScale>
            <PressableScale scaleTo={0.92} onPress={() => navigation.navigate('ArtistProfile')} style={styles.profileBtn}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>{displayName?.charAt(0) ?? '?'}</Text>
              </View>
            </PressableScale>
          </View>
        </View>

        {/* İstatistikler */}
        <View style={styles.statsRow}>
          <StatBox label="Bu Ay" value={monthlyGigCount.toString()} sub="Performans" color={Colors.artistColor} />
          <StatBox label="Ort. Puan" value={avgRating}    sub="★"       color={Colors.accent} />
          <StatBox label="Kazanç"    value={totalEarnings} sub="Toplam"  color={Colors.success} />
          <StatBox label="Takipçi"   value={followerCount} sub="Kişi"    color={Colors.customerColor} />
        </View>
      </LinearGradient>

      {/* Bekleyen teklifler */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Gelen Teklifler</Text>
          {realtimeOffers.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{realtimeOffers.length}</Text>
            </View>
          )}
        </View>
        {loadingOffers ? (
          <View style={styles.emptyOffers}>
            <ActivityIndicator size="small" color={Colors.artistColor} />
            <Text style={styles.emptyOffersText}>Yükleniyor...</Text>
          </View>
        ) : realtimeOffers.length === 0 ? (
          <View style={styles.emptyOffers}>
            <Ionicons name="mail-open-outline" size={20} color={Colors.textMuted} />
            <Text style={styles.emptyOffersText}>Bekleyen teklif yok</Text>
          </View>
        ) : (
          <>
          {realtimeOffers.map((offer) => (
            <View key={offer.id} style={[styles.offerCard, Shadow.sm]}>
              <View style={styles.offerLeft}>
                <Text style={styles.offerVenue}>{offer.venue}</Text>
                <View style={styles.offerDateRow}>
                  <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
                  <Text style={styles.offerDate}>{offer.date} • {offer.time}</Text>
                </View>
                <View style={styles.genreBadge}>
                  <Text style={styles.genreText}>{offer.genre}</Text>
                </View>
              </View>
              <View style={styles.offerRight}>
                <Text style={styles.offerFee}>{offer.fee}</Text>
                <View style={styles.offerActions}>
                  <PressableScale style={styles.acceptBtn} onPress={() => handleOffer(offer.id, 'accept')} scaleTo={0.93}>
                    <Text style={styles.acceptText}>Kabul</Text>
                  </PressableScale>
                  <PressableScale style={styles.rejectBtn} onPress={() => handleOffer(offer.id, 'reject')} scaleTo={0.93}>
                    <Text style={styles.rejectText}>Reddet</Text>
                  </PressableScale>
                </View>
              </View>
            </View>
          ))}
          </>
        )}
      </View>

      {/* Yaklaşan performanslar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Yaklaşan Performanslar</Text>
        {upcomingGigs.length === 0 ? (
          <View style={styles.emptyOffers}>
            <Ionicons name="calendar-outline" size={20} color={Colors.textMuted} />
            <Text style={styles.emptyOffersText}>Onaylı performans yok</Text>
          </View>
        ) : upcomingGigs.map((gig) => (
          <View key={gig.id} style={[styles.gigCard, Shadow.sm]}>
            <View style={[styles.gigStatusDot, styles.gigStatusDotConfirmed]} />
            <View style={styles.gigInfo}>
              <Text style={styles.gigVenue}>{gig.venue}</Text>
              <View style={styles.offerDateRow}>
                <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.offerDate}>{gig.date} • {gig.time}</Text>
              </View>
            </View>
            <Text style={styles.gigFee}>{gig.fee}</Text>
          </View>
        ))}
      </View>

      {/* Son yorumlar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Son Yorumlar</Text>
        {recentReviews.length === 0 ? (
          <View style={styles.emptyOffers}>
            <Ionicons name="star-outline" size={20} color={Colors.textMuted} />
            <Text style={styles.emptyOffersText}>Henüz yorum yok</Text>
          </View>
        ) : recentReviews.map((review) => (
          <View key={review.id} style={[styles.reviewCard, Shadow.sm]}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewAuthor}>{review.author}</Text>
              <View style={styles.reviewStars}>
                {Array.from({ length: review.rating }).map((_, i) => (
                  <Ionicons key={i} name="star" size={12} color={Colors.accent} />
                ))}
              </View>
            </View>
            <View style={styles.offerDateRow}>
              <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.reviewVenue}>{review.venue}</Text>
            </View>
            <Text style={styles.reviewComment}>{review.comment}</Text>
          </View>
        ))}
      </View>

      {/* Ödül mekanizması */}
      <PressableScale
        style={[styles.rewardBanner, Shadow.md]}
        scaleTo={0.98}
        onPress={() => {
          const remaining = Math.max(0, MONTHLY_GOAL - monthlyGigCount);
          if (monthlyGigCount >= MONTHLY_GOAL) {
            Alert.alert('Tebrikler!', `Bu ay ${MONTHLY_GOAL} performans hedefine ulaştınız! ₺${MONTHLY_REWARD} ödülünüz hesabınıza aktarılacak.`);
          } else {
            Alert.alert('Ödül Mekanizması', `Bu ay ${MONTHLY_GOAL} performans tamamla ve ₺${MONTHLY_REWARD} bonus kazan!\n\nŞu an ${monthlyGigCount}/${MONTHLY_GOAL} performans tamamlandı.\n${remaining} performans daha gerekiyor.`);
          }
        }}
      >
        <LinearGradient
          colors={monthlyGigCount >= MONTHLY_GOAL ? ['#10B981', '#059669'] : [Colors.accent, '#D97706']}
          style={styles.rewardGradient}
        >
          <Ionicons
            name={monthlyGigCount >= MONTHLY_GOAL ? 'checkmark-circle' : 'trophy'}
            size={32}
            color="#fff"
            style={styles.rewardIcon}
          />
          <View style={styles.rewardContent}>
            <Text style={styles.rewardTitle}>{monthlyGigCount >= MONTHLY_GOAL ? 'Hedef Tamamlandı!' : 'Ödül Mekanizması'}</Text>
            <Text style={styles.rewardDesc}>
              {monthlyGigCount >= MONTHLY_GOAL
                ? `₺${MONTHLY_REWARD} ödülünüzü kazandınız!`
                : `Bu ay ${MONTHLY_GOAL} performansla ₺${MONTHLY_REWARD} kazan`
              }
            </Text>
          </View>
          <Text style={styles.rewardProgress}>{monthlyGigCount}/{MONTHLY_GOAL}</Text>
        </LinearGradient>
      </PressableScale>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function StatBox({ label, value, sub, color }: any) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.lg, overflow: 'hidden' },
  ambientGlow: {
    position: 'absolute', top: -40, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: Colors.artistColor + '15',
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  greeting: { color: Colors.textMuted, fontSize: FontSize.sm, letterSpacing: 0.3, marginBottom: 3 },
  artistName: { color: Colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  notifBtn: { borderRadius: 14, overflow: 'hidden' },
  notifGrad: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  profileBtn: { padding: 0 },
  profileAvatar: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: Colors.artistColor,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.artistColor + '44',
  },
  profileAvatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRightWidth: 1, borderRightColor: Colors.border },
  statValue: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: 2 },
  statSub: { color: Colors.textMuted, fontSize: 9 },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  sectionTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.md, letterSpacing: -0.3 },
  countBadge: {
    width: 22, height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  countText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  emptyOffers: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14, paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyOffersText: { color: Colors.textMuted, fontSize: FontSize.sm },
  offerDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  offerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  offerLeft: { flex: 1 },
  offerVenue: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: 4 },
  offerDate: { color: Colors.textSecondary, fontSize: FontSize.sm },
  genreBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: Colors.primary + '22',
    borderRadius: BorderRadius.full,
  },
  genreText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' },
  offerRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  offerFee: { color: Colors.success, fontSize: FontSize.lg, fontWeight: '800' },
  offerActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.sm,
  },
  acceptText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  rejectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  rejectText: { color: Colors.error, fontSize: FontSize.xs, fontWeight: '700' },
  gigCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gigStatusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  gigStatusDotConfirmed: { backgroundColor: Colors.success },
  gigInfo: { flex: 1 },
  gigVenue: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600', marginBottom: 2 },
  reviewVenue: { color: Colors.textMuted, fontSize: FontSize.xs },
  gigFee: { color: Colors.success, fontSize: FontSize.md, fontWeight: '700' },
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reviewAuthor: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  reviewComment: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  rewardBanner: { marginHorizontal: Spacing.lg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  rewardGradient: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: 12 },
  rewardIcon: { marginRight: 0 },
  rewardTitle: { color: '#fff', fontSize: FontSize.md, fontWeight: '700', marginBottom: 2 },
  rewardDesc: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm },
  rewardProgress: { marginLeft: 'auto', fontSize: FontSize.xl, fontWeight: '800', color: '#fff' },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  reviewStars: { flexDirection: 'row', gap: 2 },
  rewardContent: { flex: 1 },
  bottomSpacer: { height: 100 },
});
