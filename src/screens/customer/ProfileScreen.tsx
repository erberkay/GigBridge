import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { pickAndUploadImage } from '../../services/uploadImage';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { PressableScale } from '../../components/common/PressableScale';

// ERR-CPROFILE-001 Fotoğraf yükleme hatası   ERR-CPROFILE-002 Firestore güncelleme hatası
// ERR-CPROFILE-003 Çıkış yapılamadı
const ERR = {
  PHOTO_UPLOAD:    'ERR-CPROFILE-001',
  FIRESTORE_UPDATE:'ERR-CPROFILE-002',
  SIGN_OUT_FAILED: 'ERR-CPROFILE-003',
} as const;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const MENU_ITEMS: { icon: IoniconName; label: string; badge?: string | null; isHighlight?: boolean; route: string }[] = [
  { icon: 'musical-notes-outline', label: 'Takip Ettiğim Sanatçılar', badge: null, route: 'Following' },
  { icon: 'calendar-outline', label: 'Etkinlik Geçmişim', badge: '8', route: 'Events' },
  { icon: 'star-outline', label: 'Yorumlarım', badge: '5', route: 'MyReviews' },
  { icon: 'heart-outline', label: 'Favorilerim', badge: '23', route: 'Favorites' },
  { icon: 'notifications-outline', label: 'Bildirim Ayarları', badge: null, route: 'Notifications' },
  { icon: 'lock-closed-outline', label: 'Gizlilik Ayarları', badge: null, route: 'PrivacySettings' },
  { icon: 'diamond-outline', label: 'Pro Hesap', badge: 'YENİ', isHighlight: true, route: 'ProAccount' },
];

export default function CustomerProfileScreen({ navigation }: any) {
  // Selectors
  const displayName    = useAuthStore((s) => s.displayName);
  const email          = useAuthStore((s) => s.email);
  const userId         = useAuthStore((s) => s.userId);
  const storePhoto     = useAuthStore((s) => s.photoURL);
  const clearUser      = useAuthStore((s) => s.clearUser);
  const updatePhotoURL = useAuthStore((s) => s.updatePhotoURL);

  // storePhoto'yu doğrudan kullan — senkronizasyon sorununu önler
  const [localPhoto, setLocalPhoto] = useState<string | null>(storePhoto ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [stats, setStats] = useState({ events: '—', following: '—', reviews: '—', rating: '—' });
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    if (!userId || userId.startsWith('demo_')) return;
    (async () => {
      try {
        const [followSnap, reviewsSnap, userSnap] = await Promise.all([
          getDocs(collection(db, 'users', userId, 'following')),
          getDocs(query(collection(db, 'reviews'), where('authorId', '==', userId))),
          getDoc(doc(db, 'users', userId)),
        ]);
        const followCount  = followSnap.size;
        const reviewCount  = reviewsSnap.size;
        const userData = userSnap.data();
        const attendedCount = userData?.attendedCount ?? 0;
        if (userData?.isPro) setIsPro(true);
        const avgRating = reviewCount > 0
          ? (reviewsSnap.docs.reduce((sum, d) => sum + (d.data().rating ?? 0), 0) / reviewCount).toFixed(1)
          : '—';
        setStats({
          events:    String(attendedCount),
          following: String(followCount),
          reviews:   String(reviewCount),
          rating:    String(avgRating),
        });
      } catch { /* demo değerleri kalsın */ }
    })();
  }, [userId]);

  const handlePickPhoto = useCallback(async () => {
    if (userId?.startsWith('demo_')) {
      Alert.alert('Demo Mod', 'Demo hesapta fotoğraf yükleyemezsiniz.');
      return;
    }
    setUploadingPhoto(true);
    try {
      const url = await pickAndUploadImage(`profile_photos/${userId}`);
      if (url && userId) {
        setLocalPhoto(url);
        updatePhotoURL(url);
        try {
          await updateDoc(doc(db, 'users', userId), { photoURL: url });
        } catch {
          console.warn(`[${ERR.FIRESTORE_UPDATE}] Firestore photoURL güncellenemedi.`);
        }
      }
    } catch {
      Alert.alert('Hata', `Fotoğraf yüklenemedi. (${ERR.PHOTO_UPLOAD})`);
    } finally {
      setUploadingPhoto(false);
    }
  }, [userId, updatePhotoURL]);

  const handleLogout = useCallback(() => {
    Alert.alert('Çıkış', 'Hesabınızdan çıkmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap', style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
          } catch {
            console.warn(`[${ERR.SIGN_OUT_FAILED}] Firebase sign-out başarısız.`);
          } finally {
            clearUser();  // Auth başarısız olsa bile local state'i temizle
          }
        },
      },
    ]);
  }, [clearUser]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profil başlık */}
      <LinearGradient colors={['#1A0A2E', Colors.background]} style={styles.headerGradient}>
        <TouchableOpacity style={styles.avatarContainer} onPress={handlePickPhoto} disabled={uploadingPhoto}>
          <LinearGradient
            colors={['#A855F7', '#06B6D4', '#A855F7']}
            style={styles.avatarRing}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.avatarInner}>
              {localPhoto ? (
                <Image source={{ uri: localPhoto }} style={styles.avatarImage} />
              ) : (
                <LinearGradient colors={['#A855F7', '#0891B2']} style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {displayName?.charAt(0).toUpperCase() ?? '?'}
                  </Text>
                </LinearGradient>
              )}
            </View>
          </LinearGradient>
          <View style={styles.editAvatarBtn}>
            {uploadingPhoto
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="camera" size={13} color={Colors.textSecondary} />
            }
          </View>
        </TouchableOpacity>
        <Text style={styles.displayName}>{displayName ?? 'Kullanıcı'}</Text>
        <Text style={styles.email}>{email ?? ''}</Text>
        <View style={styles.typeBadge}>
          <Ionicons name="headset-outline" size={13} color="#A855F7" />
          <Text style={styles.typeText}>Üye</Text>
        </View>
      </LinearGradient>

      {/* İstatistikler */}
      <View style={styles.statsRow}>
        <StatCard label="Etkinlik" value={stats.events} icon="calendar-outline" />
        <View style={styles.statDivider} />
        <StatCard label="Takip" value={stats.following} icon="people-outline" />
        <View style={styles.statDivider} />
        <StatCard label="Yorum" value={stats.reviews} icon="chatbubble-outline" />
        <View style={styles.statDivider} />
        <StatCard label="Puan" value={stats.rating} isRating icon="star" />
      </View>

      {/* Pro hesap banner — sadece Pro değilse göster */}
      {!isPro && <PressableScale style={styles.proBannerWrap} onPress={() => navigation.navigate('ProAccount')}>
        <LinearGradient
          colors={['#1A0533', '#2D1B69']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.proBanner}
        >
          <View style={styles.proBannerLeft}>
            <View style={styles.proEyebrowRow}>
              <Ionicons name="diamond" size={10} color="#A855F7" />
              <Text style={styles.proEyebrow}>EXCLUSIVE</Text>
            </View>
            <Text style={styles.proTitle}>Pro Hesaba Geç</Text>
            <Text style={styles.proDesc}>Özel ayrıcalıklar ve içerikler kazan</Text>
          </View>
          <View style={styles.proDiamondWrap}>
            <Ionicons name="diamond" size={30} color="#A855F7" />
          </View>
        </LinearGradient>
      </PressableScale>}

      {/* Menü */}
      <View style={styles.menuContainer}>
        {MENU_ITEMS.map((item, i) => (
          <PressableScale
            key={i}
            style={[styles.menuItem, i < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
            onPress={() => navigation.navigate(item.route)}
            scaleTo={0.97}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, item.isHighlight && styles.menuIconWrapHighlight]}>
                <Ionicons name={item.icon} size={18} color={item.isHighlight ? Colors.accent : Colors.textSecondary} />
              </View>
              <Text style={[styles.menuLabel, item.isHighlight && styles.menuLabelHighlight]}>{item.label}</Text>
            </View>
            <View style={styles.menuRight}>
              {item.badge && (
                <View style={[styles.badge, item.isHighlight && styles.badgeHighlight]}>
                  <Text style={[styles.badgeText, item.isHighlight && styles.badgeHighlightText]}>{item.badge}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </View>
          </PressableScale>
        ))}
      </View>

      {/* Çıkış */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={17} color="#F87171" />
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function StatCard({ label, value, isRating, icon }: { label: string; value: string; isRating?: boolean; icon: IoniconName }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={15} color={isRating ? Colors.accent : '#A855F7'} style={styles.statIcon} />
      <Text style={[styles.statValue, isRating && styles.statValueRating]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerGradient: { alignItems: 'center', paddingTop: 60, paddingBottom: Spacing.xl },
  avatarContainer: { position: 'relative', marginBottom: Spacing.md },
  avatarRing: { padding: 3, borderRadius: 47 },
  avatarInner: { width: 88, height: 88, borderRadius: 44, overflow: 'hidden' },
  avatar: {
    width: 88, height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  avatarImage: { width: 88, height: 88, borderRadius: 44, resizeMode: 'cover' },
  editAvatarBtn: {
    position: 'absolute', right: 0, bottom: 0,
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  email: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 12 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
  },
  typeText: { color: '#A855F7', fontSize: FontSize.sm, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    margin: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: Colors.border },
  statIcon: { marginBottom: 4 },
  statValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: 2 },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  proBannerWrap: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  bottomSpacer: { height: 100 },
  proBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
  },
  proBannerLeft: { flex: 1 },
  proEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  proEyebrow: { color: '#A855F7', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  proTitle: { fontSize: FontSize.md, fontWeight: '800', color: '#fff', marginBottom: 2 },
  proDesc: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.65)' },
  proDiamondWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(168,85,247,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
  },
  menuContainer: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  menuIconWrapHighlight: {
    backgroundColor: Colors.accent + '18',
  },
  menuLabel: { color: Colors.text, fontSize: FontSize.md },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.full,
  },
  badgeHighlight: { backgroundColor: Colors.accent + '22' },
  badgeText: { color: Colors.textMuted, fontSize: FontSize.xs },
  badgeHighlightText: { color: Colors.accent, fontWeight: '700' },
  menuLabelHighlight: { color: Colors.accent },
  statValueRating: { color: Colors.accent },
  logoutBtn: {
    marginHorizontal: Spacing.lg,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.05)',
  },
  logoutText: { color: '#F87171', fontSize: FontSize.md, fontWeight: '600' },
});
