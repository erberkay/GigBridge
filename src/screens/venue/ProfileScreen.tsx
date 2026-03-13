import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';

// ERR-VPROFILE-001 Firestore güncelleme hatası   ERR-VPROFILE-002 Çıkış yapılamadı
// ERR-VPROFILE-003 Profil yüklenemedi
const ERR = {
  FIRESTORE_UPDATE:'ERR-VPROFILE-001',
  SIGN_OUT_FAILED: 'ERR-VPROFILE-002',
  LOAD_FAILED:     'ERR-VPROFILE-003',
} as const;

const AMENITIES = ['Profesyonel Ses Sistemi', 'Işık Sistemi', 'DJ Booth', 'Soyunma Odası', 'Parking', 'VIP Alan'];

type InfoIconName = 'location-outline' | 'people-outline' | 'call-outline' | 'globe-outline';

export default function VenueProfileScreen({ navigation }: any) {
  const displayName = useAuthStore((s) => s.displayName);
  const email       = useAuthStore((s) => s.email);
  const userId      = useAuthStore((s) => s.userId);
  const clearUser   = useAuthStore((s) => s.clearUser);
  const [isEditing, setIsEditing] = useState(false);
  const [address, setAddress] = useState('Şişli, İstanbul');
  const [capacity, setCapacity] = useState('500');
  const [phone, setPhone] = useState('+90 212 XXX XX XX');
  const [website, setWebsite] = useState('www.mekan.com');
  const [saving, setSaving] = useState(false);
  const [profileStats, setProfileStats] = useState({ events: '—', rating: '—', attendance: '—', artists: '—' });

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      getDoc(doc(db, 'users', userId)),
      getDocs(query(collection(db, 'events'), where('venueId', '==', userId))),
      getDocs(query(collection(db, 'venueReviews'), where('venueId', '==', userId))),
      getDocs(query(collection(db, 'invitations'), where('venueId', '==', userId), where('status', '==', 'accepted'))),
    ]).then(([userSnap, eventsSnap, reviewsSnap, invSnap]) => {
      if (userSnap.exists()) {
        const d = userSnap.data();
        if (d.address) setAddress(d.address);
        if (d.capacity != null) setCapacity(String(d.capacity));
        if (d.phone) setPhone(d.phone);
        if (d.website) setWebsite(d.website);
      }
      const evCount   = eventsSnap.size;
      const totalAtt  = eventsSnap.docs.reduce((s, d) => s + (d.data().attendeeCount ?? 0), 0);
      const revCount  = reviewsSnap.size;
      const avgRating = revCount > 0
        ? (reviewsSnap.docs.reduce((s, d) => s + (d.data().overallRating ?? 0), 0) / revCount).toFixed(1)
        : '—';
      const artistIds = new Set(invSnap.docs.map((d) => d.data().artistId).filter(Boolean));
      setProfileStats({
        events:     String(evCount),
        rating:     avgRating,
        attendance: totalAtt >= 1000 ? `${(totalAtt / 1000).toFixed(1)}K` : String(totalAtt),
        artists:    String(artistIds.size),
      });
    }).catch((err) => { console.warn(ERR.LOAD_FAILED, err); });
  }, [userId]);

  const handleSave = useCallback(async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', userId), { address, capacity, phone, website });
      setIsEditing(false);
      Alert.alert('Kaydedildi', 'Profiliniz güncellendi.');
    } catch {
      Alert.alert('Hata', `Profil güncellenemedi. (${ERR.FIRESTORE_UPDATE})`);
    } finally {
      setSaving(false);
    }
  }, [userId, address, capacity, phone, website]);

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
      {/* Kapak */}
      <LinearGradient colors={['#0A1929', '#0D2137', Colors.background]} style={styles.cover}>
        <View style={styles.avatarWrapper}>
          <LinearGradient colors={[Colors.venueColor, '#D97706']} style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName?.charAt(0).toUpperCase() ?? '?'}</Text>
          </LinearGradient>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        </View>
        <Text style={styles.name}>{displayName ?? 'Mekan'}</Text>
        <Text style={styles.email}>{email ?? ''}</Text>
        <View style={styles.typeBadge}>
          <Ionicons name="business-outline" size={13} color={Colors.venueColor} />
          <Text style={styles.typeText}>Mekan</Text>
        </View>
        {isEditing ? (
          <View style={styles.editBtnRow}>
            <TouchableOpacity style={[styles.editBtn, styles.editBtnCancel]} onPress={() => setIsEditing(false)}>
              <Text style={[styles.editBtnText, styles.editBtnCancelText]}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editBtn} onPress={handleSave} disabled={saving}>
              <Text style={styles.editBtnText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
            <Text style={styles.editBtnText}>Profili Düzenle</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* İstatistikler */}
      <View style={styles.statsRow}>
        <StatCard label="Etkinlik"       value={profileStats.events} />
        <StatCard label="Ort. Puan"      value={profileStats.rating}     color={Colors.accent} />
        <StatCard label="Toplam Katılım" value={profileStats.attendance} color={Colors.venueColor} />
        <StatCard label="Sanatçı"        value={profileStats.artists} />
      </View>

      {/* Mekan bilgileri */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mekan Bilgileri</Text>
        <View style={styles.infoCard}>
          {isEditing ? (
            <>
              <EditRow icon="location-outline" label="Adres" value={address} onChange={setAddress} />
              <EditRow icon="people-outline" label="Kapasite" value={capacity} onChange={setCapacity} keyboardType="numeric" />
              <EditRow icon="call-outline" label="Telefon" value={phone} onChange={setPhone} keyboardType="phone-pad" />
              <EditRow icon="globe-outline" label="Web Site" value={website} onChange={setWebsite} />
            </>
          ) : (
            <>
              <InfoRow icon="location-outline" label="Adres" value={address} />
              <InfoRow icon="people-outline" label="Kapasite" value={`${capacity} kişi`} />
              <InfoRow icon="call-outline" label="Telefon" value={phone} />
              <InfoRow icon="globe-outline" label="Web Site" value={website} />
            </>
          )}
        </View>
      </View>

      {/* Olanaklar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Olanaklar</Text>
        <View style={styles.amenitiesWrap}>
          {AMENITIES.map((a) => (
            <View key={a} style={styles.amenityTag}>
              <Ionicons name="checkmark-circle" size={13} color={Colors.venueColor} />
              <Text style={styles.amenityText}>{a}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Sanatçı değerlendirme notu */}
      <View style={styles.section}>
        <View style={styles.noticeCard}>
          <Ionicons name="star" size={24} color={Colors.venueColor} style={styles.noticeIcon} />
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>Sanatçı Değerlendirmeleri</Text>
            <Text style={styles.noticeText}>Sanatçılar mekanınızı gizli olarak değerlendiriyor. Bu puanlar iş kalitesini yansıtır.</Text>
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
        <LinearGradient colors={[Colors.venueColor, '#D97706']} style={styles.proBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
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

function InfoRow({ icon, label, value }: { icon: InfoIconName; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={Colors.textMuted} style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function EditRow({ icon, label, value, onChange, keyboardType }: { icon: InfoIconName; label: string; value: string; onChange: (v: string) => void; keyboardType?: any }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={Colors.textMuted} style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
      <TextInput
        style={styles.infoInput}
        value={value}
        onChangeText={onChange}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType}
      />
    </View>
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
  cover: { alignItems: 'center', paddingTop: 60, paddingBottom: Spacing.xl },
  avatarWrapper: { position: 'relative', marginBottom: Spacing.md },
  avatar: {
    width: 90, height: 90, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 38, fontWeight: '800', color: '#fff' },
  verifiedBadge: {
    position: 'absolute', right: 0, bottom: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.venueColor,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  name: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  email: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 12 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: Colors.venueColor + '22',
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.venueColor + '44',
    marginBottom: 16,
  },
  typeText: { color: Colors.venueColor, fontSize: FontSize.sm, fontWeight: '600' },
  editBtnRow: { flexDirection: 'row', gap: 10 },
  editBtn: {
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.venueColor,
  },
  editBtnText: { color: Colors.venueColor, fontSize: FontSize.sm, fontWeight: '700' },
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
  statValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  statLabel: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoIcon: { width: 28 },
  infoLabel: { color: Colors.textMuted, fontSize: FontSize.sm, width: 80 },
  infoValue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600', flex: 1 },
  infoInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm, fontWeight: '600', padding: 0 },
  amenitiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.venueColor + '22',
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.venueColor + '44',
  },
  amenityText: { color: Colors.venueColor, fontSize: FontSize.xs, fontWeight: '600' },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: Colors.venueColor + '11',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.venueColor + '33',
    gap: 12,
  },
  noticeIcon: { marginTop: 2 },
  noticeContent: { flex: 1 },
  noticeTitle: { color: Colors.venueColor, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 4 },
  noticeText: { color: Colors.textSecondary, fontSize: FontSize.xs, lineHeight: 18 },
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
  proBtn: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: 12,
  },
  proBtnGrad: { paddingVertical: 18, paddingHorizontal: Spacing.lg, alignItems: 'center' },
  proBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
  logoutBtn: {
    marginHorizontal: Spacing.lg,
    paddingVertical: 16,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.error + '44',
    alignItems: 'center',
    backgroundColor: Colors.error + '11',
  },
  logoutText: { color: Colors.error, fontSize: FontSize.md, fontWeight: '600' },
  editBtnCancel: { borderColor: Colors.textMuted },
  editBtnCancelText: { color: Colors.textMuted },
  settingsMenuItemBordered: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  proBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bottomSpacer: { height: 100 },
});
