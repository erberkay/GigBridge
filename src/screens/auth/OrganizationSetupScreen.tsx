import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  doc, setDoc, addDoc, collection, serverTimestamp,
  query, where, getDocs, updateDoc, increment, getDoc,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';

const ERR = {
  EMPTY_NAME:    'ERR-ORGSETUP-001',
  CREATE_FAILED: 'ERR-ORGSETUP-002',
  JOIN_FAILED:   'ERR-ORGSETUP-003',
  NO_INVITE:     'ERR-ORGSETUP-004',
  QR_INVALID:    'ERR-ORGSETUP-005',
  ORG_NOT_FOUND: 'ERR-ORGSETUP-006',
} as const;

const ACCENT = Colors.organizerColor;

interface ScannedOrg { orgId: string; orgName: string }

export default function OrganizationSetupScreen() {
  const userId      = useAuthStore((s) => s.userId);
  const email       = useAuthStore((s) => s.email);
  const displayName = useAuthStore((s) => s.displayName);
  const setOrgInfo  = useAuthStore((s) => s.setOrgInfo);

  const [mode, setMode]               = useState<'choose' | 'create' | 'join'>('choose');
  const [joinTab, setJoinTab]         = useState<'invite' | 'qr'>('invite');

  // Create form
  const [adSoyad, setAdSoyad]         = useState(displayName ?? '');
  const [orgName, setOrgName]         = useState('');
  const [orgDesc, setOrgDesc]         = useState('');
  const [loading, setLoading]         = useState(false);

  // Invite list
  const [pendingInvites, setPendingInvites]     = useState<any[]>([]);
  const [checkingInvites, setCheckingInvites]   = useState(false);

  // QR scanner
  const [permission, requestPermission]         = useCameraPermissions();
  const [scanned, setScanned]                   = useState(false);
  const [confirmOrg, setConfirmOrg]             = useState<ScannedOrg | null>(null);
  const [joining, setJoining]                   = useState(false);

  // Bekleyen davetleri kontrol et
  useEffect(() => {
    if (mode !== 'join' || joinTab !== 'invite' || !email) return;
    setCheckingInvites(true);
    getDocs(
      query(collection(db, 'organizerInvites'),
        where('invitedEmail', '==', email),
        where('status', '==', 'pending'),
      ),
    ).then((snap) => {
      setPendingInvites(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }).catch((err) => { console.warn(ERR.JOIN_FAILED, err); }).finally(() => setCheckingInvites(false));
  }, [mode, joinTab, email]);

  const handleCreate = useCallback(async () => {
    if (!userId) return;
    const name  = adSoyad.trim();
    const oName = orgName.trim();
    if (name.length < 2) {
      Alert.alert('Hata', 'Ad soyad en az 2 karakter olmalı.');
      return;
    }
    if (oName.length < 2) {
      Alert.alert('Hata', `Organizasyon adı en az 2 karakter olmalı. (${ERR.EMPTY_NAME})`);
      return;
    }
    setLoading(true);
    try {
      // 1. Organizasyon oluştur
      const orgRef = await addDoc(collection(db, 'organizations'), {
        name: oName,
        description: orgDesc.trim(),
        ownerId: userId,
        memberCount: 1,
        createdAt: serverTimestamp(),
      });
      // 2. Üye olarak ekle (owner)
      await setDoc(doc(db, 'organizations', orgRef.id, 'members', userId), {
        userId,
        displayName: name,
        email: email ?? '',
        role: 'owner',
        status: 'active',
        joinedAt: serverTimestamp(),
      });
      // 3. Kullanıcı profilini güncelle
      await updateDoc(doc(db, 'users', userId), {
        displayName: name,
        orgId: orgRef.id,
        orgRole: 'owner',
        orgName: oName,
      });
      // 4. Store güncelle → OrganizerNavigator render edilir
      setOrgInfo(orgRef.id, 'owner', oName);
    } catch {
      Alert.alert('Hata', `Organizasyon oluşturulamadı. (${ERR.CREATE_FAILED})`);
    } finally {
      setLoading(false);
    }
  }, [userId, adSoyad, email, orgName, orgDesc, setOrgInfo]);

  const handleAcceptInvite = useCallback(async (invite: any) => {
    if (!userId || !displayName) return;
    setLoading(true);
    try {
      const memberRef = doc(db, 'organizations', invite.orgId, 'members', userId);
      const alreadyMember = (await getDoc(memberRef)).exists();
      await setDoc(memberRef, {
        userId,
        displayName,
        email: email ?? '',
        role: 'staff',
        status: 'active',
        joinedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'organizerInvites', invite.id), { status: 'accepted' });
      if (!alreadyMember) {
        await updateDoc(doc(db, 'organizations', invite.orgId), { memberCount: increment(1) });
      }
      await updateDoc(doc(db, 'users', userId), {
        orgId: invite.orgId,
        orgRole: 'staff',
        orgName: invite.orgName,
      });
      setOrgInfo(invite.orgId, 'staff', invite.orgName);
    } catch {
      Alert.alert('Hata', `Davete katılınamadı. (${ERR.JOIN_FAILED})`);
    } finally {
      setLoading(false);
    }
  }, [userId, displayName, email, setOrgInfo]);

  const handleQrScanned = useCallback(async ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    try {
      const parsed = JSON.parse(data) as { type?: string; orgId?: string; orgName?: string };
      if (parsed.type !== 'org_join' || !parsed.orgId) {
        Alert.alert('Geçersiz QR', `Bu QR kodu bir GigBridge organizasyon kodu değil. (${ERR.QR_INVALID})`);
        setScanned(false);
        return;
      }
      // Org'un gerçekten var olduğunu doğrula
      const orgSnap = await getDoc(doc(db, 'organizations', parsed.orgId));
      if (!orgSnap.exists()) {
        Alert.alert('Hata', `Organizasyon bulunamadı. (${ERR.ORG_NOT_FOUND})`);
        setScanned(false);
        return;
      }
      const orgData = orgSnap.data();
      setConfirmOrg({ orgId: parsed.orgId, orgName: orgData.name ?? parsed.orgName ?? '' });
    } catch {
      Alert.alert('Hata', `QR kodu okunamadı. (${ERR.QR_INVALID})`);
      setScanned(false);
    }
  }, [scanned]);

  const handleJoinViaQr = useCallback(async () => {
    if (!confirmOrg || !userId || !displayName) return;
    setJoining(true);
    try {
      const memberRef = doc(db, 'organizations', confirmOrg.orgId, 'members', userId);
      const alreadyMember = (await getDoc(memberRef)).exists();
      await setDoc(memberRef, {
        userId,
        displayName,
        email: email ?? '',
        role: 'staff',
        status: 'active',
        joinedAt: serverTimestamp(),
      });
      if (!alreadyMember) {
        await updateDoc(doc(db, 'organizations', confirmOrg.orgId), { memberCount: increment(1) });
      }
      await updateDoc(doc(db, 'users', userId), {
        orgId: confirmOrg.orgId,
        orgRole: 'staff',
        orgName: confirmOrg.orgName,
      });
      setOrgInfo(confirmOrg.orgId, 'staff', confirmOrg.orgName);
    } catch {
      Alert.alert('Hata', `Organizasyona katılınamadı. (${ERR.JOIN_FAILED})`);
      setConfirmOrg(null);
      setScanned(false);
    } finally {
      setJoining(false);
    }
  }, [confirmOrg, userId, displayName, email, setOrgInfo]);

  // ── SEÇIM EKRANI ────────────────────────────────────────────
  if (mode === 'choose') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1A0810', Colors.background]} style={styles.heroBg}>
          <View style={styles.logoWrap}>
            <LinearGradient colors={[ACCENT, '#BE123C']} style={styles.logoCircle}>
              <Ionicons name="calendar" size={36} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.heroTitle}>Organizasyonunuzu Kurun</Text>
          <Text style={styles.heroSub}>Yeni bir organizasyon oluşturun ya da mevcut birine katılın</Text>
        </LinearGradient>

        <View style={styles.cards}>
          <TouchableOpacity style={styles.choiceCard} onPress={() => setMode('create')} activeOpacity={0.85}>
            <LinearGradient colors={[ACCENT, '#BE123C']} style={styles.choiceGrad}>
              <Ionicons name="add-circle-outline" size={32} color="#fff" />
              <Text style={styles.choiceTitle}>Yeni Organizasyon Kur</Text>
              <Text style={styles.choiceDesc}>Kendi şirketini/ekibini oluştur ve owner ol</Text>
              <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.8)" style={styles.choiceArrow} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.choiceCard} onPress={() => setMode('join')} activeOpacity={0.85}>
            <View style={styles.choiceCardOutline}>
              <Ionicons name="qr-code-outline" size={32} color={ACCENT} />
              <Text style={[styles.choiceTitle, styles.choiceTitleDark]}>Organizasyona Katıl</Text>
              <Text style={[styles.choiceDesc, styles.choiceDescDark]}>QR kod veya davet ile katıl</Text>
              <Ionicons name="arrow-forward" size={18} color={ACCENT} style={styles.choiceArrow} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── OLUŞTUR EKRANI ───────────────────────────────────────────
  if (mode === 'create') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => setMode('choose')}>
          <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.formTitle}>Organizasyon Oluştur</Text>
        <Text style={styles.formSub}>Sen bu organizasyonun owner'ı olacaksın</Text>

        <View style={styles.ownerBadge}>
          <LinearGradient colors={[ACCENT, '#BE123C']} style={styles.ownerBadgeGrad}>
            <Ionicons name="shield-checkmark" size={14} color="#fff" />
            <Text style={styles.ownerBadgeText}>Owner</Text>
          </LinearGradient>
          <Text style={styles.ownerBadgeName}>{adSoyad || displayName}</Text>
        </View>

        <Text style={styles.inputLabel}>Ad Soyad *</Text>
        <TextInput
          style={styles.input}
          placeholder="Adınız ve soyadınız"
          placeholderTextColor={Colors.textMuted}
          value={adSoyad}
          onChangeText={setAdSoyad}
          maxLength={60}
        />

        <Text style={styles.inputLabel}>Şirket / Organizasyon Adı *</Text>
        <TextInput
          style={styles.input}
          placeholder="örn: GigBridge Events"
          placeholderTextColor={Colors.textMuted}
          value={orgName}
          onChangeText={setOrgName}
          maxLength={50}
        />

        <Text style={styles.inputLabel}>Açıklama (isteğe bağlı)</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          placeholder="Organizasyonunuz hakkında kısa bir bilgi..."
          placeholderTextColor={Colors.textMuted}
          value={orgDesc}
          onChangeText={setOrgDesc}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={200}
        />

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          <LinearGradient colors={[ACCENT, '#BE123C']} style={styles.primaryBtnGrad}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Organizasyonu Kur</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── KATIL EKRANI ─────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtnPad} onPress={() => setMode('choose')}>
        <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
      </TouchableOpacity>
      <Text style={styles.formTitlePad}>Organizasyona Katıl</Text>

      {/* Tab seçici */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, joinTab === 'invite' && styles.tabActive]}
          onPress={() => setJoinTab('invite')}
        >
          <Ionicons name="mail-outline" size={16} color={joinTab === 'invite' ? '#fff' : Colors.textSecondary} />
          <Text style={[styles.tabText, joinTab === 'invite' && styles.tabTextActive]}>Davetler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, joinTab === 'qr' && styles.tabActive]}
          onPress={() => { setJoinTab('qr'); setScanned(false); }}
        >
          <Ionicons name="qr-code-outline" size={16} color={joinTab === 'qr' ? '#fff' : Colors.textSecondary} />
          <Text style={[styles.tabText, joinTab === 'qr' && styles.tabTextActive]}>QR Kod</Text>
        </TouchableOpacity>
      </View>

      {/* Davetler sekmesi */}
      {joinTab === 'invite' && (
        checkingInvites ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={ACCENT} />
            <Text style={styles.loadingText}>Davetler kontrol ediliyor...</Text>
          </View>
        ) : pendingInvites.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="mail-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Bekleyen Davet Yok</Text>
            <Text style={styles.emptyDesc}>
              Bir organizasyon owner'ı e-posta adresinize davet gönderdiğinde burada görünecek.
            </Text>
            <Text style={styles.emptyEmail}>{email}</Text>
          </View>
        ) : (
          <ScrollView style={styles.inviteList} contentContainerStyle={{ gap: 12, padding: Spacing.lg }}>
            {pendingInvites.map((inv) => (
              <View key={inv.id} style={styles.inviteCard}>
                <View style={styles.inviteCardLeft}>
                  <LinearGradient colors={[ACCENT, '#BE123C']} style={styles.inviteOrgIcon}>
                    <Ionicons name="business" size={18} color="#fff" />
                  </LinearGradient>
                  <View>
                    <Text style={styles.inviteOrgName}>{inv.orgName}</Text>
                    <Text style={styles.inviteBy}>Davet gönderen: {inv.invitedByName ?? '—'}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.acceptBtn, loading && styles.btnDisabled]}
                  onPress={() => handleAcceptInvite(inv)}
                  disabled={loading}
                >
                  <Text style={styles.acceptBtnText}>Katıl</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )
      )}

      {/* QR Kod sekmesi */}
      {joinTab === 'qr' && (
        <View style={styles.qrScanArea}>
          {!permission?.granted ? (
            <View style={styles.permBox}>
              <Ionicons name="camera-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.permTitle}>Kamera İzni Gerekli</Text>
              <Text style={styles.permDesc}>QR kod taramak için kamera iznine ihtiyaç var.</Text>
              <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                <LinearGradient colors={[ACCENT, '#BE123C']} style={styles.permBtnGrad}>
                  <Text style={styles.permBtnText}>İzin Ver</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleQrScanned}
              />
              <View style={styles.qrOverlay}>
                <View style={styles.qrFrame} />
                <Text style={styles.qrHint}>QR kodu kare içine alın</Text>
              </View>
              {scanned && !confirmOrg && (
                <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
                  <Text style={styles.rescanBtnText}>Tekrar Tara</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}

      {/* QR ile bulunan org onay modalı */}
      <Modal visible={!!confirmOrg} transparent animationType="slide">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <LinearGradient colors={[ACCENT, '#BE123C']} style={styles.confirmIcon}>
              <Ionicons name="business" size={28} color="#fff" />
            </LinearGradient>
            <Text style={styles.confirmTitle}>{confirmOrg?.orgName}</Text>
            <Text style={styles.confirmDesc}>Bu organizasyona staff olarak katılmak istiyor musunuz?</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => { setConfirmOrg(null); setScanned(false); }}
              >
                <Text style={styles.confirmCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmJoinBtn, joining && styles.btnDisabled]}
                onPress={handleJoinViaQr}
                disabled={joining}
              >
                <LinearGradient colors={[ACCENT, '#BE123C']} style={styles.confirmJoinGrad}>
                  {joining
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.confirmJoinText}>Katıl</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  heroBg: { paddingTop: 80, paddingBottom: 40, alignItems: 'center', paddingHorizontal: Spacing.lg },
  logoWrap: { marginBottom: 20 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  heroSub: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  cards: { padding: Spacing.lg, gap: 16, marginTop: -8 },
  choiceCard: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  choiceGrad: { padding: Spacing.lg, gap: 8, minHeight: 130, justifyContent: 'center' },
  choiceCardOutline: {
    padding: Spacing.lg, gap: 8, minHeight: 130, justifyContent: 'center',
    borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.organizerColor + '60',
    backgroundColor: Colors.surface,
  },
  choiceTitle: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800' },
  choiceTitleDark: { color: Colors.text },
  choiceDesc: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.sm },
  choiceDescDark: { color: Colors.textSecondary },
  choiceArrow: { position: 'absolute', right: Spacing.lg, top: Spacing.lg + 8 },
  formContent: { padding: Spacing.lg, paddingTop: 60, flexGrow: 1 },
  backBtn: { marginBottom: Spacing.lg },
  backBtnPad: { padding: Spacing.lg },
  formTitle: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: 6 },
  formTitlePad: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: 6, paddingHorizontal: Spacing.lg },
  formSub: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: Spacing.xl },
  ownerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: Colors.organizerColor + '40',
  },
  ownerBadgeGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.sm,
  },
  ownerBadgeText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  ownerBadgeName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  inputLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
    color: Colors.text, fontSize: FontSize.md, marginBottom: Spacing.lg,
  },
  inputMulti: { minHeight: 90, textAlignVertical: 'top' },
  primaryBtn: { marginTop: 8, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  primaryBtnGrad: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  // Tabs
  tabRow: { flexDirection: 'row', gap: 8, marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tabActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  tabText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  // Loading / empty
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textMuted, fontSize: FontSize.sm },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: 12 },
  emptyTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  emptyDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  emptyEmail: {
    color: Colors.organizerColor, fontSize: FontSize.sm, fontWeight: '600',
    backgroundColor: Colors.surface, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: BorderRadius.sm, marginTop: 4,
  },
  inviteList: { flex: 1 },
  inviteCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  inviteCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  inviteOrgIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  inviteOrgName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  inviteBy: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  acceptBtn: {
    backgroundColor: Colors.organizerColor, borderRadius: BorderRadius.sm,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  acceptBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
  // QR Scanner
  qrScanArea: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  qrOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'none',
  },
  qrFrame: {
    width: 220, height: 220,
    borderWidth: 2.5, borderColor: ACCENT,
    borderRadius: 16,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 12,
  },
  qrHint: {
    color: '#fff', fontSize: FontSize.sm, fontWeight: '600',
    marginTop: 20, textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  rescanBtn: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    backgroundColor: ACCENT, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: BorderRadius.full,
  },
  rescanBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  // Camera permission
  permBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: 16 },
  permTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  permDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center' },
  permBtn: { borderRadius: BorderRadius.md, overflow: 'hidden', marginTop: 8 },
  permBtnGrad: { paddingHorizontal: 32, paddingVertical: 14 },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  // Confirm modal
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  confirmCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, width: '100%', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: ACCENT + '30',
  },
  confirmIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  confirmTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', textAlign: 'center' },
  confirmDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  confirmBtns: { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' },
  confirmCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  confirmCancelText: { color: Colors.textSecondary, fontWeight: '600', fontSize: FontSize.md },
  confirmJoinBtn: { flex: 2, borderRadius: BorderRadius.md, overflow: 'hidden' },
  confirmJoinGrad: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  confirmJoinText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
});
