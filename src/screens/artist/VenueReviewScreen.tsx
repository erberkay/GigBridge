import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const WORKED_VENUES = [
  { id: '1', name: 'Babylon Club', city: 'İstanbul', emoji: '🏢', lastPerformance: '10 Mart 2025', myReview: null },
  { id: '2', name: 'Nardis Jazz', city: 'İstanbul', emoji: '🎷', lastPerformance: '5 Mart 2025', myReview: 4 },
  { id: '3', name: 'IF Performance', city: 'İstanbul', emoji: '🎸', lastPerformance: '28 Şubat 2025', myReview: null },
  { id: '4', name: 'Zorlu PSM', city: 'İstanbul', emoji: '🏛️', lastPerformance: '20 Şubat 2025', myReview: 5 },
];

const REVIEW_CRITERIA: { key: string; iconName: IoniconName; label: string; description: string }[] = [
  { key: 'payment', iconName: 'cash-outline', label: 'Ödeme Güvenilirliği', description: 'Ödeme zamanında yapıldı mı?' },
  { key: 'equipment', iconName: 'musical-notes-outline', label: 'Ekipman Kalitesi', description: 'Ses sistemi ve ekipmanlar yeterliydi mi?' },
  { key: 'treatment', iconName: 'people-outline', label: 'Sanatçıya Davranış', description: 'Personel saygılı ve yardımsever miydi?' },
  { key: 'communication', iconName: 'chatbubble-outline', label: 'İletişim', description: 'Organizasyon süreci iletişimi nasıldı?' },
];

export default function VenueReviewScreen({ navigation }: any) {
  const { userId, displayName } = useAuthStore();
  const [selectedVenue, setSelectedVenue] = useState<typeof WORKED_VENUES[0] | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const overallRating = Object.values(ratings).length > 0
    ? (Object.values(ratings).reduce((a, b) => a + b, 0) / Object.values(ratings).length).toFixed(1)
    : null;

  const handleSubmit = async () => {
    if (!selectedVenue) {
      Alert.alert('Hata', 'Lütfen mekan seçin.');
      return;
    }
    if (Object.keys(ratings).length < REVIEW_CRITERIA.length) {
      Alert.alert('Hata', 'Lütfen tüm kriterleri puanlayın.');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'venueReviews'), {
        artistId: userId,
        artistName: isAnonymous ? 'Anonim Sanatçı' : displayName,
        isAnonymous,
        venueId: selectedVenue.id,
        venueName: selectedVenue.name,
        ratings,
        overallRating: parseFloat(overallRating!),
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      });
      Alert.alert('Teşekkürler!', 'Mekan değerlendirmeniz gönderildi. Topluluk için değerli bir katkı!');
      setSelectedVenue(null);
      setRatings({});
      setComment('');
    } catch {
      Alert.alert('Hata', 'Değerlendirme gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (selectedVenue) {
    return (
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedVenue(null)}>
              <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.title}>Mekan Değerlendir</Text>
            <View style={styles.venueHeader}>
              <LinearGradient colors={[Colors.venueColor, '#D97706']} style={styles.venueAvatarSmall}>
                <Text style={styles.venueAvatarSmallText}>{selectedVenue.name.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
              <View>
                <Text style={styles.venueName}>{selectedVenue.name}</Text>
                <Text style={styles.venueCity}>{selectedVenue.city} • {selectedVenue.lastPerformance}</Text>
              </View>
            </View>
          </View>

          {overallRating && (
            <View style={styles.overallBox}>
              <Text style={styles.overallLabel}>Genel Puan</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="star" size={18} color={Colors.artistColor} />
                <Text style={styles.overallValue}>{overallRating}</Text>
              </View>
            </View>
          )}

          {/* Kriterler */}
          {REVIEW_CRITERIA.map((criterion) => (
            <View key={criterion.key} style={styles.criterionCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Ionicons name={criterion.iconName} size={16} color={Colors.artistColor} />
                <Text style={styles.criterionLabel}>{criterion.label}</Text>
              </View>
              <Text style={styles.criterionDesc}>{criterion.description}</Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRatings((prev) => ({ ...prev, [criterion.key]: star }))}
                    style={{ padding: 2 }}
                  >
                    <Ionicons
                      name={star <= (ratings[criterion.key] ?? 0) ? 'star' : 'star-outline'}
                      size={28}
                      color={star <= (ratings[criterion.key] ?? 0) ? Colors.accent : Colors.textMuted}
                    />
                  </TouchableOpacity>
                ))}
                {ratings[criterion.key] && (
                  <Text style={styles.ratingLabel}>{ratings[criterion.key]}/5</Text>
                )}
              </View>
            </View>
          ))}

          {/* Yorum */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yorum (isteğe bağlı)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Deneyiminizi paylaşın..."
              placeholderTextColor={Colors.textMuted}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Anonim */}
          <TouchableOpacity
            style={styles.anonymousRow}
            onPress={() => setIsAnonymous(!isAnonymous)}
          >
            <View style={[styles.checkbox, isAnonymous && styles.checkboxActive]}>
              {isAnonymous && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <View>
              <Text style={styles.anonymousLabel}>Anonim olarak gönder</Text>
              <Text style={styles.anonymousDesc}>Adınız mekan tarafından görünmez</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitBtnText}>{submitting ? 'Gönderiliyor...' : 'Değerlendirmeyi Gönder'}</Text>
          </TouchableOpacity>

          <View style={{ height: 80 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Mekan Değerlendir</Text>
        <Text style={styles.subtitle}>Çalıştığınız mekanları değerlendirin ve diğer sanatçılara yol gösterin</Text>
      </View>

      <FlatList
        data={WORKED_VENUES}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.venueCard}
            onPress={() => !item.myReview && setSelectedVenue(item)}
            activeOpacity={item.myReview ? 1 : 0.85}
          >
            <View style={styles.venueLeft}>
              <LinearGradient colors={[Colors.venueColor, '#D97706']} style={styles.venueAvatarBox}>
                <Text style={styles.venueAvatarBoxText}>{item.name.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
              <View>
                <Text style={styles.venueCardName}>{item.name}</Text>
                <Text style={styles.venueCardCity}>{item.city}</Text>
                <Text style={styles.venueCardDate}>Son performans: {item.lastPerformance}</Text>
              </View>
            </View>
            {item.myReview ? (
              <View style={styles.reviewedBadge}>
                <Ionicons name="star" size={12} color={Colors.success} />
                <Text style={styles.reviewedText}>{item.myReview} • Değerlendirdim</Text>
              </View>
            ) : (
              <View style={styles.reviewNowBtn}>
                <Text style={styles.reviewNowText}>Değerlendir</Text>
                <Ionicons name="arrow-forward" size={12} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  backBtn: { marginBottom: Spacing.sm, padding: 4, alignSelf: 'flex-start' },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.sm, lineHeight: 20 },
  venueHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: Spacing.md },
  venueAvatarSmall: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  venueAvatarSmallText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  venueName: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  venueCity: { color: Colors.textMuted, fontSize: FontSize.sm },
  overallBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.artistColor + '22',
    marginHorizontal: Spacing.lg, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.artistColor + '44',
  },
  overallLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  overallValue: { color: Colors.artistColor, fontSize: FontSize.xl, fontWeight: '800' },
  criterionCard: {
    marginHorizontal: Spacing.lg, marginBottom: 12,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  criterionLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: 4 },
  criterionDesc: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: Spacing.md },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  star: {},
  ratingLabel: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '700', marginLeft: 4 },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: 8 },
  commentInput: {
    backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, color: Colors.text, fontSize: FontSize.sm,
    minHeight: 100,
  },
  anonymousRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    padding: Spacing.md, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: Colors.artistColor, borderColor: Colors.artistColor },
  checkmark: {},
  anonymousLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  anonymousDesc: { color: Colors.textMuted, fontSize: FontSize.xs },
  submitBtn: {
    marginHorizontal: Spacing.lg, paddingVertical: 16,
    backgroundColor: Colors.artistColor, borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 80, gap: 12 },
  venueCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  venueLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  venueAvatarBox: {
    width: 52, height: 52, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  venueAvatarBoxText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  venueCardName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: 2 },
  venueCardCity: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: 2 },
  venueCardDate: { color: Colors.textSecondary, fontSize: FontSize.xs },
  reviewedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: Colors.success + '22',
    borderRadius: BorderRadius.full,
  },
  reviewedText: { color: Colors.success, fontSize: FontSize.xs, fontWeight: '600' },
  reviewNowBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: Colors.artistColor,
    borderRadius: BorderRadius.sm,
  },
  reviewNowText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
});
