import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { PressableScale } from '../../components/common/PressableScale';

// ERR-NOTIF-001 Bildirim ayarları kaydedilemedi
const ERR = { SAVE: 'ERR-NOTIF-001' } as const;

const NOTIFICATION_GROUPS = [
  {
    title: 'Etkinlikler',
    items: [
      { key: 'event_reminders', label: 'Etkinlik Hatırlatıcıları', desc: 'Katıldığınız etkinliklerden önce bildirim alın', default: true },
      { key: 'new_events', label: 'Yeni Etkinlikler', desc: 'Beğendiğiniz türlerde yeni etkinlik eklenince bildirim', default: true },
      { key: 'event_changes', label: 'Etkinlik Değişiklikleri', desc: 'İptal veya saat değişikliği bildirimi', default: true },
    ],
  },
  {
    title: 'Sanatçılar',
    items: [
      { key: 'artist_new_gig', label: 'Yeni Performans', desc: 'Takip ettiğiniz sanatçı sahne aldığında bildirim', default: true },
      { key: 'artist_updates', label: 'Profil Güncellemeleri', desc: 'Takip ettiğiniz sanatçıların paylaşımları', default: false },
    ],
  },
  {
    title: 'Mesajlar',
    items: [
      { key: 'new_messages', label: 'Yeni Mesajlar', desc: 'Mesaj aldığınızda bildirim', default: true },
      { key: 'message_requests', label: 'Mesaj İstekleri', desc: 'Yeni mesaj isteği geldiğinde bildirim', default: true },
    ],
  },
  {
    title: 'Sosyal',
    items: [
      { key: 'timeline_likes', label: 'Beğeniler', desc: 'Paylaşımlarınız beğenildiğinde bildirim', default: false },
      { key: 'timeline_comments', label: 'Yorumlar', desc: 'Paylaşımlarınıza yorum yapıldığında bildirim', default: true },
      { key: 'new_followers', label: 'Yeni Takipçi', desc: 'Birisi sizi takip ettiğinde bildirim', default: true },
    ],
  },
  {
    title: 'Teklifler & İş',
    items: [
      { key: 'new_offers', label: 'Gelen Teklifler', desc: 'Yeni teklif veya davet aldığınızda bildirim', default: true },
      { key: 'offer_updates', label: 'Teklif Güncellemeleri', desc: 'Teklif kabul/red bildirimler', default: true },
    ],
  },
];

const INITIAL_SETTINGS: Record<string, boolean> = {};
NOTIFICATION_GROUPS.forEach((group) => {
  group.items.forEach((item) => { INITIAL_SETTINGS[item.key] = item.default; });
});

export default function NotificationsScreen({ navigation }: any) {
  const userType = useAuthStore((s) => s.userType);
  const userId   = useAuthStore((s) => s.userId);

  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [pushEnabled, setPushEnabled] = useState(true);

  useEffect(() => {
    if (!userId) return;
    getDoc(doc(db, 'users', userId)).then((snap) => {
      const ns = snap.data()?.notificationSettings;
      if (!ns) return;
      const { pushEnabled: pe, ...rest } = ns;
      if (pe !== undefined) setPushEnabled(pe);
      setSettings((prev) => ({ ...prev, ...rest }));
    }).catch(() => { /* use defaults */ });
  }, [userId]);

  const accentColor = useMemo(() =>
    userType === 'artist' ? Colors.artistColor :
    userType === 'venue'  ? Colors.venueColor :
    Colors.customerColor,
  [userType]);

  const toggle = useCallback((key: string) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      if (userId) {
        await setDoc(doc(db, 'users', userId), { notificationSettings: { ...settings, pushEnabled } }, { merge: true });
      }
      Alert.alert('Kaydedildi', 'Bildirim ayarlarınız güncellendi.');
    } catch {
      Alert.alert('Hata', `Ayarlar kaydedilemedi. (${ERR.SAVE})`);
    }
  }, [userId, settings, pushEnabled]);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#1A0A2E', Colors.background]} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
          <View style={[styles.headerIcon, { borderColor: accentColor + '44', backgroundColor: accentColor + '18' }]}>
            <Ionicons name="notifications-outline" size={28} color={accentColor} />
          </View>
          <Text style={styles.title}>Bildirim Ayarları</Text>
          <Text style={styles.subtitle}>Hangi bildirimleri almak istediğinizi seçin</Text>
        </LinearGradient>

        {/* Ana push toggle */}
        <View style={styles.masterToggle}>
          <View style={styles.masterLeft}>
            <View style={[styles.masterIconWrap, { backgroundColor: accentColor + '22' }]}>
              <Ionicons name="notifications-outline" size={20} color={accentColor} />
            </View>
            <View>
              <Text style={styles.masterLabel}>Tüm Bildirimler</Text>
              <Text style={styles.masterDesc}>{pushEnabled ? 'Aktif' : 'Kapalı'}</Text>
            </View>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ false: Colors.border, true: accentColor }}
            thumbColor="#fff"
          />
        </View>

        {/* Gruplar */}
        {NOTIFICATION_GROUPS.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupCard}>
              {group.items.map((item, idx) => (
                <View
                  key={item.key}
                  style={[styles.settingRow, idx < group.items.length - 1 && styles.settingRowBorder]}
                >
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, !pushEnabled && styles.disabledText]}>{item.label}</Text>
                    <Text style={[styles.settingDesc, !pushEnabled && styles.disabledText]}>{item.desc}</Text>
                  </View>
                  <Switch
                    value={settings[item.key] && pushEnabled}
                    onValueChange={() => { if (pushEnabled) toggle(item.key); }}
                    trackColor={{ false: Colors.border, true: accentColor }}
                    thumbColor="#fff"
                    disabled={!pushEnabled}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Kaydet */}
        <PressableScale style={styles.saveBtn} onPress={handleSave} scaleTo={0.97}>
          <LinearGradient colors={[accentColor, accentColor + 'BB']} style={styles.saveBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.saveBtnText}>Ayarları Kaydet</Text>
          </LinearGradient>
        </PressableScale>

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
  subtitle: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center' },
  masterToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  masterLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  masterIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  masterLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: 2 },
  masterDesc: { color: Colors.textMuted, fontSize: FontSize.xs },
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
  disabledText: { opacity: 0.4 },
  saveBtn: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  saveBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  bottomSpacer: { height: 60 },
});
