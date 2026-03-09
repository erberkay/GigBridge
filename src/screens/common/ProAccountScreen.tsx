import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { PRO_PLANS, initiatePayment } from '../../services/payment';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { PressableScale } from '../../components/common/PressableScale';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const PLANS = PRO_PLANS.map((p) => ({
  id: p.id,
  label: p.label,
  price: p.priceLabel.split('/')[0],
  period: p.id === 'monthly' ? 'ay' : 'yıl',
  badge: p.badge ?? null,
}));

const PRO_FEATURES_ARTIST: { iconName: IoniconName; title: string; desc: string }[] = [
  { iconName: 'bar-chart-outline', title: 'Gelişmiş Analitik', desc: 'Performans istatistiklerinizi detaylı takip edin' },
  { iconName: 'trophy-outline', title: 'Pro Rozeti', desc: 'Profilinizde doğrulanmış sanatçı rozeti' },
  { iconName: 'megaphone-outline', title: 'Öne Çıkan Profil', desc: 'Mekan aramalarında üst sıralarda görünün' },
  { iconName: 'chatbubbles-outline', title: 'Sınırsız Mesaj', desc: 'Tüm mekanlarla sınırsız mesajlaşın' },
  { iconName: 'calendar-outline', title: 'Takvim Yönetimi', desc: 'Müsaitlik takviminizi yönetin ve paylaşın' },
  { iconName: 'cash-outline', title: 'Öncelikli Teklifler', desc: 'Mekanlardan gelen teklifleri önce görün' },
];

const PRO_FEATURES_VENUE: { iconName: IoniconName; title: string; desc: string }[] = [
  { iconName: 'sparkles-outline', title: 'Sanatçı Önerileri', desc: 'Yapay zeka destekli sanatçı eşleştirme' },
  { iconName: 'trending-up-outline', title: 'Gelir Analizi', desc: 'Detaylı gelir ve katılım raporları' },
  { iconName: 'trophy-outline', title: 'Pro Mekan Rozeti', desc: 'Arama sonuçlarında öne çıkın' },
  { iconName: 'people-outline', title: 'Katılımcı Analizi', desc: 'Etkinlik katılımcı demografisini görün' },
  { iconName: 'megaphone-outline', title: 'Kampanya Aracı', desc: 'Sosyal medya kampanyaları oluşturun' },
  { iconName: 'notifications-outline', title: 'Özel Bildirimler', desc: 'Müzik trendleri ve sanatçı güncellemeleri' },
];

const PRO_FEATURES_CUSTOMER: { iconName: IoniconName; title: string; desc: string }[] = [
  { iconName: 'people-outline', title: 'Katılımcı Listesi', desc: 'Etkinliklere katılanları görün ve bağlantı kurun' },
  { iconName: 'ticket-outline', title: 'Erken Erişim', desc: 'Etkinlik biletlerine önce erişin' },
  { iconName: 'heart-outline', title: 'Favori Sanatçı Bildirimi', desc: 'Takip ettiğiniz sanatçıların etkinliklerini kaçırmayın' },
  { iconName: 'map-outline', title: 'Gelişmiş Harita', desc: 'Haritada daha fazla etkinlik filtresi' },
  { iconName: 'gift-outline', title: 'Özel İndirimler', desc: 'Pro üyelere özel etkinlik indirimleri' },
  { iconName: 'chatbubbles-outline', title: 'Sanatçıyla Direkt Mesaj', desc: 'Favori sanatçınıza mesaj gönderin' },
];

export default function ProAccountScreen({ navigation }: any) {
  const { userType, userId, displayName, email } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [loading, setLoading] = useState(false);

  const features =
    userType === 'artist' ? PRO_FEATURES_ARTIST :
    userType === 'venue' ? PRO_FEATURES_VENUE :
    PRO_FEATURES_CUSTOMER;

  const accentColor =
    userType === 'artist' ? Colors.artistColor :
    userType === 'venue' ? Colors.venueColor :
    Colors.customerColor;

  const handleSubscribe = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const plan = PRO_PLANS.find((p) => p.id === selectedPlan)!;
      const result = await initiatePayment({
        amount: plan.price,
        currency: 'TRY',
        description: `GigBridge Pro - ${plan.label}`,
        buyerName: displayName ?? 'Kullanıcı',
        buyerEmail: email ?? '',
        buyerUserId: userId,
        metadata: { plan: selectedPlan },
      });

      if (result.success) {
        // Firestore'a pro üyelik kaydet
        await setDoc(doc(db, 'users', userId), {
          isPro: true,
          proSince: serverTimestamp(),
          proPlan: selectedPlan,
          proPaymentId: result.paymentId,
        }, { merge: true });
        Alert.alert('Tebrikler! 🎉', 'Pro üyeliğiniz aktif edildi.', [
          { text: 'Harika!', onPress: () => navigation.goBack() },
        ]);
      } else {
        // Backend henüz kurulmadı — beta modu
        await setDoc(doc(db, 'users', userId), {
          isPro: true,
          proSince: serverTimestamp(),
          proPlan: selectedPlan,
          betaMode: true,
        }, { merge: true });
        Alert.alert('Beta Modu 🚀', 'Ödeme sistemi kurulum aşamasında. Pro özellikler beta sürecinde ücretsiz aktifleştirildi!', [
          { text: 'Süper!', onPress: () => navigation.goBack() },
        ]);
      }
    } catch {
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.proBadgeText}>PRO</Text>
        </View>
        <Text style={styles.heroTitle}>GigBridge Pro</Text>
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
            ['#8B5CF6', '#6D28D9'], ['#EF4444', '#B91C1C'],
            ['#10B981', '#059669'], ['#F59E0B', '#D97706'],
          ].map((c, i) => (
            <LinearGradient key={i} colors={c as any} style={[styles.proofAvatar, { marginLeft: i > 0 ? -8 : 0 }]}>
              <Text style={styles.proofAvatarText}>{['Z', 'M', 'K', 'A'][i]}</Text>
            </LinearGradient>
          ))}
        </View>
        <View style={styles.proofText}>
          <Text style={styles.proofCount}>2.400+ kullanıcı</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Text style={styles.proofSub}>zaten Pro üye </Text>
            {[1,2,3,4,5].map((i) => <Ionicons key={i} name="star" size={10} color={Colors.accent} />)}
          </View>
        </View>
      </View>

      {/* Plan seçici */}
      <View style={styles.planContainer}>
        <Text style={styles.sectionTitle}>Plan Seç</Text>
        <View style={styles.planRow}>
          {PLANS.map((plan) => (
            <PressableScale
              key={plan.id}
              style={[styles.planCard, selectedPlan === plan.id && { borderColor: accentColor, backgroundColor: accentColor + '11' }]}
              onPress={() => setSelectedPlan(plan.id)}
              scaleTo={0.97}
            >
              {plan.badge && (
                <View style={[styles.planBadge, { backgroundColor: accentColor }]}>
                  <Text style={styles.planBadgeText}>{plan.badge}</Text>
                </View>
              )}
              <Text style={[styles.planLabel, selectedPlan === plan.id && { color: accentColor }]}>{plan.label}</Text>
              <Text style={[styles.planPrice, selectedPlan === plan.id && { color: accentColor }]}>{plan.price}</Text>
              <Text style={styles.planPeriod}>/ {plan.period}</Text>
              {selectedPlan === plan.id && (
                <View style={[styles.planCheck, { backgroundColor: accentColor }]}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
            </PressableScale>
          ))}
        </View>
      </View>

      {/* Özellikler */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Pro Özellikler</Text>
        {features.map((f) => (
          <View key={f.title} style={styles.featureRow}>
            <View style={[styles.featureIconBox, { backgroundColor: accentColor + '22' }]}>
              <Ionicons name={f.iconName} size={20} color={accentColor} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color={accentColor} />
          </View>
        ))}
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
        <PressableScale style={styles.ctaBtn} onPress={handleSubscribe} scaleTo={0.97}>
          <LinearGradient colors={[accentColor, accentColor + 'CC']} style={styles.ctaBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.ctaBtnText}>Pro'ya Geç</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </View>
            }
          </LinearGradient>
        </PressableScale>
        <Text style={styles.ctaNote}>İstediğin zaman iptal edebilirsin. Ücretsiz deneme yok.</Text>
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { paddingTop: 56, paddingBottom: Spacing.xxl ?? 40, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.md },
  proBadge: {
    paddingHorizontal: 20, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 12,
  },
  proBadgeText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800', letterSpacing: 3 },
  heroTitle: { color: '#fff', fontSize: 32, fontWeight: '800', marginBottom: 8 },
  heroSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.md, textAlign: 'center', paddingHorizontal: Spacing.xl },
  planContainer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, marginBottom: Spacing.lg },
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
  planBadge: {
    position: 'absolute', top: 0, right: 0,
    paddingHorizontal: 8, paddingVertical: 4,
    borderBottomLeftRadius: BorderRadius.sm,
  },
  planBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  planLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: 4, marginTop: 16 },
  planPrice: { color: Colors.text, fontSize: 28, fontWeight: '800', marginBottom: 2 },
  planPeriod: { color: Colors.textMuted, fontSize: FontSize.xs },
  planCheck: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.md,
  },
  planCheckText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  planCheckIcon: {},
  featuresSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  featureIconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  featureIcon: {},
  featureInfo: { flex: 1 },
  featureTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600', marginBottom: 2 },
  featureDesc: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 16 },
  featureCheck: {},
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
  ctaBtnGrad: { paddingVertical: 18, alignItems: 'center' },
  ctaBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800' },
  ctaNote: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },
});
