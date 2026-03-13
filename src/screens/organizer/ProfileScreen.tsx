import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const ACCENT = Colors.organizerColor;

const ERR = { LOGOUT_FAILED: 'ERR-ORG-PROF-001' } as const;

interface MenuItem {
  icon: IoniconName;
  label: string;
  screen?: string;
  color?: string;
  isDanger?: boolean;
  isQr?: boolean;
}

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function OrgProfileScreen({ navigation }: any) {
  const displayName = useAuthStore((s) => s.displayName);
  const email       = useAuthStore((s) => s.email);
  const orgName     = useAuthStore((s) => s.orgName);
  const orgRole     = useAuthStore((s) => s.orgRole);
  const orgId       = useAuthStore((s) => s.orgId);
  const clearUser   = useAuthStore((s) => s.clearUser);
  const [loggingOut, setLoggingOut] = useState(false);
  const [qrVisible, setQrVisible]   = useState(false);

  const isOwner = orgRole === 'owner';

  const MENU: MenuItem[] = useMemo(() => [
    ...(isOwner ? [{ icon: 'qr-code-outline' as IoniconName, label: 'Üye QR Kodu', color: ACCENT, isQr: true }] : []),
    { icon: 'notifications-outline',  label: 'Bildirim Ayarları',  screen: 'Notifications' },
    { icon: 'lock-closed-outline',    label: 'Gizlilik Ayarları',  screen: 'PrivacySettings' },
    { icon: 'diamond-outline',        label: 'Pro Hesap',          screen: 'ProAccount', color: Colors.accent },
    { icon: 'log-out-outline',        label: 'Çıkış Yap',          isDanger: true },
  ], [isOwner]);

  const qrValue = useMemo(() =>
    JSON.stringify({ type: 'org_join', orgId: orgId ?? '', orgName: orgName ?? '' }),
  [orgId, orgName]);

  const handleLogout = useCallback(() => {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap', style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await signOut(auth);
            clearUser();
          } catch {
            Alert.alert('Hata', `Çıkış yapılamadı. (${ERR.LOGOUT_FAILED})`);
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  }, [clearUser]);

  const handleMenuItem = useCallback((item: MenuItem) => {
    if (item.isDanger) { handleLogout(); return; }
    if (item.isQr) { setQrVisible(true); return; }
    if (item.screen) navigation.navigate(item.screen);
  }, [navigation, handleLogout]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#1A0810', Colors.background]} style={styles.header}>
        <LinearGradient colors={[ACCENT, '#BE123C']} style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(displayName ?? 'O')}</Text>
        </LinearGradient>
        <Text style={styles.name}>{displayName ?? 'Organizatör'}</Text>
        <Text style={styles.emailText}>{email}</Text>

        <View style={styles.orgBadge}>
          <LinearGradient colors={[ACCENT + '30', ACCENT + '10']} style={styles.orgBadgeGrad}>
            <Ionicons name="business" size={14} color={ACCENT} />
            <Text style={styles.orgBadgeName}>{orgName ?? 'Organizasyonunuz'}</Text>
            <View style={styles.rolePill}>
              <Ionicons
                name={orgRole === 'owner' ? 'shield-checkmark' : 'people'}
                size={11} color={orgRole === 'owner' ? ACCENT : '#3B82F6'}
              />
              <Text style={[styles.roleText, { color: orgRole === 'owner' ? ACCENT : '#3B82F6' }]}>
                {orgRole === 'owner' ? 'Owner' : 'Staff'}
              </Text>
            </View>
          </LinearGradient>
        </View>
      </LinearGradient>

      {/* Menü */}
      <View style={styles.menuSection}>
        {MENU.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuRow}
            onPress={() => handleMenuItem(item)}
            disabled={loggingOut && item.isDanger}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, item.isDanger && styles.menuIconDanger, item.isQr && styles.menuIconQr]}>
              <Ionicons
                name={item.icon}
                size={18}
                color={item.isDanger ? Colors.error : (item.color ?? Colors.textSecondary)}
              />
            </View>
            <Text style={[styles.menuLabel, item.isDanger && styles.menuLabelDanger]}>
              {item.label}
            </Text>
            {!item.isDanger && (
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bottomSpacer} />

      {/* QR Kod Modalı */}
      <Modal visible={qrVisible} transparent animationType="fade">
        <View style={styles.qrOverlay}>
          <View style={styles.qrCard}>
            <View style={styles.qrCardHeader}>
              <Text style={styles.qrCardTitle}>Üye QR Kodu</Text>
              <TouchableOpacity onPress={() => setQrVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.qrCodeWrap}>
              <QRCode
                value={qrValue}
                size={220}
                color="#fff"
                backgroundColor={Colors.surface}
                logo={undefined}
              />
            </View>

            <Text style={styles.qrOrgName}>{orgName}</Text>
            <Text style={styles.qrDesc}>
              Çalışanlarınız bu QR kodu tarayarak organizasyonunuza staff olarak katılabilir.
            </Text>

            <View style={styles.qrBadge}>
              <Ionicons name="shield-checkmark" size={14} color={ACCENT} />
              <Text style={styles.qrBadgeText}>Yalnızca owner görür</Text>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingBottom: Spacing.xl, alignItems: 'center', paddingHorizontal: Spacing.lg },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '900' },
  name: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', marginBottom: 4 },
  emailText: { color: Colors.textMuted, fontSize: FontSize.sm, marginBottom: Spacing.md },
  orgBadge: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: ACCENT + '30', width: '100%' },
  orgBadgeGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.md, justifyContent: 'center' },
  orgBadgeName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600', flex: 1, textAlign: 'center' },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  roleText: { fontSize: FontSize.xs, fontWeight: '700' },
  menuSection: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: 4 },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 16,
    marginBottom: 6, borderWidth: 1, borderColor: Colors.border,
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  menuIconDanger: { backgroundColor: Colors.error + '15' },
  menuIconQr: { backgroundColor: ACCENT + '20' },
  menuLabel: { flex: 1, color: Colors.text, fontSize: FontSize.md, fontWeight: '500' },
  menuLabelDanger: { color: Colors.error },
  bottomSpacer: { height: 110 },
  // QR Modal
  qrOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center', padding: Spacing.xl,
  },
  qrCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, width: '100%', alignItems: 'center',
    borderWidth: 1, borderColor: ACCENT + '30',
  },
  qrCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', marginBottom: Spacing.lg,
  },
  qrCardTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '800' },
  qrCodeWrap: {
    backgroundColor: Colors.surface, padding: 16, borderRadius: 16,
    borderWidth: 2, borderColor: ACCENT + '40', marginBottom: Spacing.lg,
  },
  qrOrgName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: 6 },
  qrDesc: {
    color: Colors.textSecondary, fontSize: FontSize.sm,
    textAlign: 'center', lineHeight: 20, marginBottom: Spacing.md,
  },
  qrBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ACCENT + '15', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  qrBadgeText: { color: ACCENT, fontSize: FontSize.xs, fontWeight: '700' },
});
