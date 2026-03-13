import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';

const GENRE_COLORS: Record<string, [string, string]> = {
  Electronic: ['#6C3FC5', '#3B1FA0'],
  Jazz: ['#1A6B4A', '#0D4A32'],
  'Pop Rock': ['#C53F7A', '#8B1A4A'],
  Pop: ['#C5713F', '#8B4A1A'],
  Akustik: ['#3F8BC5', '#1A5A8B'],
  'Hip-Hop': ['#8B3FC5', '#5A1A8B'],
  Rock: ['#EF4444', '#B91C1C'],
};

interface ArtistItem {
  id: string;
  name: string;
  genre: string;
  rating: number;
  price: string;
  attendance: string;
  followers: string;
  bio: string;
}

const ERR = {
  SEND_INVITE: 'ERR-FINDARTIST-001',
  LOAD_ARTISTS: 'ERR-FINDARTIST-002',
} as const;

const GENRES = ['Tümü', 'Electronic', 'Jazz', 'Pop', 'Rock', 'Akustik', 'Hip-Hop'];

function parseAttendance(s: string): number {
  return parseInt(s.replace(/[^0-9]/g, ''), 10) || 0;
}

export default function FindArtistScreen({ navigation }: any) {
  const userId      = useAuthStore((s) => s.userId);
  const displayName = useAuthStore((s) => s.displayName);
  const [artists, setArtists]       = useState<ArtistItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Tümü');
  const [sortBy, setSortBy]         = useState<'rating' | 'attendance'>('rating');
  const [inviteModal, setInviteModal] = useState<ArtistItem | null>(null);
  const [eventDate, setEventDate]   = useState('');
  const [eventTime, setEventTime]   = useState('');
  const [offerFee, setOfferFee]     = useState('');
  const [message, setMessage]       = useState('');
  const [sending, setSending]       = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'users'), where('userType', '==', 'artist')),
        );
        const list: ArtistItem[] = snap.docs.map((d) => {
          const data = d.data();
          const genres: string[] = data.genres ?? [];
          const priceMin = data.priceMin ?? '';
          const priceMax = data.priceMax ?? '';
          const price = priceMin
            ? priceMax ? `₺${priceMin} - ₺${priceMax}` : `₺${priceMin}`
            : 'Belirtilmemiş';
          const fc  = data.followerCount ?? 0;
          const att = data.attendanceCount ?? 0;
          return {
            id: d.id,
            name: data.displayName ?? 'Sanatçı',
            genre: genres[0] ?? 'Diğer',
            rating: data.avgRating ?? 0,
            price,
            attendance: att > 0 ? String(att) : '—',
            followers:  fc > 0  ? (fc >= 1000 ? `${(fc / 1000).toFixed(1)}K` : String(fc)) : '—',
            bio: data.bio ?? 'Biyografi henüz eklenmemiş.',
          };
        });
        setArtists(list);
      } catch {
        console.warn(ERR.LOAD_ARTISTS);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() =>
    artists
      .filter((a) => {
        const matchGenre = selectedGenre === 'Tümü' || a.genre === selectedGenre;
        const matchSearch = search === '' || a.name.toLowerCase().includes(search.toLowerCase());
        return matchGenre && matchSearch;
      })
      .sort((a, b) => sortBy === 'rating'
        ? b.rating - a.rating
        : parseAttendance(b.attendance) - parseAttendance(a.attendance)),
  [artists, search, selectedGenre, sortBy]);

  const handleSendInvite = useCallback(async () => {
    if (!userId) return;
    if (!eventDate.trim() || !eventTime.trim()) {
      Alert.alert('Hata', 'Tarih ve saat girin.');
      return;
    }
    if (!inviteModal) return;
    setSending(true);
    try {
      // Aynı sanatçı + tarih için bekleyen/kabul edilmiş davet var mı kontrol et
      const dupSnap = await getDocs(query(
        collection(db, 'invitations'),
        where('venueId', '==', userId),
        where('artistId', '==', inviteModal.id),
        where('eventDate', '==', eventDate.trim()),
      ));
      const hasActive = dupSnap.docs.some((d) => ['pending', 'accepted'].includes(d.data().status));
      if (hasActive) {
        Alert.alert('Davet Zaten Var', 'Bu sanatçıya bu tarihte zaten davet gönderdiniz.');
        setSending(false);
        return;
      }
      const parsedFee = offerFee.trim() ? parseFloat(offerFee.replace(/[^0-9.]/g, '')) : null;
      await addDoc(collection(db, 'invitations'), {
        venueId:    userId,
        venueName:  displayName,
        artistId:   inviteModal.id,
        artistName: inviteModal.name,
        genre:      inviteModal.genre ?? '',
        eventDate:  eventDate.trim(),
        eventTime:  eventTime.trim(),
        fee:        parsedFee || null,
        message:    message.trim(),
        status:     'pending',
        createdAt:  serverTimestamp(),
        updatedAt:  serverTimestamp(),
      });
      Alert.alert('Davet Gönderildi!', `${inviteModal.name} adlı sanatçıya davet gönderildi.`);
      setInviteModal(null);
      setEventDate('');
      setEventTime('');
      setOfferFee('');
      setMessage('');
    } catch {
      Alert.alert('Hata', `Davet gönderilemedi. (${ERR.SEND_INVITE})`);
    } finally {
      setSending(false);
    }
  }, [userId, displayName, inviteModal, eventDate, eventTime, offerFee, message]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Sanatçı Bul</Text>
        <Text style={styles.subtitle}>Mekanınız için en uygun sanatçıyı keşfedin</Text>
      </View>

      {/* Arama */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Sanatçı ara..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      {/* Sıralama */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sırala:</Text>
        <TouchableOpacity
          style={[styles.sortBtn, sortBy === 'rating' && styles.sortBtnActive]}
          onPress={() => setSortBy('rating')}
        >
          <View style={styles.sortBtnInner}>
            <Ionicons name="star-outline" size={13} color={sortBy === 'rating' ? '#fff' : Colors.textSecondary} />
            <Text style={[styles.sortBtnText, sortBy === 'rating' && styles.sortBtnTextActive]}>Puan</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortBtn, sortBy === 'attendance' && styles.sortBtnActive]}
          onPress={() => setSortBy('attendance')}
        >
          <View style={styles.sortBtnInner}>
            <Ionicons name="people-outline" size={13} color={sortBy === 'attendance' ? '#fff' : Colors.textSecondary} />
            <Text style={[styles.sortBtnText, sortBy === 'attendance' && styles.sortBtnTextActive]}>Katılım</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Tür filtresi */}
      <View style={styles.genreScrollContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreList}
        >
          {GENRES.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.genreChip, selectedGenre === item && styles.genreChipActive]}
              onPress={() => setSelectedGenre(item)}
            >
              <Text style={[styles.genreText, selectedGenre === item && styles.genreTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sanatçı listesi */}
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.venueColor} />
          <Text style={styles.loadingText}>Sanatçılar yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(a) => a.id}
          style={styles.listFlex}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={40} color={Colors.textMuted} style={styles.emptyIcon} />
              <Text style={styles.emptyText}>Sanatçı bulunamadı</Text>
              <Text style={styles.emptySubText}>
                {artists.length === 0
                  ? 'Henüz kayıtlı sanatçı bulunmuyor.'
                  : 'Arama veya filtre kriterlerini değiştirmeyi deneyin.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.artistCard}>
              <View style={styles.artistLeft}>
                <View style={styles.artistAvatar}>
                  <LinearGradient
                    colors={[...(GENRE_COLORS[item.genre] ?? ['#4A4A6A', '#2A2A4A'])] as [string, string]}
                    style={styles.avatarGrad}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.avatarInitial}>{item.name.charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                </View>
                <View style={styles.artistInfo}>
                  <Text style={styles.artistName}>{item.name}</Text>
                  <Text style={styles.artistGenre}>{item.genre}</Text>
                  <Text style={styles.artistBio} numberOfLines={1}>{item.bio}</Text>
                  <View style={styles.metricsRow}>
                    <View style={styles.metricItem}>
                      <Ionicons name="trending-up-outline" size={10} color={Colors.success} />
                      <Text style={styles.metric}>{item.attendance}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Ionicons name="people-outline" size={10} color={Colors.textSecondary} />
                      <Text style={styles.metric}>{item.followers}</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.artistRight}>
                <View style={styles.artistRatingRow}>
                  <Ionicons name="star" size={11} color={Colors.accent} />
                  <Text style={styles.artistRating}>{item.rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.artistPrice}>{item.price}</Text>
                <TouchableOpacity style={styles.inviteBtn} onPress={() => setInviteModal(item)}>
                  <Text style={styles.inviteBtnText}>Davet Et</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Davet Modal */}
      <Modal visible={!!inviteModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={styles.modalTitle}>Davet Gönder</Text>
            {inviteModal && (
              <View style={styles.modalArtistRow}>
                <Ionicons name="mic-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.modalSubtitle}>{inviteModal.name}</Text>
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="Etkinlik Tarihi (örn: 15 Mart 2025)"
              placeholderTextColor={Colors.textMuted}
              value={eventDate}
              onChangeText={setEventDate}
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Saat (örn: 22:00)"
              placeholderTextColor={Colors.textMuted}
              value={eventTime}
              onChangeText={setEventTime}
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Teklif Ücreti ₺ (isteğe bağlı)"
              placeholderTextColor={Colors.textMuted}
              value={offerFee}
              onChangeText={setOfferFee}
              keyboardType="numeric"
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, styles.messageInput]}
              placeholder="Mesaj (isteğe bağlı)..."
              placeholderTextColor={Colors.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {inviteModal && (
              <View style={styles.inviteInfo}>
                <View style={styles.inviteInfoRow}>
                  <Ionicons name="cash-outline" size={14} color={Colors.venueColor} />
                  <Text style={styles.inviteInfoText}>Ücret: {inviteModal.price}</Text>
                </View>
                <View style={styles.inviteInfoRow}>
                  <Ionicons name="trending-up-outline" size={14} color={Colors.success} />
                  <Text style={styles.inviteInfoText}>Tahmini katılım artışı: {inviteModal.attendance}</Text>
                </View>
              </View>
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setInviteModal(null)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                onPress={handleSendInvite}
                disabled={sending}
              >
                <Text style={styles.sendBtnText}>{sending ? 'Gönderiliyor...' : 'Davet Gönder'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  backBtn: { marginBottom: Spacing.sm, padding: 4, alignSelf: 'flex-start' },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.sm },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm, paddingVertical: 13 },
  sortRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    marginBottom: 4, gap: 10,
  },
  sortLabel: { color: Colors.textMuted, fontSize: FontSize.md, marginRight: 4 },
  sortBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border,
  },
  sortBtnActive: { backgroundColor: Colors.venueColor, borderColor: Colors.venueColor },
  sortBtnText: { color: Colors.textSecondary, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  sortBtnTextActive: { color: '#fff' },
  genreScrollContainer: { marginBottom: Spacing.md, flexGrow: 0 },
  genreList: {
    paddingHorizontal: Spacing.lg, gap: 8, paddingVertical: 4, alignItems: 'center',
  },
  genreChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt, alignSelf: 'flex-start',
  },
  genreChipActive: { backgroundColor: Colors.venueColor, borderColor: Colors.venueColor },
  genreText: { color: Colors.textSecondary, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  genreTextActive: { color: '#fff' },
  listFlex: { flex: 1 },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 110, gap: 12 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textMuted, fontSize: FontSize.sm },
  artistCard: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  artistLeft: { flexDirection: 'row', flex: 1, gap: 12, marginRight: 10 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIcon: { marginBottom: 12 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600', marginBottom: 6 },
  emptySubText: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  artistAvatar: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden', flexShrink: 0 },
  avatarGrad: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 22, fontWeight: '900', color: '#fff' },
  artistInfo: { flex: 1 },
  artistName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 2 },
  artistGenre: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: 4 },
  artistBio: { color: Colors.textSecondary, fontSize: FontSize.xs, marginBottom: 6 },
  metricsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  metricItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metric: { color: Colors.textSecondary, fontSize: 10 },
  artistRight: { alignItems: 'flex-end', justifyContent: 'space-between', minWidth: 70 },
  artistRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  artistRating: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: '700' },
  artistPrice: { color: Colors.success, fontSize: FontSize.xs, fontWeight: '700' },
  inviteBtn: {
    paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: Colors.venueColor, borderRadius: BorderRadius.sm,
  },
  inviteBtnText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl, maxHeight: '90%',
  },
  modalScrollContent: { paddingBottom: Spacing.md },
  modalTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', marginBottom: 4 },
  modalArtistRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.lg },
  modalSubtitle: { color: Colors.textSecondary, fontSize: FontSize.md },
  input: {
    backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, color: Colors.text, fontSize: FontSize.sm, marginBottom: 10,
  },
  messageInput: { minHeight: 80, textAlignVertical: 'top' },
  inviteInfo: {
    backgroundColor: Colors.venueColor + '15',
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, gap: 4,
  },
  inviteInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inviteInfoText: { color: Colors.text, fontSize: FontSize.sm },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  cancelBtnText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
  sendBtn: {
    flex: 2, paddingVertical: 14, borderRadius: BorderRadius.md,
    backgroundColor: Colors.venueColor, alignItems: 'center',
  },
  sendBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  sendBtnDisabled: { opacity: 0.6 },
  sortBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
