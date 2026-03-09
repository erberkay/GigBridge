import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Linking, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { pickAndUploadImage } from '../../services/uploadImage';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';


const DEFAULT_GENRES = ['Electronic', 'House', 'Techno', 'Trance', 'Minimal'];
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
const SOCIAL: { iconName: IoniconName; label: string; handle: string; url: string }[] = [
  { iconName: 'logo-instagram', label: 'Instagram', handle: '@dj_username', url: 'https://instagram.com/dj_username' },
  { iconName: 'musical-notes-outline', label: 'Spotify', handle: 'DJ Username', url: 'https://open.spotify.com/artist/dj_username' },
  { iconName: 'logo-youtube', label: 'YouTube', handle: 'DJ Username Official', url: 'https://youtube.com/@dj_username' },
];

export default function ArtistProfileScreen({ navigation }: any) {
  const { displayName, email, userId, photoURL: storePhoto, clearUser, updatePhotoURL } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('10 yılı aşkın sahne deneyimiyle elektronik müzik alanında öne çıkan bir DJ ve prodüktör. İstanbul\'un önde gelen kulüplerinde sahne alan sanatçı, uluslararası festivallerde de performans sergilemiştir.');
  const [priceMin, setPriceMin] = useState('2.500');
  const [priceMax, setPriceMax] = useState('8.000');
  const [genres, setGenres] = useState(DEFAULT_GENRES);
  const [saving, setSaving] = useState(false);
  const [photoURL, setPhotoURL] = useState<string | null>(storePhoto ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', userId), { bio, priceMin, priceMax, genres, ...(photoURL ? { photoURL } : {}) });
      setIsEditing(false);
      Alert.alert('Kaydedildi', 'Profiliniz güncellendi.');
    } catch {
      Alert.alert('Hata', 'Profil güncellenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handlePickPhoto = async () => {
    if (userId?.startsWith('demo_')) {
      Alert.alert('Demo Mod', 'Demo hesapta fotoğraf yükleyemezsiniz.');
      return;
    }
    setUploadingPhoto(true);
    try {
      const url = await pickAndUploadImage(`profile_photos/${userId}`);
      if (url) { setPhotoURL(url); updatePhotoURL(url); }
    } catch {
      Alert.alert('Hata', 'Fotoğraf yüklenemedi.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removeGenre = (g: string) => setGenres((prev) => prev.filter((x) => x !== g));

  const handleLogout = () => {
    Alert.alert('Çıkış', 'Hesabınızdan çıkmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap', style: 'destructive',
        onPress: async () => { await signOut(auth); clearUser(); },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Kapak & Avatar */}
      <LinearGradient colors={[Colors.primaryDark, '#1A0A2E', Colors.background]} style={styles.coverGradient}>
        <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickPhoto} disabled={uploadingPhoto}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatarImage} />
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
        <Text style={styles.email}>{email}</Text>
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
        <StatCard label="Performans" value="28" />
        <StatCard label="Puan" value="4.8" color={Colors.accent} />
        <StatCard label="Yorum" value="64" />
        <StatCard label="Takipçi" value="1.2K" color={Colors.artistColor} />
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
              {isEditing && <Ionicons name="close" size={12} color={Colors.textMuted} style={{ marginLeft: 4 }} />}
            </TouchableOpacity>
          ))}
          {isEditing && (
            <TouchableOpacity style={styles.addTag} onPress={() => Alert.prompt(
              'Tür Ekle',
              'Yeni müzik türü girin:',
              (text) => { if (text?.trim()) setGenres((prev) => [...prev, text.trim()]); },
              'plain-text',
            )}>
              <Text style={styles.addTagText}>+ Ekle</Text>
            </TouchableOpacity>
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
          <TouchableOpacity key={s.label} style={styles.socialRow} onPress={() => Linking.openURL(s.url)}>
            <Ionicons name={s.iconName} size={20} color={Colors.artistColor} style={styles.socialIcon} />
            <View style={styles.socialInfo}>
              <Text style={styles.socialLabel}>{s.label}</Text>
              <Text style={styles.socialHandle}>{s.handle}</Text>
            </View>
            <Text style={styles.socialArrow}>›</Text>
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
        <TouchableOpacity style={[styles.settingsMenuItem, { borderBottomWidth: 1, borderBottomColor: Colors.border }]} onPress={() => navigation.navigate('Notifications')}>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="diamond-outline" size={18} color="#fff" />
            <Text style={styles.proBtnText}>Pro Hesaba Geç</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
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
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  cameraBtn: {
    position: 'absolute', bottom: 0, left: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  cameraIcon: { fontSize: 12 },
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
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.artistColor,
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
  socialArrow: { color: Colors.textMuted, fontSize: 20 },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: Colors.artistColor + '11',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.artistColor + '33',
    gap: 12,
  },
  noticeIcon: { marginTop: 2 },
  noticeContent: { flex: 1 },
  noticeTitle: { color: Colors.artistColor, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 4 },
  noticeText: { color: Colors.textSecondary, fontSize: FontSize.xs, lineHeight: 18 },
  proBtn: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: 12,
  },
  proBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  proBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
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
    borderBottomWidth: 1, borderBottomColor: Colors.border,
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
});
