import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';

interface FollowedArtist {
  id: string;
  artistId: string;
  artistName: string;
  genre?: string;
  followers?: string;
  lastEvent?: string;
}

// ERR-FOLLOWING-001 Takipten çıkma hatası   ERR-FOLLOWING-002 Firestore snapshot hatası
const ERR = {
  UNFOLLOW: 'ERR-FOLLOWING-001',
  SNAPSHOT: 'ERR-FOLLOWING-002',
} as const;

const GENRE_COLORS: Record<string, readonly [string, string]> = {
  Jazz: ['#F59E0B', '#D97706'],
  Electronic: ['#8B5CF6', '#6D28D9'],
  Rock: ['#EF4444', '#B91C1C'],
  Pop: ['#EC4899', '#BE185D'],
  Akustik: ['#10B981', '#059669'],
  'Hip-Hop': ['#F97316', '#EA580C'],
  'R&B': ['#06B6D4', '#0891B2'],
  DJ: ['#8B5CF6', '#6D28D9'],
};

const DEMO_FOLLOWING: FollowedArtist[] = [
  { id: 'd1', artistId: 'a1', artistName: 'Kerem Görsev', genre: 'Jazz', followers: '8.2K', lastEvent: 'Babylon Club · Bugün' },
  { id: 'd2', artistId: 'a2', artistName: 'Kolsch', genre: 'Electronic', followers: '45K', lastEvent: 'Zorlu PSM · Yarın' },
  { id: 'd3', artistId: 'a3', artistName: 'Pinhani', genre: 'Rock', followers: '120K', lastEvent: 'IF Performance · Cumartesi' },
  { id: 'd4', artistId: 'a4', artistName: 'Sertab Erener', genre: 'Pop', followers: '890K', lastEvent: 'Beyrut Performance · 16 Mart' },
];

export default function FollowingScreen({ navigation }: any) {
  const userId = useAuthStore((s) => s.userId);
  const isDemo = userId?.startsWith('demo_') ?? false;
  const [artists, setArtists] = useState<FollowedArtist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      setArtists(DEMO_FOLLOWING);
      setLoading(false);
      return;
    }
    if (!userId) { setLoading(false); return; }
    const unsub = onSnapshot(
      collection(db, 'users', userId, 'following'),
      (snap) => {
        setArtists(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FollowedArtist)));
        setLoading(false);
      },
      () => {
        console.warn(`[${ERR.SNAPSHOT}] Following snapshot hatası.`);
        setLoading(false);
      },
    );
    return unsub;
  }, [userId]);

  const unfollow = useCallback(async (docId: string) => {
    if (isDemo) {
      setArtists((prev) => prev.filter((a) => a.id !== docId));
      return;
    }
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'following', docId));
    } catch {
      console.warn(`[${ERR.UNFOLLOW}] Takipten çıkılamadı.`);
    }
  }, [isDemo, userId]);

  const getAvatarColors = useCallback((name: string, genre?: string): [string, string] => {
    if (genre && GENRE_COLORS[genre]) return [...GENRE_COLORS[genre]] as [string, string];
    return [Colors.primary, Colors.primaryDark];
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1A0A2E', Colors.background]} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <Text style={styles.title}>Takip Ettiğim Sanatçılar</Text>
        <Text style={styles.subtitle}>{artists.length} sanatçı takip ediyorsunuz</Text>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={artists}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const colors = getAvatarColors(item.artistName, item.genre);
            const genreColors = item.genre && GENRE_COLORS[item.genre] ? GENRE_COLORS[item.genre] : null;
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ArtistDetail', {
                  artist: {
                    id: item.artistId,
                    name: item.artistName,
                    genre: item.genre ?? 'Müzik',
                    followers: item.followers ?? '—',
                  }
                })}
              >
                <LinearGradient colors={colors} style={styles.cardAvatar}>
                  <Text style={styles.cardAvatarText}>{item.artistName.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.artistName}</Text>
                  <View style={styles.cardMeta}>
                    {item.genre && genreColors ? (
                      <LinearGradient colors={[...genreColors] as [string, string]} style={styles.genreBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <Text style={styles.genreBadgeText}>{item.genre}</Text>
                      </LinearGradient>
                    ) : item.genre ? (
                      <View style={styles.genreBadgePlain}>
                        <Text style={styles.genreBadgePlainText}>{item.genre}</Text>
                      </View>
                    ) : null}
                    {item.followers && (
                      <View style={styles.metaItem}>
                        <Ionicons name="people-outline" size={11} color={Colors.textMuted} />
                        <Text style={styles.followersText}>{item.followers}</Text>
                      </View>
                    )}
                  </View>
                  {item.lastEvent && (
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
                      <Text style={styles.lastEvent}>{item.lastEvent}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardRight}>
                <TouchableOpacity
                  onPress={() => unfollow(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="heart" size={20} color={Colors.error} />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={14} color={Colors.border} />
              </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="musical-notes-outline" size={48} color={Colors.textMuted} style={styles.emptyIcon} />
              <Text style={styles.emptyText}>Henüz kimseyi takip etmiyorsunuz.</Text>
              <Text style={styles.emptySubText}>Sanatçı profillerinden takip edebilirsiniz.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  backBtn: { marginBottom: Spacing.sm, padding: 4, alignSelf: 'flex-start' },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.sm },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100, paddingTop: Spacing.md, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
  },
  cardAvatar: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  cardAvatarText: { fontSize: 22, fontWeight: '900', color: '#fff' },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  genreBadge: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  genreBadgeText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  genreBadgePlain: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '22',
    borderWidth: 1, borderColor: Colors.primary + '44',
  },
  genreBadgePlainText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' },
  followersText: { color: Colors.textMuted, fontSize: FontSize.xs },
  lastEvent: { color: Colors.textMuted, fontSize: FontSize.xs },
  cardRight: { alignItems: 'center', gap: 10 },
  loader: { marginTop: 40 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emptyIcon: { marginBottom: 16 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md, marginBottom: 8 },
  emptySubText: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', paddingHorizontal: 40 },
});
