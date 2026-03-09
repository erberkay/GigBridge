import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
};

const ARTISTS = [
  { id: '1', name: 'DJ Armin', genre: 'Electronic', rating: 4.9, price: '₺4.500', emoji: '🎧', attendance: '+%30', genderBalance: '50/50', followers: '12K', bio: 'Uluslararası tanınırlığa sahip Electronic DJ.' },
  { id: '2', name: 'Kerem Görsev', genre: 'Jazz', rating: 4.8, price: '₺3.200', emoji: '🎹', attendance: '+%25', genderBalance: '45/55', followers: '8K', bio: 'Jazz piyanosu ustası, 15 yıllık deneyim.' },
  { id: '3', name: 'Koray Avcı', genre: 'Pop Rock', rating: 4.7, price: '₺6.000', emoji: '🎸', attendance: '+%40', genderBalance: '40/60', followers: '45K', bio: 'Pop Rock sahnelerinin vazgeçilmezi.' },
  { id: '4', name: 'Merve Özbey', genre: 'Pop', rating: 4.6, price: '₺5.500', emoji: '🎤', attendance: '+%35', genderBalance: '35/65', followers: '32K', bio: 'Türk pop müziğinin güçlü sesi.' },
  { id: '5', name: 'Aytaç Doğan', genre: 'Akustik', rating: 4.5, price: '₺2.800', emoji: '🎸', attendance: '+%20', genderBalance: '48/52', followers: '6K', bio: 'Akustik müziğin şiirsel yorumcusu.' },
  { id: '6', name: 'Ceza', genre: 'Hip-Hop', rating: 4.8, price: '₺8.000', emoji: '🎤', attendance: '+%50', genderBalance: '55/45', followers: '120K', bio: 'Türk Hip-Hop sahnesinin efsanesi.' },
];

const GENRES = ['Tümü', 'Electronic', 'Jazz', 'Pop', 'Rock', 'Akustik', 'Hip-Hop'];

export default function FindArtistScreen({ navigation }: any) {
  const { userId, displayName } = useAuthStore();
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Tümü');
  const [sortBy, setSortBy] = useState<'rating' | 'attendance'>('rating');
  const [inviteModal, setInviteModal] = useState<typeof ARTISTS[0] | null>(null);
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const filtered = ARTISTS
    .filter((a) => {
      const matchGenre = selectedGenre === 'Tümü' || a.genre === selectedGenre;
      const matchSearch = search === '' || a.name.toLowerCase().includes(search.toLowerCase());
      return matchGenre && matchSearch;
    })
    .sort((a, b) => sortBy === 'rating' ? b.rating - a.rating : parseInt(b.attendance) - parseInt(a.attendance));

  const handleSendInvite = async () => {
    if (!eventDate.trim() || !eventTime.trim()) {
      Alert.alert('Hata', 'Tarih ve saat girin.');
      return;
    }
    setSending(true);
    try {
      await addDoc(collection(db, 'invitations'), {
        venueId: userId,
        venueName: displayName,
        artistId: inviteModal!.id,
        artistName: inviteModal!.name,
        eventDate: eventDate.trim(),
        eventTime: eventTime.trim(),
        message: message.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      Alert.alert('Davet Gönderildi!', `${inviteModal!.name} adlı sanatçıya davet gönderildi.`);
      setInviteModal(null);
      setEventDate('');
      setEventTime('');
      setMessage('');
    } catch {
      Alert.alert('Hata', 'Davet gönderilemedi.');
    } finally {
      setSending(false);
    }
  };

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
        />
      </View>

      {/* Sıralama */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sırala:</Text>
        <TouchableOpacity
          style={[styles.sortBtn, sortBy === 'rating' && styles.sortBtnActive]}
          onPress={() => setSortBy('rating')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="star-outline" size={13} color={sortBy === 'rating' ? '#fff' : Colors.textSecondary} />
            <Text style={[styles.sortBtnText, sortBy === 'rating' && styles.sortBtnTextActive]}>Puan</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortBtn, sortBy === 'attendance' && styles.sortBtnActive]}
          onPress={() => setSortBy('attendance')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
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
      <FlatList
        data={filtered}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={40} color={Colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>Sanatçı bulunamadı</Text>
            <Text style={styles.emptySubText}>Arama veya filtre kriterlerini değiştirmeyi deneyin.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.artistCard}>
            <View style={styles.artistLeft}>
              <View style={styles.artistAvatar}>
                <LinearGradient
                  colors={GENRE_COLORS[item.genre] ?? ['#4A4A6A', '#2A2A4A']}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="star" size={11} color={Colors.accent} />
                <Text style={styles.artistRating}>{item.rating}</Text>
              </View>
              <Text style={styles.artistPrice}>{item.price}</Text>
              <TouchableOpacity style={styles.inviteBtn} onPress={() => setInviteModal(item)}>
                <Text style={styles.inviteBtnText}>Davet Et</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Davet Modal */}
      <Modal visible={!!inviteModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{ paddingBottom: Spacing.md }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={styles.modalTitle}>Davet Gönder</Text>
            {inviteModal && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.lg }}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="cash-outline" size={14} color={Colors.venueColor} />
                  <Text style={styles.inviteInfoText}>Ücret: {inviteModal.price}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
                style={[styles.sendBtn, sending && { opacity: 0.6 }]}
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
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border,
  },
  sortBtnActive: { backgroundColor: Colors.venueColor, borderColor: Colors.venueColor },
  sortBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  sortBtnTextActive: { color: '#fff', fontWeight: '700' },
  genreScrollContainer: {
    height: 56,
    marginBottom: Spacing.md,
  },
  genreList: {
    paddingHorizontal: Spacing.lg,
    gap: 10,
    alignItems: 'center',
  },
  genreChip: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  genreChipActive: { backgroundColor: Colors.venueColor, borderColor: Colors.venueColor },
  genreText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  genreTextActive: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 110, gap: 12 },
  artistCard: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  artistLeft: { flexDirection: 'row', flex: 1, gap: 12, marginRight: 10 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600', marginBottom: 6 },
  emptySubText: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  artistAvatar: {
    width: 52, height: 52, borderRadius: 26,
    overflow: 'hidden',
    flexShrink: 0,
  },
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
    padding: Spacing.xl,
    maxHeight: '90%',
  },
  modalTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', marginBottom: 4 },
  modalSubtitle: { color: Colors.textSecondary, fontSize: FontSize.md },
  input: {
    backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, color: Colors.text, fontSize: FontSize.sm,
    marginBottom: 10,
  },
  messageInput: { minHeight: 80, textAlignVertical: 'top' },
  inviteInfo: {
    backgroundColor: Colors.venueColor + '15',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 4,
  },
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
});
