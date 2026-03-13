import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
// ─── Hata Kodları ────────────────────────────────────────────────────────────
// ERR-ARTIST-001  Follow/unfollow Firestore hatası
// ERR-ARTIST-002  Yorum gönderilemedi
// ERR-ARTIST-003  Kimlik doğrulama eksik (userId null)
// ERR-ARTIST-004  Yorum metni çok kısa
// ERR-ARTIST-005  Puan seçilmedi
// ERR-ARTIST-006  Başlangıç takip durumu yüklenemedi
const ERR = {
  FOLLOW_FAILED:      'ERR-ARTIST-001',
  REVIEW_FAILED:      'ERR-ARTIST-002',
  NOT_AUTHENTICATED:  'ERR-ARTIST-003',
  REVIEW_TOO_SHORT:   'ERR-ARTIST-004',
  NO_RATING:          'ERR-ARTIST-005',
  FOLLOW_LOAD_FAILED: 'ERR-ARTIST-006',
} as const;
// ─────────────────────────────────────────────────────────────────────────────

import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, getDoc, onSnapshot, query, where, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { PressableScale } from '../../components/common/PressableScale';

const ARTIST_REVIEWS = [
  { id: '1', author: 'Zeynep K.', rating: 5, comment: 'Sahne enerjisi inanılmazdı! Kesinlikle tavsiye ederim.', date: '2 gün önce' },
  { id: '2', author: 'Mehmet A.', rating: 4, comment: 'Çok başarılı bir performans. Tekrar izlemek isterim.', date: '1 hafta önce' },
  { id: '3', author: 'Selin T.', rating: 5, comment: 'Harika müzik seçimleri, gece boyunca dans ettik!', date: '2 hafta önce' },
];

const DEFAULT_ARTIST = { name: 'Sanatçı', genre: 'Müzik', rating: 4.5, followers: '5K' };

export default function ArtistDetailScreen({ route, navigation }: any) {
  const artist = route.params?.artist ?? DEFAULT_ARTIST;
  // Selectors — sadece gereken alanları subscribe et
  const userId      = useAuthStore((s) => s.userId);
  const displayName = useAuthStore((s) => s.displayName);

  const artistId = artist.id ?? artist.name;

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRating, setSelectedRating]   = useState(0);
  const [reviewText, setReviewText]           = useState('');
  const [submitting, setSubmitting]           = useState(false);
  const [following, setFollowing]             = useState(false);
  const [followLoading, setFollowLoading]     = useState(false);
  const [reviews, setReviews]                 = useState<typeof ARTIST_REVIEWS>([]);

  useEffect(() => {
    const q = query(collection(db, 'reviews'), where('targetId', '==', artistId), where('targetType', '==', 'artist'));
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) { setReviews([]); return; }
      setReviews(snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          author: data.authorName ?? 'Anonim',
          rating: data.rating ?? 0,
          comment: data.comment ?? '',
          date: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('tr-TR') : 'Yakın zamanda',
        };
      }));
    }, (err) => console.warn('[ArtistDetail] reviews onSnapshot hatası:', err));
    return () => unsub();
  }, [artistId]);

  // Başlangıç takip durumunu Firestore'dan yükle
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', userId, 'following', artistId));
        setFollowing(snap.exists());
      } catch {
        console.warn(`[${ERR.FOLLOW_LOAD_FAILED}] Takip durumu yüklenemedi.`);
      }
    })();
  }, [userId, artistId]);

  const handleFollow = useCallback(async () => {
    if (!userId || followLoading) return;
    setFollowLoading(true);
    try {
      const ref = doc(db, 'users', userId, 'following', artistId);
      const artistRef = doc(db, 'users', artistId);
      if (following) {
        await deleteDoc(ref);
        await updateDoc(artistRef, { followerCount: increment(-1) });
      } else {
        await setDoc(ref, {
          artistId,
          artistName:  artist.name,
          genre:       artist.genre ?? '',
          followers:   artist.followers ?? '—',
          followedAt:  serverTimestamp(),
        });
        await updateDoc(artistRef, { followerCount: increment(1) });
      }
      setFollowing((prev) => !prev);
    } catch {
      Alert.alert('Hata', `İşlem gerçekleştirilemedi. (${ERR.FOLLOW_FAILED})`);
    } finally {
      setFollowLoading(false);
    }
  }, [userId, followLoading, following, artistId, artist.name]);

  const handleSubmitReview = useCallback(async () => {
    if (!userId) {
      Alert.alert('Giriş Gerekli', `Yorum yapabilmek için giriş yapmalısınız. (${ERR.NOT_AUTHENTICATED})`);
      return;
    }
    if (selectedRating === 0) {
      Alert.alert('Puan Seçin', `Lütfen bir puan seçin. (${ERR.NO_RATING})`);
      return;
    }
    if (reviewText.trim().length < 10) {
      Alert.alert('Yorum Çok Kısa', `Yorum en az 10 karakter olmalı. (${ERR.REVIEW_TOO_SHORT})`);
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        authorId:   userId,
        authorName: displayName,
        targetId:   artistId,
        targetName: artist.name,
        targetType: 'artist',
        rating:     selectedRating,
        comment:    reviewText.trim(),
        createdAt:  serverTimestamp(),
      });
      Alert.alert('Teşekkürler!', 'Yorumunuz başarıyla gönderildi.');
      setShowReviewModal(false);
      setSelectedRating(0);
      setReviewText('');
    } catch {
      Alert.alert('Hata', `Yorum gönderilemedi. Tekrar deneyin. (${ERR.REVIEW_FAILED})`);
    } finally {
      setSubmitting(false);
    }
  }, [userId, displayName, selectedRating, reviewText, artistId]);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#1A0A2E', Colors.background]} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.artistHero}>
            <View style={styles.avatarWrapper}>
              {artist.photo
                ? <Image source={artist.photo} style={styles.avatarImg} />
                : (
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    style={styles.avatar}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.avatarInitial}>{artist.name?.charAt(0).toUpperCase() ?? 'S'}</Text>
                  </LinearGradient>
                )
              }
            </View>
            <Text style={styles.artistName}>{artist.name}</Text>
            <View style={styles.genrePill}>
              <Text style={styles.genrePillText}>{artist.genre}</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={styles.statRatingRow}>
                  <Ionicons name="star" size={14} color={Colors.accent} />
                  <Text style={styles.statValue}>{artist.rating ?? '—'}</Text>
                </View>
                <Text style={styles.statLabel}>Puan</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{artist.followers}</Text>
                <Text style={styles.statLabel}>Takipçi</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{reviews.length}</Text>
                <Text style={styles.statLabel}>Yorum</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Aksiyonlar */}
        <View style={styles.actions}>
          <PressableScale
            style={[styles.followBtn, following && styles.followBtnActive]}
            onPress={handleFollow}
            scaleTo={0.96}
          >
            <View style={styles.btnInner}>
              <Ionicons name={following ? 'checkmark-circle' : 'add-circle-outline'} size={14} color={following ? '#C084FC' : '#A78BFA'} />
              <Text style={[styles.followBtnText, following && styles.followBtnActiveText]} numberOfLines={1}>
                {following ? 'Takipte' : 'Takip Et'}
              </Text>
            </View>
          </PressableScale>
          <PressableScale style={styles.messageBtn} onPress={() => navigation.navigate('Messages', { recipientName: artist.name, recipientId: artist.id })} scaleTo={0.96}>
            <View style={styles.btnInner}>
              <Ionicons name="chatbubbles-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.messageBtnText}>Mesaj</Text>
            </View>
          </PressableScale>
          <PressableScale style={styles.reviewBtn} onPress={() => setShowReviewModal(true)} scaleTo={0.96}>
            <View style={styles.btnInner}>
              <Ionicons name="star-outline" size={14} color="#fff" />
              <Text style={styles.reviewBtnText}>Puan Ver</Text>
            </View>
          </PressableScale>
        </View>

        {/* Hakkında */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hakkında</Text>
          <Text style={styles.bio}>
            {artist.bio ?? 'Profesyonel DJ ve müzisyen. 10 yılı aşkın sahne deneyimiyle Electronic, House ve Techno türlerinde uzmanlaşmış sanatçı.'}
          </Text>
        </View>

        {/* Müzik tarzları */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Müzik Tarzları</Text>
          <View style={styles.genreTags}>
            {(artist.genres ?? [artist.genre, 'House', 'Techno', 'Deep House'].filter(Boolean)).map((g: string) => (
              <View key={g} style={styles.genreTag}>
                <Text style={styles.genreTagText}>{g}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Yorumlar */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Yorumlar</Text>
            <TouchableOpacity onPress={() => setShowReviewModal(true)}>
              <Text style={styles.addReview}>+ Yorum Yap</Text>
            </TouchableOpacity>
          </View>
          {reviews.length === 0 && (
            <View style={styles.emptyReviews}>
              <Ionicons name="star-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyReviewsText}>Henüz yorum yok.</Text>
            </View>
          )}
          {reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewTop}>
                <View style={styles.reviewAuthorRow}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>{review.author[0]}</Text>
                  </View>
                  <View>
                    <Text style={styles.reviewAuthor}>{review.author}</Text>
                    <Text style={styles.reviewDate}>{review.date}</Text>
                  </View>
                </View>
                <View style={styles.reviewStars}>
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Ionicons key={i} name="star" size={12} color={Colors.accent} />
                  ))}
                </View>
              </View>
              <Text style={styles.reviewComment}>{review.comment}</Text>
            </View>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Puan/Yorum Modal */}
      <Modal visible={showReviewModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Puan & Yorum</Text>
            <Text style={styles.modalSubtitle}>{artist.name}</Text>

            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setSelectedRating(star)} style={styles.starBtn}>
                  <Ionicons name={star <= selectedRating ? 'star' : 'star-outline'} size={36} color={star <= selectedRating ? Colors.accent : Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Yorumunuzu yazın... (en az 10 karakter)"
              placeholderTextColor={Colors.textMuted}
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowReviewModal(false)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmitReview}
                disabled={submitting}
              >
                <Text style={styles.submitBtnText}>{submitting ? 'Gönderiliyor...' : 'Gönder'}</Text>
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
  header: { paddingTop: 56, paddingBottom: Spacing.xl },
  backBtn: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  artistHero: { alignItems: 'center', paddingHorizontal: Spacing.lg },
  avatarWrapper: {
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarImg: { width: 100, height: 100, borderRadius: 50, resizeMode: 'cover' },
  avatarInitial: { fontSize: 44, fontWeight: '900', color: '#fff' },
  artistName: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: 10 },
  genrePill: {
    paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: Colors.primary + '33',
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.primary + '66',
    marginBottom: Spacing.lg,
  },
  genrePillText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { alignItems: 'center', paddingHorizontal: 24 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  statValue: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: 2 },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: 12,
    marginVertical: Spacing.lg,
  },
  followBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(109,40,217,0.35)',
    backgroundColor: 'rgba(109,40,217,0.07)',
    alignItems: 'center',
  },
  followBtnText: { color: '#A78BFA', fontSize: 13, fontWeight: '700' },
  followBtnActive: { backgroundColor: 'rgba(109,40,217,0.15)', borderColor: 'rgba(109,40,217,0.5)' },
  followBtnActiveText: { color: '#C084FC' },
  messageBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
  },
  messageBtnText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700' },
  reviewBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#5B21B6',
    alignItems: 'center',
  },
  reviewBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: {
    color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md,
    paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  addReview: { color: Colors.primary, fontSize: FontSize.sm },
  bio: { color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 24 },
  genreTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreTag: {
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: Colors.primary + '22',
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.primary + '44',
  },
  genreTagText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  reviewAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary + '33',
    alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '700' },
  reviewAuthor: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  reviewDate: { color: Colors.textMuted, fontSize: FontSize.xs },
  reviewComment: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl,
  },
  modalTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', marginBottom: 4 },
  modalSubtitle: { color: Colors.textSecondary, fontSize: FontSize.md, marginBottom: Spacing.lg },
  starRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.lg },
  reviewInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSize.md,
    minHeight: 100,
    marginBottom: Spacing.lg,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
  },
  cancelBtnText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
  submitBtn: {
    flex: 1, paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#5B21B6',
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  submitBtnDisabled: { opacity: 0.6 },
  reviewStars: { flexDirection: 'row', gap: 2 },
  bottomSpacer: { height: 80 },
  emptyReviews: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyReviewsText: { color: Colors.textMuted, fontSize: FontSize.sm },
  starBtn: { padding: 4 },
});
