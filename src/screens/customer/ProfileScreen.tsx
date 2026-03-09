import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { pickAndUploadImage } from '../../services/uploadImage';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { PressableScale } from '../../components/common/PressableScale';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function CustomerProfileScreen({ navigation }: any) {
  const { displayName, email, userId, photoURL: storePhoto, clearUser, updatePhotoURL } = useAuthStore();
  const [photoURL, setPhotoURL] = useState<string | null>(storePhoto ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePickPhoto = async () => {
    if (userId?.startsWith('demo_')) {
      Alert.alert('Demo Mod', 'Demo hesapta fotoğraf yükleyemezsiniz.');
      return;
    }
    setUploadingPhoto(true);
    try {
      const url = await pickAndUploadImage(`profile_photos/${userId}`);
      if (url && userId) {
        setPhotoURL(url);
        updatePhotoURL(url);
        await updateDoc(doc(db, 'users', userId), { photoURL: url });
      }
    } catch {
      Alert.alert('Hata', 'Fotoğraf yüklenemedi.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const MENU_ITEMS: { icon: IoniconName; label: string; badge?: string | null; isHighlight?: boolean; route: string }[] = [
    { icon: 'musical-notes-outline', label: 'Takip Ettiğim Sanatçılar', badge: null, route: 'Following' },
    { icon: 'calendar-outline', label: 'Etkinlik Geçmişim', badge: '8', route: 'Events' },
    { icon: 'star-outline', label: 'Yorumlarım', badge: '5', route: 'MyReviews' },
    { icon: 'heart-outline', label: 'Favorilerim', badge: '23', route: 'Favorites' },
    { icon: 'notifications-outline', label: 'Bildirim Ayarları', badge: null, route: 'Notifications' },
    { icon: 'lock-closed-outline', label: 'Gizlilik Ayarları', badge: null, route: 'PrivacySettings' },
    { icon: 'diamond-outline', label: 'Pro Hesap', badge: 'YENİ', isHighlight: true, route: 'ProAccount' },
  ];

  const handleLogout = () => {
    Alert.alert('Çıkış', 'Hesabınızdan çıkmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap', style: 'destructive',
        onPress: async () => {
          await signOut(auth);
          clearUser();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profil başlık */}
      <LinearGradient colors={['#1A0A2E', Colors.background]} style={styles.headerGradient}>
        <TouchableOpacity style={styles.avatarContainer} onPress={handlePickPhoto} disabled={uploadingPhoto}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatarImage} />
          ) : (
            <LinearGradient colors={[Colors.customerColor, '#0891B2']} style={styles.avatar}>
              <Text style={styles.avatarText}>
                {displayName?.charAt(0).toUpperCase() ?? '?'}
              </Text>
            </LinearGradient>
          )}
          <View style={styles.editAvatarBtn}>
            {uploadingPhoto
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="camera" size={13} color={Colors.textSecondary} />
            }
          </View>
        </TouchableOpacity>
        <Text style={styles.displayName}>{displayName ?? 'Kullanıcı'}</Text>
        <Text style={styles.email}>{email}</Text>
        <View style={styles.typeBadge}>
          <Ionicons name="headset-outline" size={13} color={Colors.customerColor} />
          <Text style={styles.typeText}>Müşteri</Text>
        </View>
      </LinearGradient>

      {/* İstatistikler */}
      <View style={styles.statsRow}>
        <StatCard label="Etkinlik" value="8" />
        <StatCard label="Takip" value="12" />
        <StatCard label="Yorum" value="5" />
        <StatCard label="Puan" value="4.8" isRating />
      </View>

      {/* Pro hesap banner */}
      <PressableScale style={{ marginHorizontal: Spacing.lg, marginBottom: Spacing.lg }} onPress={() => navigation.navigate('ProAccount')}>
        <LinearGradient
          colors={[Colors.accent, '#D97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.proBanner}
        >
          <View>
            <Text style={styles.proTitle}>Pro Hesaba Geç</Text>
            <Text style={styles.proDesc}>Etkinliklerde diğer katılımcılarla tanış</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </LinearGradient>
      </PressableScale>

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
              <Text style={[styles.menuLabel, item.isHighlight && { color: Colors.accent }]}>{item.label}</Text>
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
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function StatCard({ label, value, isRating }: { label: string; value: string; isRating?: boolean }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, isRating && { color: Colors.accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerGradient: { alignItems: 'center', paddingTop: 60, paddingBottom: Spacing.xl },
  avatarContainer: { position: 'relative', marginBottom: Spacing.md },
  avatar: {
    width: 88, height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
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
    backgroundColor: Colors.customerColor + '22',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.customerColor + '44',
  },
  typeText: { color: Colors.customerColor, fontSize: FontSize.sm, fontWeight: '600' },
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
  statValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  proBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  proTitle: { fontSize: FontSize.md, fontWeight: '800', color: '#fff', marginBottom: 2 },
  proDesc: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.8)' },
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
  logoutBtn: {
    marginHorizontal: Spacing.lg,
    paddingVertical: 16,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error + '44',
    alignItems: 'center',
    backgroundColor: Colors.error + '11',
  },
  logoutText: { color: Colors.error, fontSize: FontSize.md, fontWeight: '600' },
});
