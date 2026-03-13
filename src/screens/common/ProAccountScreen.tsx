import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { initiatePayment, PRO_PLANS } from '../../services/payment';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { PressableScale } from '../../components/common/PressableScale';

// ERR-PRO-001 Abonelik işlemi başarısız
const ERR = { SUBSCRIBE: 'ERR-PRO-001' } as const;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type Tier = 'pro' | 'plus';

interface Plan {
  id: Tier;
  label: string;
  price: string;
  period: string;
  badge: string | null;
  amount: number; // kuruş cinsinden (100 = 1 TL)
}

// PRO_PLANS'tan türetilir — fiyatlar payment.ts'ten tek kaynaktan gelir
const PLANS: Plan[] = PRO_PLANS.map((p) => ({
  id:     p.id as Tier,
  label:  p.label,
  price:  p.priceLabel.replace('/ay', ''),
  period: 'ay',
  badge:  (p as any).badge ?? null,
  amount: p.price, // kuruş (20000 = 200 TL)
}));

// Artist features — same for both tiers (Plus just elevates visibility)
const ARTIST_PRO: { iconName: IoniconName; title: string; desc: string }[] = [
  { iconName: 'bar-chart-outline',    title: 'Gelişmiş Analitik',    desc: 'Performans istatistiklerinizi detaylı takip edin' },
  { iconName: 'trophy-outline',       title: 'Pro Rozeti',           desc: 'Profilinizde doğrulanmış sanatçı rozeti' },
  { iconName: 'megaphone-outline',    title: 'Öne Çıkan Profil',     desc: 'Mekan aramalarında üst sıralarda görünün' },
  { iconName: 'calendar-outline',     title: 'Takvim Yönetimi',      desc: 'Müsaitlik takviminizi yönetin ve paylaşın' },
  { iconName: 'cash-outline',         title: 'Öncelikli Teklifler',  desc: 'Mekanlardan gelen teklifleri önce görün' },
];
const ARTIST_PLUS: { iconName: IoniconName; title: string; desc: string }[] = [
  ...ARTIST_PRO,
  { iconName: 'star-outline',         title: 'Plus Rozeti',          desc: 'Sayfanızda özel altın Plus rozeti gösterin' },
  { iconName: 'trending-up-outline',  title: 'Öncelikli Eşleştirme', desc: 'Mekanlar tarafından önce keşfedilirsiniz' },
  { iconName: 'headset-outline',      title: 'Öncelikli Destek',     desc: '7/24 öncelikli müşteri desteği' },
];

// Venue features
const VENUE_PRO: { iconName: IoniconName; title: string; desc: string }[] = [
  { iconName: 'sparkles-outline',     title: 'Sanatçı Önerileri',   desc: 'Yapay zeka destekli sanatçı eşleştirme' },
  { iconName: 'trending-up-outline',  title: 'Gelir Analizi',       desc: 'Detaylı gelir ve katılım raporları' },
  { iconName: 'trophy-outline',       title: 'Pro Mekan Rozeti',    desc: 'Arama sonuçlarında öne çıkın' },
  { iconName: 'people-outline',       title: 'Katılımcı Analizi',   desc: 'Etkinlik katılımcı demografisini görün' },
  { iconName: 'megaphone-outline',    title: 'Kampanya Aracı',      desc: 'Sosyal medya kampanyaları oluşturun' },
];
const VENUE_PLUS: { iconName: IoniconName; title: string; desc: string }[] = [
  ...VENUE_PRO,
  { iconName: 'star-outline',         title: 'Plus Mekan Rozeti',   desc: 'Özel altın rozet ile en üst sıralarda görünün' },
  { iconName: 'chatbubbles-outline',  title: 'Toplu Mesaj',         desc: 'Sanatçılara toplu teklif ve duyuru gönderin' },
  { iconName: 'headset-outline',      title: 'Öncelikli Destek',    desc: '7/24 öncelikli müşteri desteği' },
];

// Customer Pro features (no attendee list)
const CUSTOMER_PRO: { iconName: IoniconName; title: string; desc: string }[] = [
  { iconName: 'heart-outline',        title: 'Sınırsız Favoriler',         desc: 'Tüm sanatçı ve mekanları favorilere ekle' },
  { iconName: 'sparkles-outline',     title: 'Kişiselleştirilmiş Öneri',   desc: 'Zevkine göre etkinlik tavsiyeleri' },
  { iconName: 'notifications-outline',title: 'Öncelikli Bildirimler',      desc: 'Yeni etkinlikleri herkesten önce öğren' },
  { iconName: 'trophy-outline',       title: 'Pro Üye Rozeti',             desc: 'Profilinde özel Pro rozeti göster' },
  { iconName: 'map-outline',          title: 'Gelişmiş Harita Filtreleri', desc: 'Haritada daha fazla etkinlik ve filtre seçeneği' },
  { iconName: 'ticket-outline',       title: 'Erken Etkinlik Bilgisi',     desc: 'Etkinlik duyurularını herkesten önce gör' },
];
const CUSTOMER_PLUS: { iconName: IoniconName; title: string; desc: string }[] = [
  ...CUSTOMER_PRO,
  { iconName: 'chatbubbles-outline',  title: 'Sanatçıya Direkt Mesaj',    desc: 'Favori sanatçılarınla doğrudan iletişime geç' },
  { iconName: 'film-outline',         title: 'Backstage İçerikler',        desc: 'Sahne arkası özel video ve fotoğraflara eriş' },
  { iconName: 'ribbon-outline',       title: 'VIP Etkinlik Önceliği',      desc: 'VIP etkinliklerde öncelikli sıra hakkı' },
  { iconName: 'headset-outline',      title: 'Öncelikli Destek',           desc: '7/24 öncelikli müşteri desteği' },
];

export default function ProAccountScreen({ navigation }: any) {
  const userType    = useAuthStore((s) => s.userType);
  const userId      = useAuthStore((s) => s.userId);
  const displayName = useAuthStore((s) => s.displayName);
  const email       = useAuthStore((s) => s.email);
  const [selectedTier, setSelectedTier] = useState<Tier>('pro');
  const [loading, setLoading] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [proTier, setProTier] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    getDoc(doc(db, 'users', userId)).then((snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (d.isPro) { setIsPro(true); setProTier(d.proTier ?? 'pro'); }
    }).catch(() => {});
  }, [userId]);

  const accentColor = useMemo(() =>
    userType === 'artist' ? Colors.artistColor :
    userType === 'venue'  ? Colors.venueColor :
    Colors.customerColor,
  [userType]);

  const plusAccent = '#F59E0B'; // gold for Plus tier badge

  const features = useMemo(() => {
    if (userType === 'artist') return selectedTier === 'plus' ? ARTIST_PLUS : ARTIST_PRO;
    if (userType === 'venue')  return selectedTier === 'plus' ? VENUE_PLUS  : VENUE_PRO;
    return selectedTier === 'plus' ? CUSTOMER_PLUS : CUSTOMER_PRO;
  }, [userType, selectedTier]);

  const selectedPlan = useMemo(() => PLANS.find((p) => p.id === selectedTier) ?? PLANS[0], [selectedTier]);

  const handleSubscribe = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await initiatePayment({
        amount: selectedPlan.amount,
        currency: 'TRY',
        description: `GigBridge ${selectedPlan.label} - Aylık`,
        buyerName: displayName ?? 'Kullanıcı',
        buyerEmail: email ?? '',
        buyerUserId: userId,
        metadata: { tier: selectedTier },
      });

      if (result.success) {
        await setDoc(doc(db, 'users', userId), {
          isPro: true,
          proTier: selectedTier,
          proSince: serverTimestamp(),
          proPaymentId: result.paymentId,
        }, { merge: true });
        setIsPro(true); setProTier(selectedTier);
        Alert.alert('Tebrikler!', `${selectedPlan.label} üyeliğiniz aktif edildi.`, [
          { text: 'Harika!', onPress: () => navigation.goBack() },
        ]);
      } else {
        // Backend henüz kurulmadı — beta modu
        await setDoc(doc(db, 'users', userId), {
          isPro: true,
          proTier: selectedTier,
          proSince: serverTimestamp(),
          betaMode: true,
        }, { merge: true });
        setIsPro(true); setProTier(selectedTier);
        Alert.alert('Beta Modu', 'Ödeme sistemi kurulum aşamasında. Özellikler beta sürecinde ücretsiz aktifleştirildi!', [
          { text: 'Süper!', onPress: () => navigation.goBack() },
        ]);
      }
    } catch {
      Alert.alert('Hata', `İşlem gerçekleştirilemedi. (${ERR.SUBSCRIBE})`);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedTier, selectedPlan, displayName, email, navigation]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <LinearGradient
        colors={[accentColor + 'CC', '#1A0A2E', Colors.background]}
        style={styles.hero}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>GİGBRİDGE</Text>
        </View>
        <Text style={styles.heroTitle}>Pro & Plus</Text>
        <Text style={styles.heroSubtitle}>
          {userType === 'artist' ? 'Kariyerini bir üst seviyeye taşı' :
           userType === 'venue' ? 'Mekanını öne çıkar, gelirini artır' :
           'En iyi müzik deneyimi için'}
        </Text>
      </LinearGradient>

      {/* Social proof */}
      <View style={styles.socialProof}>
        <View style={styles.proofAvatars}>
          {[
            ['#8B5CF6', '#6D28D9'] as [string, string],
            ['#EF4444', '#B91C1C'] as [string, string],
            ['#10B981', '#059669'] as [string, string],
            ['#F59E0B', '#D97706'] as [string, string],
          ].map((c, i) => (
            <LinearGradient key={i} colors={c} style={[styles.proofAvatar, i > 0 && styles.proofAvatarOverlap]}>
              <Text style={styles.proofAvatarText}>{['Z', 'M', 'K', 'A'][i]}</Text>
            </LinearGradient>
          ))}
        </View>
        <View style={styles.proofText}>
          <Text style={styles.proofCount}>2.400+ kullanıcı</Text>
          <View style={styles.proofStarsRow}>
            <Text style={styles.proofSub}>zaten Pro/Plus üye </Text>
            {[1,2,3,4,5].map((i) => <Ionicons key={i} name="star" size={10} color={Colors.accent} />)}
          </View>
        </View>
      </View>

      {/* Plan seçici */}
      <View style={styles.planContainer}>
        <Text style={styles.sectionTitle}>Plan Seç</Text>
        <View style={styles.planRow}>
          {PLANS.map((plan) => {
            const isSelected = selectedTier === plan.id;
            const cardAccent = plan.id === 'plus' ? plusAccent : accentColor;
            return (
              <PressableScale
                key={plan.id}
                style={[styles.planCard, isSelected && { borderColor: cardAccent, backgroundColor: cardAccent + '14' }]}
                onPress={() => setSelectedTier(plan.id)}
                scaleTo={0.97}
              >
                {plan.badge && (
                  <View style={[styles.planBadge, { backgroundColor: cardAccent }]}>
                    <Text style={styles.planBadgeText}>{plan.badge}</Text>
                  </View>
                )}
                <View style={[styles.planTierIcon, { backgroundColor: cardAccent + '22' }]}>
                  <Ionicons
                    name={plan.id === 'plus' ? 'star' : 'trophy-outline'}
                    size={22}
                    color={cardAccent}
                  />
                </View>
                <Text style={[styles.planLabel, isSelected && { color: cardAccent }]}>{plan.label}</Text>
                <Text style={[styles.planPrice, isSelected && { color: cardAccent }]}>{plan.price}</Text>
                <Text style={styles.planPeriod}>/ {plan.period}</Text>
                {plan.id === 'plus' && (
                  <Text style={styles.planPlusNote}>Pro dahil</Text>
                )}
                {isSelected && (
                  <View style={[styles.planCheck, { backgroundColor: cardAccent }]}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </PressableScale>
            );
          })}
        </View>
      </View>

      {/* Features comparison hint */}
      {selectedTier === 'pro' && (
        <TouchableOpacity style={styles.upgradeHint} onPress={() => setSelectedTier('plus')}>
          <Ionicons name="arrow-up-circle-outline" size={16} color={plusAccent} />
          <Text style={styles.upgradeHintText}>Plus ile çok daha fazlasına sahip ol →</Text>
        </TouchableOpacity>
      )}

      {/* Özellikler */}
      <View style={styles.featuresSection}>
        <View style={styles.featuresTitleRow}>
          <Text style={styles.sectionTitle}>
            {selectedTier === 'plus' ? 'Plus' : 'Pro'} Özellikler
          </Text>
          <View style={[styles.featuresCountBadge, { backgroundColor: (selectedTier === 'plus' ? plusAccent : accentColor) + '22' }]}>
            <Text style={[styles.featuresCount, { color: selectedTier === 'plus' ? plusAccent : accentColor }]}>
              {features.length} özellik
            </Text>
          </View>
        </View>
        {features.map((f, idx) => {
          const isPlusOnly = selectedTier === 'plus' && idx >= (
            userType === 'artist' ? ARTIST_PRO.length :
            userType === 'venue'  ? VENUE_PRO.length :
            CUSTOMER_PRO.length
          );
          return (
            <View key={f.title} style={styles.featureRow}>
              <View style={[styles.featureIconBox, { backgroundColor: (isPlusOnly ? plusAccent : accentColor) + '22' }]}>
                <Ionicons name={f.iconName} size={20} color={isPlusOnly ? plusAccent : accentColor} />
              </View>
              <View style={styles.featureInfo}>
                <View style={styles.featureTitleRow}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  {isPlusOnly && (
                    <View style={styles.plusOnlyBadge}>
                      <Text style={styles.plusOnlyText}>Plus</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={isPlusOnly ? plusAccent : accentColor} />
            </View>
          );
        })}
      </View>

      {/* Testimonial */}
      <View style={styles.testimonialSection}>
        <LinearGradient colors={[accentColor + '18', accentColor + '08']} style={styles.testimonialCard}>
          <Text style={styles.testimonialQuote}>"GigBridge Pro sayesinde aylık gelirimi %40 artırdım. Mekan bağlantıları inanılmaz."</Text>
          <View style={styles.testimonialAuthor}>
            <LinearGradient colors={[accentColor, accentColor + 'AA']} style={styles.testimonialAvatar}>
              <Text style={styles.testimonialAvatarText}>K</Text>
            </LinearGradient>
            <View>
              <Text style={styles.testimonialName}>Kerem G.</Text>
              <Text style={styles.testimonialRole}>Pro Sanatçı · Jazz Piyanisti</Text>
            </View>
            <View style={styles.testimonialStars}>
              {[1,2,3,4,5].map((i) => <Ionicons key={i} name="star" size={12} color={Colors.accent} />)}
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* CTA */}
      <View style={styles.ctaSection}>
        {isPro && (
          <View style={styles.alreadyProBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.alreadyProText}>
              {`${proTier === 'plus' ? 'Plus' : 'Pro'} üyeliğiniz aktif!`}
            </Text>
          </View>
        )}
        <PressableScale style={[styles.ctaBtn, isPro && styles.ctaBtnDimmed]} onPress={handleSubscribe} scaleTo={0.97}>
          <LinearGradient
            colors={selectedTier === 'plus'
              ? [plusAccent, '#D97706']
              : [accentColor, accentColor + 'CC']}
            style={styles.ctaBtnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <View style={styles.ctaBtnInner}>
                  <Text style={styles.ctaBtnText}>
                    {selectedTier === 'plus' ? "Plus'a Geç" : "Pro'ya Geç"}
                  </Text>
                  <Text style={styles.ctaBtnPrice}>{selectedPlan.price}/ay</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </View>
            }
          </LinearGradient>
        </PressableScale>
        <Text style={styles.ctaNote}>İstediğin zaman iptal edebilirsin. Ücretsiz deneme yok.</Text>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { paddingTop: 56, paddingBottom: Spacing.xxl, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  proBadge: {
    paddingHorizontal: 20, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 12,
  },
  proBadgeText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 3 },
  heroTitle: { color: '#fff', fontSize: 32, fontWeight: '800', marginBottom: 8 },
  heroSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.md, textAlign: 'center', paddingHorizontal: Spacing.xl },
  planContainer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, marginBottom: Spacing.md },
  sectionTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md },
  planRow: { flexDirection: 'row', gap: 12 },
  planCard: {
    flex: 1, alignItems: 'center', padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 2, borderColor: Colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  planTierIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8, marginTop: 8,
  },
  planBadge: {
    position: 'absolute', top: 0, right: 0,
    paddingHorizontal: 8, paddingVertical: 4,
    borderBottomLeftRadius: BorderRadius.sm,
  },
  planBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  planLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: 4, fontWeight: '700' },
  planPrice: { color: Colors.text, fontSize: 26, fontWeight: '800', marginBottom: 2 },
  planPeriod: { color: Colors.textMuted, fontSize: FontSize.xs },
  planPlusNote: { color: '#F59E0B', fontSize: FontSize.xs, fontWeight: '600', marginTop: 4 },
  planCheck: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.md,
  },
  upgradeHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: '#F59E0B11',
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: '#F59E0B33',
  },
  upgradeHintText: { color: '#F59E0B', fontSize: FontSize.sm, fontWeight: '600' },
  featuresSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  featuresTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  featuresCountBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  featuresCount: { fontSize: FontSize.xs, fontWeight: '700' },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  featureIconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  featureInfo: { flex: 1 },
  featureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  featureTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  featureDesc: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 16 },
  plusOnlyBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: '#F59E0B22',
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: '#F59E0B55',
  },
  plusOnlyText: { color: '#F59E0B', fontSize: 9, fontWeight: '800' },
  socialProof: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: Spacing.lg, marginTop: -Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
  },
  proofAvatars: { flexDirection: 'row' },
  proofAvatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  proofAvatarText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  proofAvatarOverlap: { marginLeft: -8 },
  proofText: { flex: 1 },
  proofCount: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  proofSub: { color: Colors.accent, fontSize: FontSize.xs },
  testimonialSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  testimonialCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  testimonialQuote: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, fontStyle: 'italic', marginBottom: Spacing.md },
  testimonialAuthor: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  testimonialAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  testimonialAvatarText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  testimonialName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  testimonialRole: { color: Colors.textMuted, fontSize: FontSize.xs },
  testimonialStars: { flexDirection: 'row', gap: 2, marginLeft: 'auto' },
  ctaSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  ctaBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md },
  ctaBtnDimmed: { opacity: 0.6 },
  alreadyProBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: Spacing.md,
  },
  alreadyProText: { color: '#10B981', fontSize: FontSize.sm, fontWeight: '700' },
  ctaBtnGrad: { paddingVertical: 18, alignItems: 'center' },
  ctaBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800' },
  ctaBtnPrice: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.sm, fontWeight: '600' },
  ctaNote: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },
  proofStarsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ctaBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bottomSpacer: { height: 60 },
});
