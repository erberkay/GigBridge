import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { PressableScale } from '../../components/common/PressableScale';

const VENUE_REVIEWS = [
  { id: '1', author: 'Ali K.', rating: 5, comment: 'Harika bir mekan! Ses sistemi mükemmel, atmosfer çok iyi.', date: '3 gün önce' },
  { id: '2', author: 'Ayşe M.', rating: 4, comment: 'Personel çok yardımsever, fiyatlar makul.', date: '1 hafta önce' },
  { id: '3', author: 'Can B.', rating: 5, comment: 'Istanbul\'un en iyi kulüplerinden biri. Kesinlikle tavsiye ederim.', date: '2 hafta önce' },
];

export default function VenueDetailScreen({ route, navigation }: any) {
  const { venue } = route.params ?? {
    venue: { name: 'Mekan', city: 'İstanbul', emoji: '🏢', rating: 4.5, capacity: 500, genre: 'Çeşitli' },
  };
  const { userId, displayName } = useAuthStore();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitReview = async () => {
    if (selectedRating === 0) {
      Alert.alert('Hata', 'Lütfen bir puan seçin.');
      return;
    }
    if (reviewText.trim().length < 10) {
      Alert.alert('Hata', 'Yorum en az 10 karakter olmalı.');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        authorId: userId,
        authorName: displayName,
        targetId: venue.id ?? venue.name,
        targetType: 'venue',
        rating: selectedRating,
        comment: reviewText.trim(),
        createdAt: serverTimestamp(),
      });
      Alert.alert('Teşekkürler!', 'Yorumunuz başarıyla gönderildi.');
      setShowReviewModal(false);
      setSelectedRating(0);
      setReviewText('');
    } catch {
      Alert.alert('Hata', 'Yorum gönderilemedi. Tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

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
                colors={[Colors.venueColor, '#0A7A9E']}
                style={styles.avatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.avatarInitial}>{venue.name?.charAt(0).toUpperCase() ?? '🏢'}</Text>
              </LinearGradient>
            </View>
            <Text style={styles.venueName}>{venue.name}</Text>
            <View style={styles.cityRow}>
              <Ionicons name="location-outline" size={13} color={Colors.venueColor} />
              <Text style={styles.venueCity}>{venue.city ?? 'İstanbul'}</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
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
                <Text style={styles.statValue}>{VENUE_REVIEWS.length}</Text>
                <Text style={styles.statLabel}>Yorum</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Aksiyonlar */}
        <View style={styles.actions}>
          <PressableScale style={styles.saveBtn} onPress={() => Alert.alert('Kaydedildi', 'Mekan favorilerinize eklendi.')} scaleTo={0.96}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="bookmark-outline" size={16} color={Colors.venueColor} />
              <Text style={styles.saveBtnText}>Kaydet</Text>
            </View>
          </PressableScale>
          <PressableScale style={styles.reviewBtn} onPress={() => setShowReviewModal(true)} scaleTo={0.96}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
                <Ionicons name={f.iconName} size={16} color={Colors.venueColor} />
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
          {VENUE_REVIEWS.map((review) => (
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
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Ionicons key={i} name="star" size={12} color={Colors.accent} />
                  ))}
                </View>
              </View>
              <Text style={styles.reviewComment}>{review.comment}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Puan/Yorum Modal */}
      <Modal visible={showReviewModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Puan & Yorum</Text>
            <Text style={styles.modalSubtitle}>{venue.name}</Text>

            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setSelectedRating(star)} style={{ padding: 4 }}>
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
                style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
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
  backText: {},
  venueHero: { alignItems: 'center', paddingHorizontal: Spacing.lg },
  avatarWrapper: {
    marginBottom: Spacing.md,
    shadowColor: Colors.venueColor,
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
    backgroundColor: Colors.venueColor + '22',
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.venueColor + '44',
    marginBottom: Spacing.lg,
  },
  venueCity: { color: Colors.venueColor, fontSize: FontSize.sm, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { alignItems: 'center', paddingHorizontal: 24 },
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
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.venueColor,
    alignItems: 'center',
  },
  saveBtnText: { color: Colors.venueColor, fontSize: FontSize.md, fontWeight: '700' },
  reviewBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.venueColor,
    alignItems: 'center',
  },
  reviewBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md },
  addReview: { color: Colors.venueColor, fontSize: FontSize.sm },
  bio: { color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 24 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featureItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  featureIcon: {},
  featureLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  genreTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreTag: {
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: Colors.venueColor + '22',
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.venueColor + '44',
  },
  genreTagText: { color: Colors.venueColor, fontSize: FontSize.sm, fontWeight: '600' },
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
    backgroundColor: Colors.venueColor + '33',
    alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { color: Colors.venueColor, fontSize: FontSize.md, fontWeight: '700' },
  reviewAuthor: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  reviewDate: { color: Colors.textMuted, fontSize: FontSize.xs },
  reviewRating: { fontSize: 12 },
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
  starIcon: {},
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
    flex: 1, paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelBtnText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
  submitBtn: {
    flex: 1, paddingVertical: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.venueColor,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});
