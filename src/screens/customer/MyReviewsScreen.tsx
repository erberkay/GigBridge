import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';

const AVATAR_COLORS: [string, string][] = [
  ['#F59E0B', '#D97706'], ['#8B5CF6', '#6D28D9'],
  ['#EC4899', '#BE185D'], ['#06B6D4', '#0891B2'],
];
const getAvatarGrad = (name: string): [string, string] => AVATAR_COLORS[(name.charCodeAt(0) || 65) % AVATAR_COLORS.length];

const DEMO_MY_REVIEWS = [
  {
    id: '1', type: 'venue', targetName: 'Babylon Club',
    rating: 5, comment: 'Muhteşem ses sistemi ve atmosfer! Sahne düzeni çok etkileyiciydi.',
    date: '8 Mart 2026', event: 'Electronic Night',
  },
  {
    id: '2', type: 'artist', targetName: 'Kerem Görsev',
    rating: 5, comment: 'Jazz piyanosu inanılmaz bir ustalıkla çalındı. Kesinlikle tekrar gideceğim.',
    date: '2 Mart 2026', event: 'Jazz Gecesi',
  },
  {
    id: '3', type: 'venue', targetName: 'Nardis Jazz',
    rating: 4, comment: 'Samimi ve sıcak bir ortam. Küçük ama kaliteli bir mekan.',
    date: '22 Şubat 2026', event: 'Caz Akşamı',
  },
  {
    id: '4', type: 'artist', targetName: 'DJ Berkay',
    rating: 5, comment: 'Set listesi harikaydı, sabaha kadar dans ettik. En iyi DJ!',
    date: '15 Şubat 2026', event: 'DJ Berkay Live Set',
  },
];

export default function MyReviewsScreen({ navigation }: any) {
  const userId = useAuthStore((s) => s.userId);
  const [reviews, setReviews] = useState<typeof DEMO_MY_REVIEWS>([]);
  const [editModal, setEditModal] = useState<typeof DEMO_MY_REVIEWS[0] | null>(null);
  const [editComment, setEditComment] = useState('');
  const [editRating, setEditRating] = useState(5);

  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'reviews'), where('authorId', '==', userId));
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) { setReviews([]); return; }
      setReviews(snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: data.targetType ?? 'artist',
          targetName: data.targetName ?? data.targetId ?? '—',
          rating: data.rating ?? 0,
          comment: data.comment ?? '',
          date: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('tr-TR') : 'Yakın zamanda',
          event: data.event ?? '',
        };
      }));
    }, (err) => console.warn('[MyReviews] onSnapshot hatası:', err));
    return () => unsub();
  }, [userId]);

  const openEdit = useCallback((review: typeof DEMO_MY_REVIEWS[0]) => {
    setEditModal(review);
    setEditComment(review.comment);
    setEditRating(review.rating);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editModal) return;
    if (!editComment.trim()) {
      Alert.alert('Hata', 'Yorum boş olamaz.');
      return;
    }
    try {
      await updateDoc(doc(db, 'reviews', editModal.id), { comment: editComment.trim(), rating: editRating });
    } catch {
      Alert.alert('Hata', 'Yorum güncellenemedi.');
      return;
    }
    setEditModal(null);
  }, [editModal, editComment, editRating]);

  const deleteReview = useCallback((id: string) => {
    Alert.alert('Yorumu Sil', 'Bu yorumu silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try { await deleteDoc(doc(db, 'reviews', id)); }
        catch { Alert.alert('Hata', 'Yorum silinemedi.'); }
      }},
    ]);
  }, []);

  const avgRating = useMemo(() =>
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : '—',
  [reviews]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Yorumlarım</Text>
        <View style={styles.subtitleRow}>
          <Text style={styles.subtitle}>{reviews.length} yorum • Ortalama </Text>
          <Ionicons name="star" size={12} color={Colors.accent} />
          <Text style={styles.subtitle}> {avgRating}</Text>
        </View>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="star-outline" size={48} color={Colors.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>Henüz yorum yazmadınız.</Text>
            <Text style={styles.emptySubText}>Etkinliklere katıldıktan sonra sanatçı ve mekan yorumu yazabilirsiniz.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.reviewCard}>
            <View style={styles.reviewTop}>
              <LinearGradient colors={[...getAvatarGrad(item.targetName)]} style={item.type === 'venue' ? styles.targetAvatarSquare : styles.targetAvatar}>
                <Text style={styles.targetAvatarText}>{item.targetName.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
              <View style={styles.reviewMeta}>
                <Text style={styles.targetName}>{item.targetName}</Text>
                <View style={styles.eventRow}>
                  <Ionicons name="musical-notes-outline" size={11} color={Colors.primary} />
                  <Text style={styles.reviewEvent}>{item.event}</Text>
                </View>
                <Text style={styles.reviewDate}>{item.date}</Text>
              </View>
              <View style={styles.reviewActions}>
                <TouchableOpacity onPress={() => openEdit(item)} style={styles.editBtn}>
                  <Ionicons name="create-outline" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteReview(item.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons key={s} name={s <= item.rating ? 'star' : 'star-outline'} size={14} color={s <= item.rating ? Colors.accent : Colors.textMuted} />
              ))}
              <View style={[styles.typeBadge, item.type === 'venue' ? styles.typeBadgeVenue : styles.typeBadgeArtist]}>
                <Ionicons name={item.type === 'venue' ? 'business-outline' : 'mic-outline'} size={10} color={item.type === 'venue' ? Colors.venueColor : Colors.artistColor} />
                <Text style={[styles.typeText, item.type === 'venue' ? styles.typeTextVenue : styles.typeTextArtist]}>
                  {item.type === 'venue' ? 'Mekan' : 'Sanatçı'}
                </Text>
              </View>
            </View>
            <Text style={styles.commentText}>{item.comment}</Text>
          </View>
        )}
      />

      {/* Düzenleme Modal */}
      <Modal visible={!!editModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yorumu Düzenle</Text>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {editModal && (
              <Text style={styles.modalSubtitle}>{editModal.targetName}</Text>
            )}

            <Text style={styles.ratingLabel}>Puanınız</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setEditRating(s)} style={styles.starBtn}>
                  <Ionicons name={s <= editRating ? 'star' : 'star-outline'} size={28} color={s <= editRating ? Colors.accent : Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.editInput}
              value={editComment}
              onChangeText={setEditComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor={Colors.textMuted}
              placeholder="Yorumunuzu yazın..."
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(null)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                <Text style={styles.saveBtnText}>Kaydet</Text>
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
  backBtn: { marginBottom: Spacing.sm, padding: 4, alignSelf: 'flex-start' },
  subtitleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.sm },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 110, gap: 12 },
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  reviewTop: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  targetAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  targetAvatarSquare: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  starBtn: { padding: 4 },
  emptyIcon: { marginBottom: 16 },
  targetAvatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  reviewMeta: { flex: 1 },
  targetName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 2 },
  reviewEvent: { color: Colors.primary, fontSize: FontSize.xs, marginBottom: 2 },
  reviewDate: { color: Colors.textMuted, fontSize: FontSize.xs },
  reviewActions: { flexDirection: 'row', gap: 4 },
  editBtn: { padding: 6 },
  deleteBtn: { padding: 6 },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 8 },
  typeBadge: {
    marginLeft: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  typeBadgeVenue: { backgroundColor: Colors.venueColor + '22' },
  typeBadgeArtist: { backgroundColor: Colors.artistColor + '22' },
  typeText: { fontSize: FontSize.xs, fontWeight: '600' },
  typeTextVenue: { color: Colors.venueColor },
  typeTextArtist: { color: Colors.artistColor },
  commentText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600', marginBottom: 8 },
  emptySubText: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  modalSubtitle: { color: Colors.textSecondary, fontSize: FontSize.md, marginBottom: Spacing.md },
  ratingLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: 8 },
  ratingRow: { flexDirection: 'row', gap: 4, marginBottom: Spacing.md },
  editInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSize.sm,
    minHeight: 100,
    marginBottom: Spacing.lg,
  },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
  },
  cancelBtnText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
  saveBtn: {
    flex: 2, paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#5B21B6',
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});
