import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, Modal, Share, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, doc, updateDoc, increment, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { PressableScale } from '../../components/common/PressableScale';

// ERR-TIMELINE-001 Gönderi paylaşılamadı
const ERR = { POST: 'ERR-TIMELINE-001' } as const;

const AVATAR_COLORS: [string, string][] = [
  ['#8B5CF6', '#6D28D9'], ['#EF4444', '#B91C1C'],
  ['#10B981', '#059669'], ['#F59E0B', '#D97706'],
  ['#EC4899', '#BE185D'], ['#06B6D4', '#0891B2'],
];
const getAvatarGrad = (name: string): [string, string] => AVATAR_COLORS[(name.charCodeAt(0) || 65) % AVATAR_COLORS.length];

const TIMELINE_POSTS = [
  {
    id: '1', author: 'Zeynep K.', authorEmoji: '👩', time: '5 dk önce', type: 'review',
    content: 'Dün gece Babylon Club\'daki Jazz Gecesi muhteşemdi! Kerem Görsev inanılmaz bir performans sergiledi.',
    event: 'Jazz Gecesi', venue: 'Babylon Club', rating: 5, likes: 24, comments: 8, liked: false,
  },
  {
    id: '2', author: 'Mehmet A.', authorEmoji: '👨', time: '2 saat önce', type: 'checkin',
    content: 'Zorlu PSM\'deyim! Bu gece Electronic Night var, kim geliyor?',
    event: 'Electronic Night', venue: 'Zorlu PSM', rating: null, likes: 41, comments: 15, liked: true,
  },
  {
    id: '3', author: 'Selin T.', authorEmoji: '👩', time: '5 saat önce', type: 'discovery',
    content: 'Aytaç Doğan\'ı keşfettim ve artık herkese önereceğim. Akustik müziğin böyle icra edilebileceğini bilmiyordum!',
    event: null, venue: null, rating: null, likes: 67, comments: 22, liked: false,
  },
  {
    id: '4', author: 'Can B.', authorEmoji: '🧑', time: 'Dün', type: 'review',
    content: 'IF Performance\'daki Rock Partisi tam anlamıyla efsaneydi. Ses kalitesi ve sahne düzeni kusursuzdu.',
    event: 'Rock Partisi', venue: 'IF Performance', rating: 5, likes: 89, comments: 31, liked: false,
  },
  {
    id: '5', author: 'Ayşe M.', authorEmoji: '👩', time: 'Dün', type: 'invite',
    content: 'Bu cumartesi Salon İKSV\'de Ceza konseri var! Biletler tükeniyor, hemen alın.',
    event: 'Hip-Hop Night', venue: 'Salon İKSV', rating: null, likes: 112, comments: 44, liked: true,
  },
];

const POST_TYPES = [
  { key: 'all',       label: 'Tümü' },
  { key: 'review',    label: 'Yorumlar' },
  { key: 'checkin',   label: 'Check-in' },
  { key: 'discovery', label: 'Keşifler' },
  { key: 'invite',    label: 'Davetler' },
];

const DEMO_COMMENTS: Record<string, { id: string; author: string; authorEmoji: string; text: string; time: string }[]> = {
  '1': [
    { id: 'c1', author: 'Mehmet A.', authorEmoji: '👨', text: 'Kesinlikle katılıyorum, harika bir geceydi!', time: '3 dk önce' },
    { id: 'c2', author: 'Selin T.', authorEmoji: '👩', text: 'Ben de oradaydım, müthişti!', time: '10 dk önce' },
  ],
  '2': [
    { id: 'c3', author: 'Can B.', authorEmoji: '🧑', text: 'Ben de geliyorum bu gece!', time: '1 saat önce' },
    { id: 'c4', author: 'Ayşe M.', authorEmoji: '👩', text: 'Bilet aldım, görüşürüz 🎉', time: '1.5 saat önce' },
    { id: 'c5', author: 'Zeynep K.', authorEmoji: '👩', text: 'Ne saatte başlıyor?', time: '2 saat önce' },
  ],
};

function typeLabel(type: string): string {
  switch (type) {
    case 'review':    return 'Yorum';
    case 'checkin':   return 'Check-in';
    case 'discovery': return 'Keşif';
    case 'invite':    return 'Davet';
    default:          return 'Gönderi';
  }
}

function typeIconName(type: string): React.ComponentProps<typeof Ionicons>['name'] {
  switch (type) {
    case 'review':    return 'star-outline';
    case 'checkin':   return 'location-outline';
    case 'discovery': return 'search-outline';
    case 'invite':    return 'ticket-outline';
    default:          return 'document-text-outline';
  }
}

function chipIconName(key: string): React.ComponentProps<typeof Ionicons>['name'] {
  switch (key) {
    case 'all':       return 'apps-outline';
    case 'review':    return 'star-outline';
    case 'checkin':   return 'location-outline';
    case 'discovery': return 'compass-outline';
    case 'invite':    return 'ticket-outline';
    default:          return 'apps-outline';
  }
}

function typeColor(type: string): string {
  switch (type) {
    case 'review':    return Colors.accent;
    case 'checkin':   return Colors.customerColor;
    case 'discovery': return Colors.primary;
    case 'invite':    return Colors.success;
    default:          return Colors.textSecondary;
  }
}

export default function TimelineScreen({ navigation }: any) {
  const displayName = useAuthStore((s) => s.displayName);
  const userId      = useAuthStore((s) => s.userId);
  const [filter, setFilter] = useState('all');
  const [showPostModal, setShowPostModal] = useState(false);
  const [postText, setPostText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [posts, setPosts] = useState(TIMELINE_POSTS);
  const [commentModal, setCommentModal] = useState<string | null>(null);
  const [comments, setComments] = useState(DEMO_COMMENTS);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'timeline'), orderBy('createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) return; // keep demo data if no real posts
      const loaded = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          author: data.authorName ?? 'Anonim',
          authorEmoji: '',
          time: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('tr-TR') : 'Yakın zamanda',
          type: data.type ?? 'post',
          content: data.content ?? '',
          event: data.event ?? null,
          venue: data.venue ?? null,
          rating: data.rating ?? null,
          likes: data.likes ?? 0,
          comments: data.comments ?? 0,
          liked: false,
        };
      });
      setPosts(loaded);
    }, (err) => console.warn('[Timeline] onSnapshot hatası:', err));
    return () => unsub();
  }, []);

  const openComments = useCallback((postId: string) => {
    setCommentModal(postId);
    setCommentText('');
  }, []);

  const sendComment = useCallback(async () => {
    if (!commentModal) return;
    const text = commentText.trim();
    if (!text) return;
    const newComment = { id: Date.now().toString(), author: displayName ?? 'Ben', authorEmoji: '', text, time: 'Şimdi' };
    setComments((prev) => ({ ...prev, [commentModal]: [newComment, ...(prev[commentModal] ?? [])] }));
    setPosts((prev) => prev.map((p) => p.id === commentModal ? { ...p, comments: p.comments + 1 } : p));
    setCommentText('');
    if (userId && !userId.startsWith('demo_')) {
      try {
        await addDoc(collection(db, 'timeline', commentModal, 'comments'), {
          authorId: userId, authorName: displayName, text, createdAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'timeline', commentModal), { comments: increment(1) });
      } catch { /* optimistic UI already updated */ }
    }
  }, [commentModal, commentText, displayName, userId]);

  const filtered = useMemo(() =>
    filter === 'all' ? posts : posts.filter((p) => p.type === filter),
  [posts, filter]);

  const handleLike = useCallback(async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    const isNowLiked = !post?.liked;
    setPosts((prev) => prev.map((p) =>
      p.id === postId ? { ...p, liked: isNowLiked, likes: isNowLiked ? p.likes + 1 : p.likes - 1 } : p,
    ));
    if (!userId || userId.startsWith('demo_')) return;
    const likeRef = doc(db, 'timeline', postId, 'likes', userId);
    try {
      if (isNowLiked) {
        await setDoc(likeRef, { likedAt: serverTimestamp() });
        await updateDoc(doc(db, 'timeline', postId), { likes: increment(1) });
      } else {
        await deleteDoc(likeRef);
        await updateDoc(doc(db, 'timeline', postId), { likes: increment(-1) });
      }
    } catch { /* optimistic UI already updated */ }
  }, [posts, userId]);

  const handlePost = useCallback(async () => {
    if (postText.trim().length < 5) {
      Alert.alert('Hata', 'Gönderi en az 5 karakter olmalı.');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'timeline'), {
        authorId: userId,
        authorName: displayName,
        content: postText.trim(),
        type: 'post',
        likes: 0,
        comments: 0,
        createdAt: serverTimestamp(),
      });
      const newPost = {
        id: Date.now().toString(),
        author: displayName ?? 'Ben',
        authorEmoji: '',
        time: 'Şimdi',
        type: 'post',
        content: postText.trim(),
        event: null,
        venue: null,
        rating: null,
        likes: 0,
        comments: 0,
        liked: false,
      };
      setPosts((prev) => [newPost, ...prev]);
      setPostText('');
      setShowPostModal(false);
    } catch {
      Alert.alert('Hata', `Gönderi paylaşılamadı. (${ERR.POST})`);
    } finally {
      setSubmitting(false);
    }
  }, [postText, userId, displayName]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Timeline</Text>
        <TouchableOpacity style={styles.postBtn} onPress={() => setShowPostModal(true)}>
          <LinearGradient
            colors={[Colors.primary, Colors.gradientEnd]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          />
          <Ionicons name="add" size={15} color="#fff" />
          <Text style={styles.postBtnText}>Paylaş</Text>
        </TouchableOpacity>
      </View>

      {/* Header alt separator */}
      <LinearGradient
        colors={[Colors.primary + '50', Colors.customerColor + '25', 'transparent']}
        style={styles.headerSeparator}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      />

      {/* Filtre */}
      <FlatList
        horizontal
        data={POST_TYPES}
        keyExtractor={(t) => t.key}
        extraData={filter}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        style={styles.filterScroll}
        renderItem={({ item }) => {
          const isActive = filter === item.key;
          const activeColor = item.key === 'all' ? Colors.primary : typeColor(item.key);
          return (
            <TouchableOpacity
              style={[styles.filterChip, isActive && { backgroundColor: activeColor, borderColor: activeColor }]}
              onPress={() => setFilter(item.key)}
            >
              <View style={styles.filterChipInner}>
                <Ionicons name={chipIconName(item.key)} size={10} color={isActive ? '#fff' : Colors.textSecondary} />
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{item.label}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Gönderiler */}
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        style={styles.feedList}
        contentContainerStyle={styles.feed}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <PressableScale style={styles.postCard} scaleTo={0.98}>
            {/* Sol accent çizgisi */}
            <View style={[styles.accentBar, { backgroundColor: typeColor(item.type) }]} />

            <View style={styles.cardInner}>
              {/* Post header */}
              <View style={styles.postHeader}>
                <LinearGradient colors={[...getAvatarGrad(item.author)]} style={styles.postAvatar}>
                  <Text style={styles.postAvatarText}>{item.author.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
                <View style={styles.postAuthorInfo}>
                  <Text style={styles.postAuthor}>{item.author}</Text>
                  <Text style={styles.postTime}>{item.time}</Text>
                </View>
                <View style={[styles.typeBadge, { backgroundColor: typeColor(item.type) + '22', borderColor: typeColor(item.type) + '55' }]}>
                  <Ionicons name={typeIconName(item.type)} size={10} color={typeColor(item.type)} />
                  <Text style={[styles.typeText, { color: typeColor(item.type) }]}>{typeLabel(item.type)}</Text>
                </View>
              </View>

              {/* Content */}
              <Text style={styles.postContent}>{item.content}</Text>

              {/* Rating */}
              {item.rating && (
                <View style={styles.postRating}>
                  {Array.from({ length: item.rating }).map((_, i) => (
                    <Ionicons key={i} name="star" size={13} color={Colors.accent} />
                  ))}
                </View>
              )}

              {/* Event/Venue tag */}
              {(item.event || item.venue) && (
                <View style={styles.tagRow}>
                  {item.event && (
                    <View style={styles.tag}>
                      <Ionicons name="musical-notes-outline" size={11} color={Colors.primary} />
                      <Text style={styles.tagText}>{item.event}</Text>
                    </View>
                  )}
                  {item.venue && (
                    <TouchableOpacity
                      style={styles.tag}
                      onPress={() => navigation.navigate('VenueDetail', { venue: { id: item.venueId ?? item.venue ?? '', name: item.venue ?? '', city: '', rating: 0, capacity: 0, genre: '' } })}
                    >
                      <Ionicons name="location-outline" size={11} color={Colors.primary} />
                      <Text style={styles.tagText}>{item.venue}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Actions */}
              <View style={styles.postActions}>
                <PressableScale style={styles.actionBtn} scaleTo={0.75} onPress={() => handleLike(item.id)}>
                  <Ionicons
                    name={item.liked ? 'heart' : 'heart-outline'}
                    size={18}
                    color={item.liked ? Colors.error : Colors.textSecondary}
                  />
                  <Text style={[styles.actionCount, item.liked && styles.actionCountLiked]}>
                    {item.likes}
                  </Text>
                </PressableScale>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openComments(item.id)}>
                  <Ionicons name="chatbubble-outline" size={17} color={Colors.textSecondary} />
                  <Text style={styles.actionCount}>{item.comments}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => Share.share({ message: `${item.author}: ${item.content}` })}
                >
                  <Ionicons name="share-outline" size={17} color={Colors.textSecondary} />
                  <Text style={styles.actionCount}>Paylaş</Text>
                </TouchableOpacity>
              </View>
            </View>
          </PressableScale>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="newspaper-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Gönderi yok</Text>
            <Text style={styles.emptyText}>Bu kategoride henüz bir paylaşım bulunmuyor.</Text>
          </View>
        }
      />

      {/* Post Modal */}
      <Modal visible={showPostModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Gönderi</Text>
              <TouchableOpacity onPress={() => setShowPostModal(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalAuthor}>
              <LinearGradient colors={[...getAvatarGrad(displayName ?? 'U')]} style={styles.modalAvatar}>
                <Text style={styles.postAvatarText}>{(displayName ?? 'U').charAt(0).toUpperCase()}</Text>
              </LinearGradient>
              <Text style={styles.modalAuthorName}>{displayName ?? ''}</Text>
            </View>

            <TextInput
              style={styles.postInput}
              placeholder="Ne paylaşmak istiyorsunuz? Etkinlik yorumu, keşif, check-in..."
              placeholderTextColor={Colors.textMuted}
              value={postText}
              onChangeText={setPostText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPostModal(false)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shareBtn, submitting && styles.shareBtnDisabled]}
                onPress={handlePost}
                disabled={submitting}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.gradientEnd]}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
                <Text style={styles.shareBtnText}>{submitting ? 'Paylaşılıyor...' : 'Paylaş'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Yorumlar Modal */}
      <Modal visible={!!commentModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Yorumlar</Text>
                <TouchableOpacity onPress={() => setCommentModal(null)}>
                  <Ionicons name="close" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {(comments[commentModal ?? ''] ?? []).length === 0 ? (
                <View style={styles.noComments}>
                  <Text style={styles.noCommentsText}>Henüz yorum yok. İlk yorumu sen yaz!</Text>
                </View>
              ) : (
                <FlatList
                  data={comments[commentModal ?? ''] ?? []}
                  keyExtractor={(c) => c.id}
                  style={styles.commentList}
                  contentContainerStyle={styles.commentListContent}
                  renderItem={({ item }) => (
                    <View style={styles.commentItem}>
                      <LinearGradient colors={[...getAvatarGrad(item.author)]} style={styles.commentAvatar}>
                        <Text style={styles.commentAvatarText}>{item.author.charAt(0).toUpperCase()}</Text>
                      </LinearGradient>
                      <View style={styles.commentBody}>
                        <View style={styles.commentTop}>
                          <Text style={styles.commentAuthor}>{item.author}</Text>
                          <Text style={styles.commentTime}>{item.time}</Text>
                        </View>
                        <Text style={styles.commentText}>{item.text}</Text>
                      </View>
                    </View>
                  )}
                />
              )}

              <View style={styles.commentInputRow}>
                <LinearGradient colors={[...getAvatarGrad(displayName ?? 'U')]} style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>{(displayName ?? 'U').charAt(0).toUpperCase()}</Text>
                </LinearGradient>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Yorum yaz..."
                  placeholderTextColor={Colors.textMuted}
                  value={commentText}
                  onChangeText={setCommentText}
                  onSubmitEditing={sendComment}
                  returnKeyType="send"
                />
                <TouchableOpacity style={styles.commentSendBtn} onPress={sendComment}>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm,
  },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800' },
  postBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  postBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
  headerSeparator: { height: 1, marginBottom: Spacing.md },
  filterScroll: { marginBottom: Spacing.md, flexGrow: 0 },
  filterList: { paddingHorizontal: Spacing.lg, gap: 8, paddingVertical: 4, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    alignSelf: 'flex-start',
  },
  filterChipInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  filterText: { color: Colors.textSecondary, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  feedList: { flex: 1 },
  feed: { paddingHorizontal: Spacing.lg, paddingBottom: 110, gap: 12 },

  /* Post card */
  postCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  accentBar: { width: 4 },
  cardInner: { flex: 1, padding: Spacing.md },

  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  postAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  postAvatarText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  postAuthorInfo: { flex: 1 },
  postAuthor: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  postTime: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 1 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  typeText: { fontSize: FontSize.xs, fontWeight: '600' },
  postContent: { color: Colors.text, fontSize: FontSize.md, lineHeight: 22, marginBottom: 10 },
  postRating: { flexDirection: 'row', gap: 2, marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: Colors.primary + '18',
    borderRadius: BorderRadius.full,
  },
  tagText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' },

  /* Actions */
  postActions: {
    flexDirection: 'row', gap: 20,
    paddingTop: 10, marginTop: 2,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { color: Colors.textSecondary, fontSize: FontSize.sm },
  actionCountLiked: { color: Colors.error },

  /* Empty */
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.xl },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },

  /* Modals */
  commentList: { maxHeight: 280 },
  commentListContent: { gap: 10, paddingVertical: Spacing.sm },
  kav: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  modalAuthor: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.md },
  modalAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  modalAuthorName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  postInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, color: Colors.text,
    fontSize: FontSize.md, minHeight: 120,
    marginBottom: Spacing.lg,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
  },
  cancelBtnText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
  shareBtn: {
    flex: 2, paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center', overflow: 'hidden',
  },
  shareBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  shareBtnDisabled: { opacity: 0.6 },
  noComments: { alignItems: 'center', paddingVertical: 24 },
  noCommentsText: { color: Colors.textMuted, fontSize: FontSize.sm },
  commentItem: { flexDirection: 'row', gap: 10 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  commentAvatarText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  commentBody: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.md, padding: 10 },
  commentTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commentAuthor: { color: Colors.text, fontSize: FontSize.xs, fontWeight: '700' },
  commentTime: { color: Colors.textMuted, fontSize: 10 },
  commentText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 18 },
  commentInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border,
    marginTop: Spacing.sm,
  },
  commentInput: {
    flex: 1, backgroundColor: Colors.surfaceAlt,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 9,
    color: Colors.text, fontSize: FontSize.sm,
  },
  commentSendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});
