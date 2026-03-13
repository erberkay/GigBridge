import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { createUserWithEmailAndPassword, updateProfile, deleteUser } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import Input from '../../components/common/Input';
import GradientButton from '../../components/common/GradientButton';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { UserType } from '../../types';

// ─── Hata Kodları ────────────────────────────────────────────────────────────
const ERR = {
  EMPTY_FIELDS:          'ERR-REG-001',
  INVALID_EMAIL_FORMAT:  'ERR-REG-002',
  PASSWORDS_MISMATCH:    'ERR-REG-003',
  PASSWORD_TOO_SHORT:    'ERR-REG-004',
  NO_USER_TYPE:          'ERR-REG-005',
  EMAIL_IN_USE:          'ERR-REG-006',
  INVALID_EMAIL_SERVER:  'ERR-REG-007',
  WEAK_PASSWORD:         'ERR-REG-008',
  NETWORK_ERROR:         'ERR-REG-009',
  NAME_TOO_SHORT:        'ERR-REG-010',
  QR_INVALID:            'ERR-REG-011',
} as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORG_ACCENT  = Colors.organizerColor;

function mapRegisterError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':    return ERR.EMAIL_IN_USE;
    case 'auth/invalid-email':           return ERR.INVALID_EMAIL_SERVER;
    case 'auth/weak-password':           return ERR.WEAK_PASSWORD;
    case 'auth/network-request-failed':  return ERR.NETWORK_ERROR;
    default:                             return 'ERR-REG-000';
  }
}

// ─── Kullanıcı Tipi Tanımları ─────────────────────────────────────────────────
const USER_TYPES = [
  {
    type:        'customer' as UserType,
    label:       'Müşteri',
    description: 'Etkinlikleri keşfet, sanatçıları takip et',
    iconName:    'headset-outline' as const,
    color:       Colors.customerColor,
    gradient:    [Colors.customerColor, '#0891B2'] as [string, string],
  },
  {
    type:        'artist' as UserType,
    label:       'Sanatçı',
    description: 'Profilini oluştur, mekanlardan teklif al',
    iconName:    'mic-outline' as const,
    color:       Colors.artistColor,
    gradient:    [Colors.artistColor, Colors.primaryDark] as [string, string],
  },
  {
    type:        'venue' as UserType,
    label:       'Mekan',
    description: 'Sanatçıları bul, etkinlik planla',
    iconName:    'business-outline' as const,
    color:       Colors.venueColor,
    gradient:    [Colors.venueColor, '#D97706'] as [string, string],
  },
  {
    type:        'organizer' as UserType,
    label:       'Organizatör',
    description: 'Ekip kur, etkinlik yönet, mekanlarla çalış',
    iconName:    'calendar-outline' as const,
    color:       ORG_ACCENT,
    gradient:    [ORG_ACCENT, '#BE123C'] as [string, string],
  },
];

interface PendingOrg { orgId: string; orgName: string }

// ─────────────────────────────────────────────────────────────────────────────

export default function RegisterScreen({ navigation }: any) {
  const [step, setStep]                       = useState<1 | 2>(1);
  const [selectedType, setSelectedType]       = useState<UserType | null>(null);
  const [displayName, setDisplayName]         = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]                 = useState(false);

  // Organizatör sub-ekranı
  const [orgSubScreen, setOrgSubScreen]       = useState<null | 'choose' | 'qr'>(null);
  const [orgMode, setOrgMode]                 = useState<null | 'create' | 'join_qr'>(null);
  const [pendingOrg, setPendingOrg]           = useState<PendingOrg | null>(null);
  const [qrScanned, setQrScanned]             = useState(false);
  const [permission, requestPermission]       = useCameraPermissions();

  const setUser    = useAuthStore((s) => s.setUser);
  const setOrgInfo = useAuthStore((s) => s.setOrgInfo);

  const handleRegister = useCallback(async () => {
    if (loading) return;

    const trimmedName  = displayName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      Alert.alert('Eksik Bilgi', `Lütfen tüm alanları doldurun.\n(${ERR.EMPTY_FIELDS})`);
      return;
    }
    if (trimmedName.length < 2) {
      Alert.alert('Geçersiz İsim', `Ad en az 2 karakter olmalıdır.\n(${ERR.NAME_TOO_SHORT})`);
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      Alert.alert('Geçersiz E-posta', `Lütfen geçerli bir e-posta adresi girin.\n(${ERR.INVALID_EMAIL_FORMAT})`);
      return;
    }
    if (password.length < 6) {
      Alert.alert('Şifre Çok Kısa', `Şifre en az 6 karakter olmalıdır.\n(${ERR.PASSWORD_TOO_SHORT})`);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Şifreler Uyuşmuyor', `Girdiğiniz şifreler eşleşmiyor.\n(${ERR.PASSWORDS_MISMATCH})`);
      return;
    }
    if (!selectedType) {
      Alert.alert('Hesap Tipi Seçin', `Lütfen hesap tipini seçin.\n(${ERR.NO_USER_TYPE})`);
      return;
    }

    setLoading(true);
    let createdUser: import('firebase/auth').User | null = null;
    try {
      const { user } = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      createdUser = user;
      await updateProfile(user, { displayName: trimmedName });
      await setDoc(doc(db, 'users', user.uid), {
        displayName: trimmedName,
        email:       user.email,
        userType:    selectedType,
        photoURL:    null,
        isPro:       false,
        createdAt:   serverTimestamp(),
      });

      // QR ile org'a katılım
      if (orgMode === 'join_qr' && pendingOrg) {
        await setDoc(doc(db, 'organizations', pendingOrg.orgId, 'members', user.uid), {
          userId:      user.uid,
          displayName: trimmedName,
          email:       user.email ?? '',
          role:        'staff',
          status:      'active',
          joinedAt:    serverTimestamp(),
        });
        await updateDoc(doc(db, 'organizations', pendingOrg.orgId), { memberCount: increment(1) });
        await updateDoc(doc(db, 'users', user.uid), {
          orgId:   pendingOrg.orgId,
          orgRole: 'staff',
          orgName: pendingOrg.orgName,
        });
        setUser({
          userId:      user.uid,
          email:       user.email ?? '',
          displayName: trimmedName,
          userType:    selectedType,
          orgId:       pendingOrg.orgId,
          orgRole:     'staff',
          orgName:     pendingOrg.orgName,
        });
        setOrgInfo(pendingOrg.orgId, 'staff', pendingOrg.orgName);
      } else {
        setUser({
          userId:      user.uid,
          email:       user.email ?? '',
          displayName: trimmedName,
          photoURL:    null,
          userType:    selectedType,
        });
      }
    } catch (err: any) {
      if (createdUser) {
        await deleteUser(createdUser).catch((e) => { console.warn('ERR-REG-CLEANUP', e); });
      }
      const code = mapRegisterError(err?.code ?? '');
      let message = `Kayıt yapılamadı. Lütfen tekrar deneyin.\n(${code})`;
      if (code === ERR.EMAIL_IN_USE)          message = `Bu e-posta adresi zaten kullanımda.\n(${code})`;
      else if (code === ERR.INVALID_EMAIL_SERVER) message = `Geçersiz e-posta adresi.\n(${code})`;
      else if (code === ERR.WEAK_PASSWORD)    message = `Şifre çok zayıf. Daha güçlü bir şifre seçin.\n(${code})`;
      else if (code === ERR.NETWORK_ERROR)    message = `İnternet bağlantınızı kontrol edin.\n(${code})`;
      Alert.alert('Kayıt Hatası', message);
    } finally {
      setLoading(false);
    }
  }, [loading, displayName, email, password, confirmPassword, selectedType, orgMode, pendingOrg, setUser, setOrgInfo]);

  const handleBack = useCallback(() => {
    if (loading) return;
    if (step === 2) {
      setStep(1);
      if (selectedType === 'organizer') setOrgSubScreen('choose');
    } else if (orgSubScreen === 'qr') {
      setOrgSubScreen('choose');
      setQrScanned(false);
    } else if (orgSubScreen === 'choose') {
      setOrgSubScreen(null);
    } else {
      navigation.goBack();
    }
  }, [loading, step, orgSubScreen, selectedType, navigation]);

  const handleQrScanned = useCallback(({ data }: { type: string; data: string }) => {
    if (qrScanned) return;
    setQrScanned(true);
    try {
      const parsed = JSON.parse(data) as { type?: string; orgId?: string; orgName?: string };
      if (parsed.type !== 'org_join' || !parsed.orgId) {
        Alert.alert('Geçersiz QR', `Bu bir GigBridge organizasyon kodu değil.\n(${ERR.QR_INVALID})`);
        setQrScanned(false);
        return;
      }
      setPendingOrg({ orgId: parsed.orgId, orgName: parsed.orgName ?? '' });
      setOrgMode('join_qr');
      setSelectedType('organizer');
      setOrgSubScreen(null);
      setStep(2);
    } catch {
      Alert.alert('Hata', `QR kodu okunamadı.\n(${ERR.QR_INVALID})`);
      setQrScanned(false);
    }
  }, [qrScanned]);

  const goToOrgCreate = useCallback(() => {
    setOrgMode('create');
    setSelectedType('organizer');
    setOrgSubScreen(null);
    setStep(2);
  }, []);

  // ── QR TARAMA EKRANI ─────────────────────────────────────────────────────
  if (orgSubScreen === 'qr') {
    return (
      <View style={styles.container}>
        <View style={styles.qrHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.qrHeaderTitle}>QR Kod Tara</Text>
          <Text style={styles.qrHeaderSub}>Owner'ın gösterdiği QR kodu tarayın</Text>
        </View>

        {!permission?.granted ? (
          <View style={styles.permBox}>
            <Ionicons name="camera-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.permTitle}>Kamera İzni Gerekli</Text>
            <Text style={styles.permDesc}>QR kod taramak için kamera iznine ihtiyaç var.</Text>
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
              <LinearGradient colors={[ORG_ACCENT, '#BE123C']} style={styles.permBtnGrad}>
                <Text style={styles.permBtnText}>İzin Ver</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraWrap}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={qrScanned ? undefined : handleQrScanned}
            />
            <View style={styles.qrOverlay} pointerEvents="none">
              <View style={styles.qrFrame} />
              <Text style={styles.qrHint}>QR kodu kare içine alın</Text>
            </View>
            {qrScanned && (
              <TouchableOpacity style={styles.rescanBtn} onPress={() => setQrScanned(false)}>
                <Text style={styles.rescanText}>Tekrar Tara</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Başlık */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} disabled={loading}>
            <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>
            {step === 1 && !orgSubScreen ? 'Hesap Tipini Seç' :
             orgSubScreen === 'choose'   ? 'Organizatör Girişi' :
             'Bilgilerini Gir'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1 && !orgSubScreen ? 'Platforma nasıl katılmak istiyorsun?' :
             orgSubScreen === 'choose'   ? 'Nasıl devam etmek istiyorsun?' :
             'Hesap bilgilerini doldur'}
          </Text>

          <View style={styles.steps}>
            {[1, 2].map((s) => (
              <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]} />
            ))}
          </View>
        </View>

        {/* ── ADIM 1: Tip seçimi ────────────────────────────────────── */}
        {step === 1 && !orgSubScreen && (
          <View style={styles.typeCards}>
            {USER_TYPES.map((item) => (
              <TouchableOpacity
                key={item.type}
                onPress={() => {
                  if (item.type === 'organizer') {
                    setOrgSubScreen('choose');
                  } else {
                    setSelectedType(item.type);
                    setStep(2);
                  }
                }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={item.gradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.typeCard}
                >
                  <Ionicons name={item.iconName} size={28} color="#fff" style={styles.typeIcon} />
                  <Text style={styles.typeLabel}>{item.label}</Text>
                  <Text style={styles.typeDesc}>{item.description}</Text>
                  <View style={styles.selectArrow}>
                    <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── ADIM 1.5: Organizatör alt seçimi ────────────────────── */}
        {step === 1 && orgSubScreen === 'choose' && (
          <View style={styles.orgChoiceWrap}>
            {/* Kur */}
            <TouchableOpacity style={styles.orgChoiceCard} onPress={goToOrgCreate} activeOpacity={0.85}>
              <LinearGradient colors={[ORG_ACCENT, '#BE123C']} style={styles.orgChoiceGrad}>
                <Ionicons name="add-circle-outline" size={36} color="#fff" />
                <Text style={styles.orgChoiceTitle}>Organizasyon Kur</Text>
                <Text style={styles.orgChoiceDesc}>Kendi şirketini/ekibini kur ve owner ol</Text>
                <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" style={styles.orgChoiceArrow} />
              </LinearGradient>
            </TouchableOpacity>

            {/* QR ile Katıl */}
            <TouchableOpacity
              style={styles.orgChoiceCardOutline}
              onPress={() => { setOrgSubScreen('qr'); setQrScanned(false); }}
              activeOpacity={0.85}
            >
              <Ionicons name="qr-code-outline" size={36} color={ORG_ACCENT} />
              <Text style={[styles.orgChoiceTitle, styles.orgChoiceTitleDark]}>QR ile Katıl</Text>
              <Text style={[styles.orgChoiceDesc, styles.orgChoiceDescDark]}>
                Owner'ın QR kodunu tarayarak organizasyona staff olarak katıl
              </Text>
              <Ionicons name="arrow-forward" size={18} color={ORG_ACCENT} style={styles.orgChoiceArrow} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── ADIM 2: Form ─────────────────────────────────────────── */}
        {step === 2 && (
          <View style={styles.form}>
            {/* Seçilen tip / join badge */}
            {orgMode === 'join_qr' && pendingOrg ? (
              <View style={styles.joinOrgBadge}>
                <LinearGradient colors={[ORG_ACCENT, '#BE123C']} style={styles.joinOrgIcon}>
                  <Ionicons name="business" size={16} color="#fff" />
                </LinearGradient>
                <View style={styles.joinOrgInfo}>
                  <Text style={styles.joinOrgLabel}>Katılınacak Organizasyon</Text>
                  <Text style={styles.joinOrgName}>{pendingOrg.orgName}</Text>
                </View>
                <View style={styles.staffPill}>
                  <Text style={styles.staffPillText}>Staff</Text>
                </View>
              </View>
            ) : selectedType ? (() => {
              const selected = USER_TYPES.find((t) => t.type === selectedType);
              if (!selected) return null;
              return (
                <View style={styles.selectedBadge}>
                  <Ionicons name={selected.iconName} size={16} color={selected.color} style={styles.badgeIcon} />
                  <Text style={[styles.badgeText, { color: selected.color }]}>{selected.label} Hesabı</Text>
                </View>
              );
            })() : null}

            <Input
              label="Ad Soyad"
              placeholder="Adınızı girin"
              value={displayName}
              onChangeText={setDisplayName}
              autoComplete="name"
              editable={!loading}
            />
            <Input
              label="E-posta"
              placeholder="ornek@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />
            <Input
              label="Şifre"
              placeholder="En az 6 karakter"
              value={password}
              onChangeText={setPassword}
              secureToggle
              autoComplete="new-password"
              editable={!loading}
            />
            <Input
              label="Şifre Tekrar"
              placeholder="Şifrenizi tekrar girin"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureToggle
              autoComplete="new-password"
              editable={!loading}
            />

            <GradientButton
              title={orgMode === 'join_qr' ? 'Kayıt Ol ve Katıl' : 'Kayıt Ol'}
              onPress={handleRegister}
              loading={loading}
              variant={selectedType ?? 'primary'}
              style={styles.submitBtn}
            />
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Zaten hesabınız var mı? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
            <Text style={styles.footerLink}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  kav:        { flex: 1 },
  content:    { padding: Spacing.lg, paddingTop: 60, flexGrow: 1 },
  header:     { marginBottom: Spacing.xl },
  backBtn:    { marginBottom: Spacing.lg },
  title:      { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  subtitle:   { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: 16 },
  steps:      { flexDirection: 'row', gap: 8 },
  stepDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  stepDotActive: { backgroundColor: Colors.primary, width: 24 },
  // Type cards
  typeCards:  { gap: 16 },
  typeCard: { padding: Spacing.lg, borderRadius: BorderRadius.lg, position: 'relative' },
  typeIcon:   { marginBottom: 12 },
  typeLabel:  { fontSize: FontSize.xl, fontWeight: '800', color: '#fff', marginBottom: 6 },
  typeDesc:   { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)' },
  selectArrow: {
    position: 'absolute', right: Spacing.lg, top: '50%',
    transform: [{ translateY: -12 }],
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  // Org choice
  orgChoiceWrap: { gap: 16 },
  orgChoiceCard: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  orgChoiceGrad: { padding: Spacing.xl, gap: 8, minHeight: 140, justifyContent: 'center' },
  orgChoiceCardOutline: {
    padding: Spacing.xl, gap: 8, minHeight: 140, justifyContent: 'center',
    borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: ORG_ACCENT + '60',
    backgroundColor: Colors.surface, position: 'relative',
  },
  orgChoiceTitle:     { color: '#fff', fontSize: FontSize.lg, fontWeight: '800' },
  orgChoiceTitleDark: { color: Colors.text },
  orgChoiceDesc:      { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.sm, lineHeight: 20 },
  orgChoiceDescDark:  { color: Colors.textSecondary },
  orgChoiceArrow:     { position: 'absolute', right: Spacing.lg, top: Spacing.lg + 8 },
  // Form
  form: { flex: 1 },
  joinOrgBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: ORG_ACCENT + '40',
  },
  joinOrgIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  joinOrgInfo: { flex: 1 },
  joinOrgLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  joinOrgName:  { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', marginTop: 2 },
  staffPill: {
    backgroundColor: '#3B82F620', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  staffPillText: { color: '#3B82F6', fontSize: FontSize.xs, fontWeight: '700' },
  selectedBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.md,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: Spacing.lg,
    gap: 8, borderWidth: 1, borderColor: Colors.border,
  },
  badgeIcon:  { marginRight: 4 },
  badgeText:  { fontSize: FontSize.sm, fontWeight: '600' },
  submitBtn:  { marginTop: 8 },
  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl, paddingBottom: Spacing.lg },
  footerText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  footerLink: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '700' },
  // QR scan screen
  qrHeader: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  qrHeaderTitle: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: 4 },
  qrHeaderSub:   { color: Colors.textSecondary, fontSize: FontSize.sm },
  cameraWrap: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  qrOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  qrFrame: {
    width: 220, height: 220, borderWidth: 2.5, borderColor: ORG_ACCENT,
    borderRadius: 16, shadowColor: ORG_ACCENT,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 12,
  },
  qrHint: {
    color: '#fff', fontSize: FontSize.sm, fontWeight: '600', marginTop: 20,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  rescanBtn: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    backgroundColor: ORG_ACCENT, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: BorderRadius.full,
  },
  rescanText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  // Permission
  permBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.xl, gap: 16,
  },
  permTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  permDesc:  { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center' },
  permBtn:   { borderRadius: BorderRadius.md, overflow: 'hidden', marginTop: 8 },
  permBtnGrad: { paddingHorizontal: 32, paddingVertical: 14 },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
});
