import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, query, where, onSnapshot, orderBy, limit,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const ACCENT = Colors.organizerColor;

const ERR = {
  LOAD_MEMBERS: 'ERR-ORG-HOME-001',
  LOAD_EVENTS:  'ERR-ORG-HOME-002',
} as const;

export default function OrganizerHomeScreen({ navigation }: any) {
  const displayName = useAuthStore((s) => s.displayName);
  const orgId       = useAuthStore((s) => s.orgId);
  const orgName     = useAuthStore((s) => s.orgName);
  const orgRole     = useAuthStore((s) => s.orgRole);

  const [memberCount, setMemberCount] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    const unsub = onSnapshot(
      collection(db, 'organizations', orgId, 'members'),
      (snap) => setMemberCount(snap.size),
      (err) => console.warn(ERR.LOAD_MEMBERS, err),
    );
    return unsub;
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    const unsub = onSnapshot(
      query(
        collection(db, 'events'),
        where('organizerId', '==', orgId),
        orderBy('createdAt', 'desc'),
        limit(5),
      ),
      (snap) => setUpcomingEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.warn(ERR.LOAD_EVENTS, err),
    );
    return unsub;
  }, [orgId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const QUICK_ACTIONS: { icon: IoniconName; label: string; color: string; screen: string }[] = [
    { icon: 'people-outline',       label: 'Ekip',      color: ACCENT,           screen: 'OrgTeam' },
    { icon: 'calendar-outline',     label: 'Etkinlikler', color: '#3B82F6',      screen: 'OrgEvents' },
    { icon: 'person-add-outline',   label: 'Davet Et',  color: '#10B981',        screen: 'OrgTeam' },
    { icon: 'chatbubbles-outline',  label: 'Mesajlar',  color: Colors.artistColor, screen: 'OrgMessages' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
    >
      {/* Header */}
      <LinearGradient colors={['#1A0810', Colors.background]} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.name}>{displayName ?? 'Organizatör'}</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Org Kartı */}
        <View style={styles.orgCard}>
          <LinearGradient colors={[ACCENT + '22', ACCENT + '08']} style={styles.orgCardGrad}>
            <View style={styles.orgCardLeft}>
              <LinearGradient colors={[ACCENT, '#BE123C']} style={styles.orgIcon}>
                <Ionicons name="business" size={22} color="#fff" />
              </LinearGradient>
              <View>
                <Text style={styles.orgName}>{orgName ?? 'Organizasyonunuz'}</Text>
                <View style={styles.roleBadge}>
                  <Ionicons
                    name={orgRole === 'owner' ? 'shield-checkmark' : 'people'}
                    size={12}
                    color={ACCENT}
                  />
                  <Text style={styles.roleText}>{orgRole === 'owner' ? 'Owner' : 'Staff'}</Text>
                </View>
              </View>
            </View>
            <View style={styles.orgStats}>
              <View style={styles.orgStat}>
                <Text style={styles.orgStatVal}>{memberCount}</Text>
                <Text style={styles.orgStatLabel}>Üye</Text>
              </View>
              <View style={styles.orgStat}>
                <Text style={styles.orgStatVal}>{upcomingEvents.length}</Text>
                <Text style={styles.orgStatLabel}>Etkinlik</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </LinearGradient>

      {/* Hızlı Aksiyonlar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.quickCard}
              onPress={() => navigation.navigate(a.screen)}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIcon, { backgroundColor: a.color + '20' }]}>
                <Ionicons name={a.icon} size={22} color={a.color} />
              </View>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Yaklaşan Etkinlikler */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Yaklaşan Etkinlikler</Text>
          <TouchableOpacity onPress={() => navigation.navigate('OrgEvents')}>
            <Text style={styles.seeAll}>Tümü</Text>
          </TouchableOpacity>
        </View>
        {upcomingEvents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Henüz etkinlik yok</Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('OrgEvents')}>
              <Text style={styles.createBtnText}>Etkinlik Oluştur</Text>
            </TouchableOpacity>
          </View>
        ) : (
          upcomingEvents.map((ev) => (
            <View key={ev.id} style={styles.eventRow}>
              <View style={styles.eventLeft}>
                <LinearGradient colors={[ACCENT, '#BE123C']} style={styles.eventDot} />
                <View>
                  <Text style={styles.eventTitle}>{ev.title}</Text>
                  <Text style={styles.eventMeta}>{ev.venueName ?? '—'} · {ev.date?.toDate?.().toLocaleDateString('tr-TR') ?? ev.date}</Text>
                </View>
              </View>
              <View style={[styles.eventStatus, ev.status === 'live' && styles.eventStatusLive]}>
                <Text style={[styles.eventStatusText, ev.status === 'live' && styles.eventStatusTextLive]}>
                  {ev.status === 'live' ? 'Canlı' : ev.status === 'upcoming' ? 'Yaklaşan' : 'Geçmiş'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1 },
  header: { paddingTop: 56, paddingBottom: Spacing.lg },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg,
  },
  greeting: { color: Colors.textMuted, fontSize: FontSize.sm },
  name: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  notifBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  orgCard: { marginHorizontal: Spacing.lg, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: ACCENT + '30' },
  orgCardGrad: { padding: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orgCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  orgIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  orgName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: 4 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  roleText: { color: ACCENT, fontSize: FontSize.xs, fontWeight: '700' },
  orgStats: { flexDirection: 'row', gap: 20 },
  orgStat: { alignItems: 'center' },
  orgStatVal: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '800' },
  orgStatLabel: { color: Colors.textMuted, fontSize: 10 },
  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.xl },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md },
  seeAll: { color: ACCENT, fontSize: FontSize.sm, fontWeight: '600' },
  quickGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  quickCard: {
    flex: 1, minWidth: '20%', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  quickIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.xl, alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm },
  createBtn: {
    backgroundColor: ACCENT, borderRadius: BorderRadius.sm,
    paddingHorizontal: 20, paddingVertical: 8, marginTop: 4,
  },
  createBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
  eventRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  eventLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  eventDot: { width: 8, height: 8, borderRadius: 4 },
  eventTitle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  eventMeta: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  eventStatus: {
    backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.sm,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  eventStatusLive: { backgroundColor: Colors.success + '20' },
  eventStatusText: { color: Colors.textSecondary, fontSize: 10, fontWeight: '600' },
  eventStatusTextLive: { color: Colors.success },
  bottomSpacer: { height: 110 },
});
