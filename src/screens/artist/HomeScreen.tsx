import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, updateDoc, collection, query, where, getDocs, onSnapshot, Timestamp, setDoc, serverTimestamp } from 'firebase/firestore';
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

export default function ArtistHomeScreen({ navigation }: any) {
  const { displayName, userId } = useAuthStore();
  const [offers, setOffers] = useState(INITIAL_OFFERS);
  const [monthlyGigCount, setMonthlyGigCount] = useState(0);
  const [realtimeOffers, setRealtimeOffers] = useState<typeof INITIAL_OFFERS>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);

  // Aylık onaylı performans sayısını Firestore'dan çek
  useEffect(() => {
    if (!userId) return;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    getDocs(
      query(
        collection(db, 'invitations'),
        where('artistId', '==', userId),
        where('status', '==', 'accepted'),
        where('updatedAt', '>=', Timestamp.fromDate(startOfMonth)),
      ),
    ).then((snap) => setMonthlyGigCount(snap.size)).catch(() => {});
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
            fee: `₺${(data.fee ?? 0).toLocaleString('tr-TR')}`,
            genre: data.genre ?? '—',
            status: 'pending' as const,
          };
        });
        setRealtimeOffers(liveOffers.length > 0 ? liveOffers : INITIAL_OFFERS);
        setLoadingOffers(false);
      },
      () => { setRealtimeOffers(INITIAL_OFFERS); setLoadingOffers(false); },
    );
    return unsub;
  }, [userId]);

  const handleOffer = async (offerId: string, action: 'accept' | 'reject') => {
    const offer = offers.find((o) => o.id === offerId);
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
                // Aylık sayacı artır — hedef tamamlandıysa bildir
                const newCount = monthlyGigCount + 1;
                setMonthlyGigCount(newCount);
                if (newCount >= MONTHLY_GOAL) {
                  await setDoc(doc(db, 'users', userId), { rewardEarned: true, rewardMonth: new Date().getMonth() + 1 }, { merge: true });
                }
              }
            } catch {
              // Firestore'da kayıt yoksa sessizce geç
            }
            setOffers((prev) => prev.filter((o) => o.id !== offerId));
            Alert.alert(
              action === 'accept' ? 'Kabul Edildi!' : 'Reddedildi',
              action === 'accept'
                ? `${offer.venue} teklifini kabul ettiniz. Performansınız takvime eklendi.`
                : `${offer.venue} teklifi reddedildi.`,
            );
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#1A0A2E', '#0F0618', Colors.background]} style={styles.header}>
        <View style={styles.ambientGlow} />
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Merhaba,</Text>
            <Text style={styles.artistName}>{displayName ?? 'Sanatçı'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
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
          <StatBox label="Bu Ay" value={monthlyGigCount.toString() || '0'} sub="Performans" color={Colors.artistColor} />
          <StatBox label="Ort. Puan" value="4.8" sub="★" color={Colors.accent} />
          <StatBox label="Kazanç" value="₺14.5K" sub="Toplam" color={Colors.success} />
          <StatBox label="Takipçi" value="1.2K" sub="Kişi" color={Colors.customerColor} />
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
        {UPCOMING_GIGS.map((gig) => (
          <View key={gig.id} style={[styles.gigCard, Shadow.sm]}>
            <View style={[styles.gigStatusDot, { backgroundColor: Colors.success }]} />
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
        {RECENT_REVIEWS.map((review) => (
          <View key={review.id} style={[styles.reviewCard, Shadow.sm]}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewAuthor}>{review.author}</Text>
              <View style={{ flexDirection: 'row', gap: 2 }}>
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
            Alert.alert('🎉 Tebrikler!', `Bu ay ${MONTHLY_GOAL} performans hedefine ulaştınız! ₺${MONTHLY_REWARD} ödülünüz hesabınıza aktarılacak.`);
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
          <View style={{ flex: 1 }}>
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

      <View style={{ height: 100 }} />
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
  gigInfo: { flex: 1 },
  gigVenue: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600', marginBottom: 2 },
  gigDate: { color: Colors.textSecondary, fontSize: FontSize.sm },
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
  reviewRating: { fontSize: 12 },
  reviewVenueLegacy: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: 6 },
  reviewComment: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  rewardBanner: { marginHorizontal: Spacing.lg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  rewardGradient: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: 12 },
  rewardIcon: { marginRight: 0 },
  rewardTitle: { color: '#fff', fontSize: FontSize.md, fontWeight: '700', marginBottom: 2 },
  rewardDesc: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm },
  rewardProgress: { marginLeft: 'auto', fontSize: FontSize.xl, fontWeight: '800', color: '#fff' },
});
