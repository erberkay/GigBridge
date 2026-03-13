import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Linking, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { pickAndUploadImage } from '../../services/uploadImage';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';


// ERR-APROFILE-001 Fotoğraf yükleme hatası   ERR-APROFILE-002 Firestore güncelleme hatası
// ERR-APROFILE-003 Çıkış yapılamadı   ERR-APROFILE-004 Profil yüklenemedi
const ERR = {
  PHOTO_UPLOAD:    'ERR-APROFILE-001',
  FIRESTORE_UPDATE:'ERR-APROFILE-002',
  SIGN_OUT_FAILED: 'ERR-APROFILE-003',
  LOAD_FAILED:     'ERR-APROFILE-004',
} as const;

const DEFAULT_GENRES = ['Electronic', 'House', 'Techno', 'Trance', 'Minimal'];
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
const SOCIAL: { iconName: IoniconName; label: string; handle: string; url: string }[] = [
  { iconName: 'logo-instagram', label: 'Instagram', handle: '@dj_username', url: 'https://instagram.com/dj_username' },
  { iconName: 'musical-notes-outline', label: 'Spotify', handle: 'DJ Username', url: 'https://open.spotify.com/artist/dj_username' },
  { iconName: 'logo-youtube', label: 'YouTube', handle: 'DJ Username Official', url: 'https://youtube.com/@dj_username' },
];

export default function ArtistProfileScreen({ navigation }: any) {
  const displayName    = useAuthStore((s) => s.displayName);
  const email          = useAuthStore((s) => s.email);
  const userId         = useAuthStore((s) => s.userId);
  const storePhoto     = useAuthStore((s) => s.photoURL);
  const clearUser      = useAuthStore((s) => s.clearUser);
  const updatePhotoURL = useAuthStore((s) => s.updatePhotoURL);
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('10 yılı aşkın sahne deneyimiyle elektronik müzik alanında öne çıkan bir DJ ve prodüktör. İstanbul\'un önde gelen kulüplerinde sahne alan sanatçı, uluslararası festivallerde de performans sergilemiştir.');
  const [priceMin, setPriceMin] = useState('2.500');
  const [priceMax, setPriceMax] = useState('8.000');
  const [genres, setGenres] = useState(DEFAULT_GENRES);
  const [saving, setSaving] = useState(false);
  const [profileStats, setProfileStats] = useState({ performances: '—', rating: '—', reviews: '—', followers: '—' });
  const [localPhoto, setLocalPhoto] = useState<string | null>(storePhoto ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [newGenreText, setNewGenreText] = useState('');

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      getDoc(doc(db, 'users', userId)),
      getDocs(query(collection(db, 'invitations'), where('artistId', '==', userId), where('status', '==', 'accepted'))),
      getDocs(query(collection(db, 'reviews'), where('targetId', '==', userId), where('targetType', '==', 'artist'))),
    ]).then(([userSnap, invSnap, reviewsSnap]) => {
      if (userSnap.exists()) {
        const d = userSnap.data();
        if (d.bio) setBio(d.bio);
        if (d.priceMin != null) setPriceMin(String(d.priceMin));
        if (d.priceMax != null) setPriceMax(String(d.priceMax));
        if (d.genres?.length) setGenres(d.genres);
        const fc = d.followerCount ?? 0;
        const revCount  = reviewsSnap.size;
        const avgRating = revCount > 0
          ? (reviewsSnap.docs.reduce((s, doc) => s + (doc.data().rating ?? 0), 0) / revCount).toFixed(1)
          : '—';
        setProfileStats({
          performances: String(invSnap.size),
          rating:       avgRating,
          reviews:      String(revCount),
          followers:    fc >= 1000 ? `${(fc / 1000).toFixed(1)}K` : String(fc),
        });
      }
    }).catch((err) => { console.warn(ERR.LOAD_FAILED, err); });
  }, [userId]);

  const handleSave = useCallback(async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        bio, priceMin, priceMax, genres,
        ...(localPhoto ? { photoURL: localPhoto } : {}),
      });
      setIsEditing(false);
      Alert.alert('Kaydedildi', 'Profiliniz güncellendi.');
    } catch {
      Alert.alert('Hata', `Profil güncellenemedi. (${ERR.FIRESTORE_UPDATE})`);
    } finally {
      setSaving(false);
    }
  }, [userId, bio, priceMin, priceMax, genres, localPhoto]);

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
          console.warn(`[${ERR.PHOTO_UPLOAD}] Firestore photoURL güncellenemedi.`);
        }
      }
    } catch {
      Alert.alert('Hata', `Fotoğraf yüklenemedi. (${ERR.PHOTO_UPLOAD})`);
    } finally {
      setUploadingPhoto(false);
    }
  }, [userId, updatePhotoURL]);

  const removeGenre = useCallback((g: string) => {
    setGenres((prev) => prev.filter((x) => x !== g));
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert('Çıkış', 'Hesabınızdan çıkmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap', style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
          } catch {
            console.warn(`[${ERR.SIGN_OUT_FAILED}] Firebase sign-out başarısız.`);
          } finally {
            clearUser();
          }
        },
      },
    ]);
  }, [clearUser]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Kapak & Avatar */}
      <LinearGradient colors={[Colors.primaryDark, '#1A0A2E', Colors.background]} style={styles.coverGradient}>
        <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickPhoto} disabled={uploadingPhoto}>
          {localPhoto ? (
            <Image source={{ uri: localPhoto }} style={styles.avatarImage} />
          ) : (
            <LinearGradient colors={[Colors.artistColor, Colors.primaryDark]} style={styles.avatar}>
              <Text style={styles.avatarText}>{displayName?.charAt(0).toUpperCase() ?? '?'}</Text>
            </LinearGradient>
          )}
          <View style={styles.verifiedBadge}>
            {uploadingPhoto ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <View style={styles.cameraBtn}>
            <Ionicons name="camera" size={13} color={Colors.textSecondary} />
          </View>
        </TouchableOpacity>
        <Text style={styles.name}>{displayName ?? 'Sanatçı'}</Text>
        <Text style={styles.email}>{email ?? ''}</Text>
        <View style={styles.typeBadge}>
          <Ionicons name="mic-outline" size={13} color={Colors.artistColor} />
          <Text style={styles.typeText}>Sanatçı</Text>
        </View>

        <TouchableOpacity style={styles.editBtn} onPress={isEditing ? handleSave : () => setIsEditing(true)} disabled={saving}>
          <Text style={styles.editBtnText}>{saving ? 'Kaydediliyor...' : isEditing ? 'Kaydet' : 'Profili Düzenle'}</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* İstatistikler */}
      <View style={styles.statsRow}>
        <StatCard label="Performans" value={profileStats.performances} />
        <StatCard label="Puan"       value={profileStats.rating}       color={Colors.accent} />
        <StatCard label="Yorum"      value={profileStats.reviews} />
        <StatCard label="Takipçi"    value={profileStats.followers}    color={Colors.artistColor} />
      </View>

      {/* Türler */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Müzik Türleri</Text>
        <View style={styles.genresWrap}>
          {genres.map((g) => (
            <TouchableOpacity
              key={g}
              style={styles.genreTag}
              onPress={() => isEditing && removeGenre(g)}
              activeOpacity={isEditing ? 0.7 : 1}
            >
              <Text style={styles.genreTagText}>{g}</Text>
              {isEditing && <Ionicons name="close" size={12} color={Colors.textMuted} style={styles.closeTagIcon} />}
            </TouchableOpacity>
          ))}
          {isEditing && (
            newGenreText.length > 0 ? (
              <View style={styles.addGenreRow}>
                <TextInput
                  style={styles.addGenreInput}
                  value={newGenreText}
                  onChangeText={setNewGenreText}
                  placeholder="Tür adı..."
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (newGenreText.trim()) setGenres((prev) => [...prev, newGenreText.trim()]);
                    setNewGenreText('');
                  }}
                />
                <TouchableOpacity
                  style={styles.addGenreConfirm}
                  onPress={() => {
                    if (newGenreText.trim()) setGenres((prev) => [...prev, newGenreText.trim()]);
                    setNewGenreText('');
                  }}
                >
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addTag} onPress={() => setNewGenreText(' ')}>
                <Text style={styles.addTagText}>+ Ekle</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>

      {/* Biyografi */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hakkında</Text>
        {isEditing ? (
          <TextInput
            style={styles.bioInput}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor={Colors.textMuted}
            placeholder="Kendinizi tanıtın..."
          />
        ) : (
          <View style={styles.bioCard}>
            <Text style={styles.bioText}>{bio}</Text>
          </View>
        )}
      </View>

      {/* Fiyat aralığı */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performans Ücreti</Text>
        <View style={styles.priceCard}>
          <View style={styles.priceLeft}>
            <Text style={styles.priceLabel}>Minimum</Text>
            {isEditing ? (
              <TextInput
                style={styles.priceInput}
                value={priceMin}
                onChangeText={setPriceMin}
                keyboardType="numeric"
                placeholderTextColor={Colors.textMuted}
              />
            ) : (
              <Text style={styles.priceValue}>₺{priceMin}</Text>
            )}
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.priceRight}>
            <Text style={styles.priceLabel}>Maksimum</Text>
            {isEditing ? (
              <TextInput
                style={styles.priceInput}
                value={priceMax}
                onChangeText={setPriceMax}
                keyboardType="numeric"
                placeholderTextColor={Colors.textMuted}
              />
            ) : (
              <Text style={styles.priceValue}>₺{priceMax}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Sosyal medya */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sosyal Medya</Text>
        {SOCIAL.map((s) => (
          <TouchableOpacity key={s.label} style={styles.socialRow} onPress={() => Linking.openURL(s.url).catch(() => {})}>
            <Ionicons name={s.iconName} size={20} color={Colors.artistColor} style={styles.socialIcon} />
            <View style={styles.socialInfo}>
              <Text style={styles.socialLabel}>{s.label}</Text>
              <Text style={styles.socialHandle}>{s.handle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Mekan değerlendirme notu */}
      <View style={styles.section}>
        <View style={styles.noticeCard}>
          <Ionicons name="lock-closed-outline" size={24} color={Colors.artistColor} />
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>Mekan Değerlendirmeleri</Text>
            <Text style={styles.noticeText}>Çalıştığınız mekanları sadece sanatçılar görebilir. Mekanları gizlilik içinde puanlayabilirsiniz.</Text>
          </View>
        </View>
      </View>

      <View style={styles.settingsMenu}>
        <TouchableOpacity style={[styles.settingsMenuItem, styles.settingsMenuItemBordered]} onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={20} color={Colors.textSecondary} style={styles.settingsMenuIcon} />
          <Text style={styles.settingsMenuLabel}>Bildirim Ayarları</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsMenuItem} onPress={() => navigation.navigate('PrivacySettings')}>
          <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.settingsMenuIcon} />
          <Text style={styles.settingsMenuLabel}>Gizlilik Ayarları</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.proBtn} onPress={() => navigation.navigate('ProAccount')} activeOpacity={0.85}>
        <LinearGradient colors={[Colors.artistColor, Colors.primary]} style={styles.proBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <View style={styles.proBtnInner}>
            <Ionicons name="diamond-outline" size={18} color="#fff" />
            <Text style={styles.proBtnText}>Pro Hesaba Geç</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  coverGradient: { alignItems: 'center', paddingTop: 60, paddingBottom: Spacing.xl },
  avatarWrapper: { position: 'relative', marginBottom: Spacing.md },
  avatar: {
    width: 90, height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 38, fontWeight: '800', color: '#fff' },
  verifiedBadge: {
    position: 'absolute', right: 0, bottom: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  avatarImage: { width: 90, height: 90, borderRadius: 45, resizeMode: 'cover' },
  cameraBtn: {
    position: 'absolute', bottom: 0, left: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  name: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  email: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 12 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: Colors.artistColor + '22',
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.artistColor + '44',
    marginBottom: 16,
  },
  typeText: { color: Colors.artistColor, fontSize: FontSize.sm, fontWeight: '600' },
  editBtn: {
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.artistColor,
  },
  editBtnText: { color: Colors.artistColor, fontSize: FontSize.sm, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    margin: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  statCard: {
    flex: 1, alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRightWidth: 1, borderRightColor: Colors.border,
  },
  statValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: 12 },
  genresWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreTag: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: Colors.artistColor + '22',
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.artistColor + '44',
    flexDirection: 'row', alignItems: 'center',
  },
  genreTagText: { color: Colors.artistColor, fontSize: FontSize.sm, fontWeight: '600' },
  addTag: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  addTagText: { color: Colors.textMuted, fontSize: FontSize.sm },
  addGenreRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addGenreInput: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 10, paddingVertical: 6,
    color: Colors.text, fontSize: FontSize.sm,
    minWidth: 80,
  },
  addGenreConfirm: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  bioCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  bioText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 22 },
  bioInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.primary,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSize.sm,
    minHeight: 100,
  },
  priceInput: {
    color: Colors.success,
    fontSize: FontSize.lg,
    fontWeight: '800',
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingVertical: 2,
    minWidth: 60,
    textAlign: 'center',
  },
  priceCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  priceLeft: { flex: 1, alignItems: 'center', padding: Spacing.md },
  priceRight: { flex: 1, alignItems: 'center', padding: Spacing.md },
  priceDivider: { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  priceLabel: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: 6 },
  priceValue: { color: Colors.success, fontSize: FontSize.lg, fontWeight: '800' },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  socialIcon: { width: 32 },
  socialInfo: { flex: 1 },
  socialLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, marginBottom: 2 },
  socialHandle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: Colors.artistColor + '11',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.artistColor + '33',
    gap: 12,
  },
  noticeContent: { flex: 1 },
  noticeTitle: { color: Colors.artistColor, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 4 },
  noticeText: { color: Colors.textSecondary, fontSize: FontSize.xs, lineHeight: 18 },
  proBtn: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: 12,
  },
  proBtnGrad: { paddingVertical: 18, paddingHorizontal: Spacing.lg, alignItems: 'center' },
  proBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
  settingsMenu: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  settingsMenuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 16,
  },
  settingsMenuIcon: { width: 28 },
  settingsMenuLabel: { color: Colors.text, fontSize: FontSize.md, flex: 1 },
  logoutBtn: {
    marginHorizontal: Spacing.lg,
    paddingVertical: 16,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.error + '44',
    alignItems: 'center',
    backgroundColor: Colors.error + '11',
  },
  logoutText: { color: Colors.error, fontSize: FontSize.md, fontWeight: '600' },
  closeTagIcon: { marginLeft: 4 },
  settingsMenuItemBordered: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  proBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bottomSpacer: { height: 100 },
});
