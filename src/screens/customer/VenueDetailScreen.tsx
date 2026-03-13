import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
// ERR-VENUE-001 Yorum gönderilemedi  ERR-VENUE-002 Kimlik doğrulama eksik
// ERR-VENUE-003 Puan seçilmedi       ERR-VENUE-004 Yorum metni çok kısa
const ERR = {
  REVIEW_FAILED:     'ERR-VENUE-001',
  NOT_AUTHENTICATED: 'ERR-VENUE-002',
  NO_RATING:         'ERR-VENUE-003',
  REVIEW_TOO_SHORT:  'ERR-VENUE-004',
} as const;

import { collection, addDoc, serverTimestamp, doc, setDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { PressableScale } from '../../components/common/PressableScale';

const VENUE_REVIEWS = [
  { id: '1', author: 'Ali K.', rating: 5, comment: 'Harika bir mekan! Ses sistemi mükemmel, atmosfer çok iyi.', date: '3 gün önce' },
  { id: '2', author: 'Ayşe M.', rating: 4, comment: 'Personel çok yardımsever, fiyatlar makul.', date: '1 hafta önce' },
  { id: '3', author: 'Can B.', rating: 5, comment: 'Istanbul\'un en iyi kulüplerinden biri. Kesinlikle tavsiye ederim.', date: '2 hafta önce' },
];

const DEFAULT_VENUE = { name: 'Mekan', city: 'İstanbul', rating: 4.5, capacity: 500, genre: 'Çeşitli' };

export default function VenueDetailScreen({ route, navigation }: any) {
  const venue = { ...DEFAULT_VENUE, ...(route.params?.venue ?? {}) };
  const userId      = useAuthStore((s) => s.userId);
  const displayName = useAuthStore((s) => s.displayName);

  const venueId = venue.id ?? venue.name;

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRating, setSelectedRating]   = useState(0);
  const [reviewText, setReviewText]           = useState('');
  const [submitting, setSubmitting]           = useState(false);
  const [reviews, setReviews]                 = useState<typeof VENUE_REVIEWS>([]);
  const [saved, setSaved]                     = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'reviews'), where('targetId', '==', venueId), where('targetType', '==', 'venue'));
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
    }, (err) => console.warn('[VenueDetail] reviews onSnapshot hatası:', err));
    return () => unsub();
  }, [venueId]);

  const handleSave = useCallback(async () => {
    if (!userId) { Alert.alert('Giriş Gerekli', 'Favori eklemek için giriş yapmalısınız.'); return; }
    try {
      await setDoc(doc(db, 'users', userId, 'favorites', venueId), {
        venueId, venueName: venue.name, city: venue.city ?? '', addedAt: serverTimestamp(),
      });
      setSaved(true);
      Alert.alert('Kaydedildi', 'Mekan favorilerinize eklendi.');
    } catch {
      Alert.alert('Hata', 'Favorilere eklenemedi.');
    }
  }, [userId, venueId, venue.name, venue.city]);

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
        targetId:   venueId,
        targetName: venue.name,
        targetType: 'venue',
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
  }, [userId, displayName, selectedRating, reviewText, venueId]);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#0D1B2A', Colors.background]} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.venueHero}>
            <View style={styles.avatarWrapper}>
              <LinearGradient
                colors={['#7C3AED', '#4C1D95']}
                style={styles.avatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.avatarInitial}>{venue.name?.charAt(0).toUpperCase() ?? 'M'}</Text>
              </LinearGradient>
            </View>
            <Text style={styles.venueName}>{venue.name}</Text>
            <View style={styles.cityRow}>
              <Ionicons name="location-outline" size={13} color="#A78BFA" />
              <Text style={styles.venueCity}>{venue.city ?? 'İstanbul'}</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={styles.statRatingRow}>
                  <Ionicons name="star" size={14} color={Colors.accent} />
                  <Text style={styles.statValue}>{venue.rating ?? '4.5'}</Text>
                </View>
                <Text style={styles.statLabel}>Puan</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{venue.capacity ?? '500'}</Text>
                <Text style={styles.statLabel}>Kapasite</Text>
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
          <PressableScale style={[styles.saveBtn, saved && { borderColor: 'rgba(16,185,129,0.4)', backgroundColor: 'rgba(16,185,129,0.08)' }]} onPress={handleSave} scaleTo={0.96}>
            <View style={styles.btnInner}>
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={16} color={saved ? '#34D399' : '#A78BFA'} />
              <Text style={styles.saveBtnText}>Kaydet</Text>
            </View>
          </PressableScale>
          <PressableScale style={styles.reviewBtn} onPress={() => setShowReviewModal(true)} scaleTo={0.96}>
            <View style={styles.btnInner}>
              <Ionicons name="star-outline" size={16} color="#fff" />
              <Text style={styles.reviewBtnText}>Puan Ver</Text>
            </View>
          </PressableScale>
        </View>

        {/* Hakkında */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mekan Hakkında</Text>
          <Text style={styles.bio}>
            {venue.description ?? 'İstanbul\'un kalbinde yer alan bu mekan, eşsiz atmosferi ve yüksek kaliteli ses sistemiyle öne çıkıyor. Her hafta sonu düzenlenen etkinliklerle müzik tutkunlarına unutulmaz geceler yaşatıyor.'}
          </Text>
        </View>

        {/* Özellikler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Özellikler</Text>
          <View style={styles.featureGrid}>
            {([
              { iconName: 'musical-notes-outline', label: 'Canlı Müzik' },
              { iconName: 'headset-outline', label: 'DJ Sahne' },
              { iconName: 'wine-outline', label: 'Bar' },
              { iconName: 'car-outline', label: 'Park Yeri' },
              { iconName: 'accessibility-outline', label: 'Engelli Erişim' },
              { iconName: 'camera-outline', label: 'Fotoğraf Alanı' },
            ] as { iconName: React.ComponentProps<typeof Ionicons>['name']; label: string }[]).map((f) => (
              <View key={f.label} style={styles.featureItem}>
                <Ionicons name={f.iconName} size={16} color={Colors.textSecondary} />
                <Text style={styles.featureLabel}>{f.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Türler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Müzik Türleri</Text>
          <View style={styles.genreTags}>
            {(venue.genres ?? ['Electronic', 'House', 'Techno', 'Pop']).map((g: string) => (
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
            <Text style={styles.modalSubtitle}>{venue.name}</Text>

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
  venueHero: { alignItems: 'center', paddingHorizontal: Spacing.lg },
  avatarWrapper: {
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar: {
    width: 100, height: 100, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarInitial: { fontSize: 44, fontWeight: '900', color: '#fff' },
  venueName: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: 8 },
  cityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 5,
    backgroundColor: 'rgba(109,40,217,0.13)',
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: 'rgba(109,40,217,0.3)',
    marginBottom: Spacing.lg,
  },
  venueCity: { color: '#A78BFA', fontSize: FontSize.sm, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { alignItems: 'center', paddingHorizontal: 24 },
  statRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: 2 },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: 12,
    marginVertical: Spacing.lg,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(109,40,217,0.35)',
    backgroundColor: 'rgba(109,40,217,0.07)',
    alignItems: 'center',
  },
  saveBtnText: { color: '#A78BFA', fontSize: 13, fontWeight: '700' },
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
  addReview: { color: '#A78BFA', fontSize: FontSize.sm },
  bio: { color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 24 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featureItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  featureLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  genreTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreTag: {
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: 'rgba(109,40,217,0.13)',
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: 'rgba(109,40,217,0.3)',
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
    backgroundColor: 'rgba(109,40,217,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { color: '#A78BFA', fontSize: FontSize.md, fontWeight: '700' },
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
