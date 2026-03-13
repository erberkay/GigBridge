import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { signOut, deleteUser } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { PressableScale } from '../../components/common/PressableScale';

// ERR-PRIVACY-001 Firestore kayıt hatası   ERR-PRIVACY-002 Hesap silme hatası
const ERR = {
  SAVE:        'ERR-PRIVACY-001',
  DELETE_USER: 'ERR-PRIVACY-002',
} as const;

function SettingRow({ label, desc, value, onChange, accentColor }: {
  label: string; desc: string; value: boolean;
  onChange: (v: boolean) => void; accentColor: string;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.border, true: accentColor }}
        thumbColor="#fff"
      />
    </View>
  );
}

export default function PrivacySettingsScreen({ navigation }: any) {
  const userType  = useAuthStore((s) => s.userType);
  const userId    = useAuthStore((s) => s.userId);
  const clearUser = useAuthStore((s) => s.clearUser);

  const [privateAccount, setPrivateAccount] = useState(false);
  const [showLocation, setShowLocation] = useState(true);
  const [showAttendance, setShowAttendance] = useState(true);
  const [showReviews, setShowReviews] = useState(true);
  const [allowMessages, setAllowMessages] = useState(true);
  const [showOnTimeline, setShowOnTimeline] = useState(true);
  const [dataAnalytics, setDataAnalytics] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getDoc(doc(db, 'users', userId)).then((snap) => {
      const ps = snap.data()?.privacySettings;
      if (!ps) return;
      if (ps.privateAccount  !== undefined) setPrivateAccount(ps.privateAccount);
      if (ps.showLocation    !== undefined) setShowLocation(ps.showLocation);
      if (ps.showAttendance  !== undefined) setShowAttendance(ps.showAttendance);
      if (ps.showReviews     !== undefined) setShowReviews(ps.showReviews);
      if (ps.allowMessages   !== undefined) setAllowMessages(ps.allowMessages);
      if (ps.showOnTimeline  !== undefined) setShowOnTimeline(ps.showOnTimeline);
      if (ps.dataAnalytics   !== undefined) setDataAnalytics(ps.dataAnalytics);
      if (ps.marketingEmails !== undefined) setMarketingEmails(ps.marketingEmails);
    }).catch(() => { /* use defaults */ });
  }, [userId]);

  const accentColor = useMemo(() =>
    userType === 'artist' ? Colors.artistColor :
    userType === 'venue'  ? Colors.venueColor :
    Colors.customerColor,
  [userType]);

  const handleSave = useCallback(async () => {
    try {
      if (userId) {
        await setDoc(doc(db, 'users', userId), {
          privacySettings: {
            privateAccount, showLocation, showAttendance,
            showReviews, allowMessages, showOnTimeline,
            dataAnalytics, marketingEmails,
          },
        }, { merge: true });
      }
      Alert.alert('Kaydedildi', 'Gizlilik ayarlarınız güncellendi.');
    } catch {
      Alert.alert('Hata', `Ayarlar kaydedilemedi. (${ERR.SAVE})`);
    }
  }, [userId, privateAccount, showLocation, showAttendance, showReviews, allowMessages, showOnTimeline, dataAnalytics, marketingEmails]);

  const handleDeleteData = useCallback(() => {
    Alert.alert(
      'Verilerimi Sil',
      'Tüm verileriniz silinecek ve hesabınız kapatılacak. Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil', style: 'destructive',
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (user) await deleteUser(user);
            } catch {
              console.warn(`[${ERR.DELETE_USER}] deleteUser başarısız, signOut deneniyor.`);
              try { await signOut(auth); } catch { /* sign-out da başarısız */ }
            } finally {
              clearUser();
            }
          },
        },
      ],
    );
  }, [clearUser]);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#1A0A2E', Colors.background]} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
          <View style={[styles.headerIcon, { borderColor: accentColor + '44', backgroundColor: accentColor + '18' }]}>
            <Ionicons name="lock-closed-outline" size={28} color={accentColor} />
          </View>
          <Text style={styles.title}>Gizlilik Ayarları</Text>
          <Text style={styles.subtitle}>Profilinizin ve verilerinizin görünürlüğünü yönetin</Text>
        </LinearGradient>

        {/* Hesap gizliliği */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Hesap</Text>
          <View style={styles.groupCard}>
            <SettingRow
              label="Gizli Hesap"
              desc="Takip isteği onaylamadan profiliniz görüntülenemez"
              value={privateAccount}
              onChange={setPrivateAccount}
              accentColor={accentColor}
            />
            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Konum Paylaşımı</Text>
                <Text style={styles.settingDesc}>Haritada yakın etkinlikleri görmek için</Text>
              </View>
              <Switch
                value={showLocation}
                onValueChange={setShowLocation}
                trackColor={{ false: Colors.border, true: accentColor }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Profil görünürlüğü */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Profil Görünürlüğü</Text>
          <View style={styles.groupCard}>
            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Katılım Listesi</Text>
                <Text style={styles.settingDesc}>Katıldığınız etkinlikler profilde görünsün</Text>
              </View>
              <Switch
                value={showAttendance}
                onValueChange={setShowAttendance}
                trackColor={{ false: Colors.border, true: accentColor }}
                thumbColor="#fff"
              />
            </View>
            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Yorumlarım</Text>
                <Text style={styles.settingDesc}>Yazdığınız yorumlar profilde görünsün</Text>
              </View>
              <Switch
                value={showReviews}
                onValueChange={setShowReviews}
                trackColor={{ false: Colors.border, true: accentColor }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Timeline Paylaşımları</Text>
                <Text style={styles.settingDesc}>Paylaşımlarınız herkese görünsün</Text>
              </View>
              <Switch
                value={showOnTimeline}
                onValueChange={setShowOnTimeline}
                trackColor={{ false: Colors.border, true: accentColor }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* İletişim */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>İletişim</Text>
          <View style={styles.groupCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Mesaj İzni</Text>
                <Text style={styles.settingDesc}>Takip etmediğiniz kişiler mesaj gönderebilsin</Text>
              </View>
              <Switch
                value={allowMessages}
                onValueChange={setAllowMessages}
                trackColor={{ false: Colors.border, true: accentColor }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Veri & Analiz */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Veri & Analiz</Text>
          <View style={styles.groupCard}>
            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Kullanım Analizi</Text>
                <Text style={styles.settingDesc}>Anonim kullanım verilerini GigBridge ile paylaş</Text>
              </View>
              <Switch
                value={dataAnalytics}
                onValueChange={setDataAnalytics}
                trackColor={{ false: Colors.border, true: accentColor }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Pazarlama E-postaları</Text>
                <Text style={styles.settingDesc}>Kampanya ve fırsatlar hakkında e-posta al</Text>
              </View>
              <Switch
                value={marketingEmails}
                onValueChange={setMarketingEmails}
                trackColor={{ false: Colors.border, true: accentColor }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Kaydet */}
        <PressableScale style={styles.saveBtn} onPress={handleSave} scaleTo={0.97}>
          <LinearGradient colors={[accentColor, accentColor + 'BB']} style={styles.saveBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.saveBtnText}>Ayarları Kaydet</Text>
          </LinearGradient>
        </PressableScale>

        {/* Veri silme */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Tehlikeli Bölge</Text>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteData}>
            <Ionicons name="trash-outline" size={16} color={Colors.error} style={styles.trashIcon} />
            <Text style={styles.deleteBtnText}>Tüm Verilerimi Sil</Text>
          </TouchableOpacity>
          <Text style={styles.deleteNote}>Bu işlem geri alınamaz. Hesabınız ve tüm verileriniz silinir.</Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginBottom: Spacing.md, padding: 4 },
  headerIcon: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.sm, lineHeight: 20, textAlign: 'center' },
  group: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  groupTitle: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  groupCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  settingInfo: { flex: 1, marginRight: 12 },
  settingLabel: { color: Colors.text, fontSize: FontSize.md, marginBottom: 2 },
  settingDesc: { color: Colors.textMuted, fontSize: FontSize.xs },
  saveBtn: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  saveBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  dangerZone: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  dangerTitle: { color: Colors.error, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  deleteBtn: {
    paddingVertical: 14, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.error + '44',
    backgroundColor: Colors.error + '11',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  deleteBtnText: { color: Colors.error, fontSize: FontSize.md, fontWeight: '600' },
  deleteNote: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },
  trashIcon: { marginRight: 8 },
  bottomSpacer: { height: 60 },
});
