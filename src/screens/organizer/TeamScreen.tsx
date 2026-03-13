import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, Modal, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, onSnapshot, addDoc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';

const ACCENT = Colors.organizerColor;
const ROLE_COLORS = { owner: ACCENT, staff: '#3B82F6' } as const;

const ERR = {
  INVITE_FAILED:  'ERR-TEAM-001',
  LOAD_FAILED:    'ERR-TEAM-002',
  EMPTY_EMAIL:    'ERR-TEAM-003',
} as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

const GRAD_PAIRS: [string, string][] = [
  ['#A855F7', '#7C3AED'], ['#F59E0B', '#B45309'], ['#10B981', '#059669'],
  ['#3B82F6', '#1D4ED8'], ['#F43F5E', '#BE123C'], ['#06B6D4', '#0891B2'],
];

export default function OrgTeamScreen({ navigation }: any) {
  const userId      = useAuthStore((s) => s.userId);
  const displayName = useAuthStore((s) => s.displayName);
  const email       = useAuthStore((s) => s.email);
  const orgId       = useAuthStore((s) => s.orgId);
  const orgName     = useAuthStore((s) => s.orgName);
  const orgRole     = useAuthStore((s) => s.orgRole);

  const [members, setMembers]         = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending]         = useState(false);

  useEffect(() => {
    if (!orgId) return;
    const unsub = onSnapshot(
      query(collection(db, 'organizations', orgId, 'members'), orderBy('joinedAt', 'asc')),
      (snap) => {
        setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => { console.warn(ERR.LOAD_FAILED, err); setLoading(false); },
    );
    return unsub;
  }, [orgId]);

  const handleInvite = useCallback(async () => {
    const trimmed = inviteEmail.trim().toLowerCase();
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
      Alert.alert('Geçersiz E-posta', `Lütfen geçerli bir e-posta girin. (${ERR.EMPTY_EMAIL})`);
      return;
    }
    if (!orgId || !userId) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'organizerInvites'), {
        orgId,
        orgName: orgName ?? '',
        invitedEmail: trimmed,
        invitedByUid: userId,
        invitedByName: displayName ?? '',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      Alert.alert('Davet Gönderildi', `${trimmed} adresine davet gönderildi.`);
      setInviteEmail('');
      setInviteVisible(false);
    } catch {
      Alert.alert('Hata', `Davet gönderilemedi. (${ERR.INVITE_FAILED})`);
    } finally {
      setSending(false);
    }
  }, [inviteEmail, orgId, orgName, userId, displayName]);

  const renderMember = useCallback(({ item, index }: { item: any; index: number }) => {
    const grad = GRAD_PAIRS[index % GRAD_PAIRS.length];
    const isMe = item.userId === userId;
    return (
      <View style={styles.memberCard}>
        <LinearGradient colors={grad} style={styles.memberAvatar}>
          <Text style={styles.memberInitials}>{getInitials(item.displayName ?? '?')}</Text>
        </LinearGradient>
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName}>{item.displayName}</Text>
            {isMe && <Text style={styles.meTag}>Sen</Text>}
          </View>
          <Text style={styles.memberEmail}>{item.email}</Text>
        </View>
        <View style={[styles.rolePill, { backgroundColor: (ROLE_COLORS[item.role as 'owner' | 'staff'] ?? ROLE_COLORS.staff) + '20' }]}>
          <Ionicons
            name={item.role === 'owner' ? 'shield-checkmark' : 'people'}
            size={11}
            color={ROLE_COLORS[item.role as 'owner' | 'staff'] ?? ROLE_COLORS.staff}
          />
          <Text style={[styles.roleText, { color: ROLE_COLORS[item.role as 'owner' | 'staff'] ?? ROLE_COLORS.staff }]}>
            {item.role === 'owner' ? 'Owner' : 'Staff'}
          </Text>
        </View>
      </View>
    );
  }, [userId]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Ekip</Text>
        <Text style={styles.subtitle}>{orgName ?? 'Organizasyonunuz'}</Text>
      </View>

      {/* İstatistik */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{members.length}</Text>
          <Text style={styles.statLabel}>Toplam Üye</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{members.filter((m) => m.role === 'owner').length}</Text>
          <Text style={styles.statLabel}>Owner</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{members.filter((m) => m.role === 'staff').length}</Text>
          <Text style={styles.statLabel}>Staff</Text>
        </View>
      </View>

      {/* Üye Listesi */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={ACCENT} />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          renderItem={renderMember}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Henüz üye yok</Text>
            </View>
          }
        />
      )}

      {/* Davet Et butonu (owner veya staff) */}
      <TouchableOpacity style={styles.inviteFab} onPress={() => setInviteVisible(true)}>
        <LinearGradient colors={[ACCENT, '#BE123C']} style={styles.inviteFabGrad}>
          <Ionicons name="person-add" size={20} color="#fff" />
          <Text style={styles.inviteFabText}>Staff Davet Et</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Davet Modal */}
      <Modal visible={inviteVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Staff Davet Et</Text>
            <Text style={styles.modalSub}>
              Davet edilen kişi uygulamaya organizatör olarak kaydolduğunda daveti görecek.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="ornek@email.com"
              placeholderTextColor={Colors.textMuted}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setInviteVisible(false); setInviteEmail(''); }}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, sending && styles.btnDisabled]}
                onPress={handleInvite}
                disabled={sending}
              >
                {sending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.sendBtnText}>Davet Gönder</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800' },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: Spacing.lg, marginVertical: Spacing.md },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  statVal: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  statLabel: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 120, gap: 10 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm },
  memberCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  memberInitials: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800' },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  meTag: {
    backgroundColor: ACCENT + '20', color: ACCENT,
    fontSize: 9, fontWeight: '700', paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 4,
  },
  memberEmail: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.sm,
  },
  roleText: { fontSize: 10, fontWeight: '700' },
  inviteFab: {
    position: 'absolute', bottom: 100, right: Spacing.lg,
    borderRadius: BorderRadius.xl, overflow: 'hidden',
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  inviteFabGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14 },
  inviteFabText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl,
  },
  modalTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', marginBottom: 6 },
  modalSub: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: Spacing.lg, lineHeight: 20 },
  input: {
    backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
    color: Colors.text, fontSize: FontSize.md, marginBottom: Spacing.lg,
  },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  cancelBtnText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
  sendBtn: {
    flex: 2, paddingVertical: 14, borderRadius: BorderRadius.md,
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});
