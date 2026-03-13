import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SkeletonConversation } from '../../components/SkeletonLoader';
import {
  collection, doc, addDoc, updateDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, getDoc, setDoc,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';

// ERR-MSG-001 Mesaj gönderme hatası   ERR-MSG-002 Okundu işaretleme hatası
const ERR = {
  SEND_MESSAGE: 'ERR-MSG-001',
  MARK_READ:    'ERR-MSG-002',
} as const;

const ARTIST_EMOJIS = new Set(['🎤', '🎧', '🎸', '🎹', '🎵', '🎻', '🥁']);
const VENUE_EMOJIS = new Set(['🏢', '🏛️', '🏗️']);

function getConvColors(emoji: string): [string, string] {
  if (ARTIST_EMOJIS.has(emoji)) return [Colors.artistColor, Colors.primaryDark];
  if (VENUE_EMOJIS.has(emoji)) return [Colors.venueColor, '#0A7A9E'];
  return [Colors.customerColor, '#0369A1'];
}

interface Conversation {
  id: string;
  otherUserId: string;
  otherName: string;
  otherEmoji: string;
  lastMessage: string;
  lastMessageTime: any;
  unread: number;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
}

const DEMO_CONVERSATIONS: Conversation[] = [
  { id: 'demo_conv1', otherUserId: 'demo_dj1', otherName: 'DJ Berkay', otherEmoji: '🎧', lastMessage: 'Etkinlik için müsaitim, detayları konuşalım!', lastMessageTime: { toDate: () => new Date(Date.now() - 3600000) }, unread: 2 },
  { id: 'demo_conv2', otherUserId: 'demo_venue1', otherName: 'Babylon Club', otherEmoji: '🏢', lastMessage: 'Cumartesi gecesi için davetinizi aldık.', lastMessageTime: { toDate: () => new Date(Date.now() - 86400000) }, unread: 0 },
  { id: 'demo_conv3', otherUserId: 'demo_artist1', otherName: 'Kerem Görsev', otherEmoji: '🎹', lastMessage: 'Jazz setim için hazırlıkları tamamladım.', lastMessageTime: { toDate: () => new Date(Date.now() - 172800000) }, unread: 1 },
];

const DEMO_MESSAGES: Record<string, Message[]> = {
  demo_conv1: [
    { id: 'm1', text: 'Merhaba, 15 Mart\'ta etkinliğimiz için müsait misiniz?', senderId: 'demo_venue', createdAt: { toDate: () => new Date(Date.now() - 7200000) } },
    { id: 'm2', text: 'Evet müsaitim! Saat kaçta başlayacak?', senderId: 'demo_dj1', createdAt: { toDate: () => new Date(Date.now() - 6000000) } },
    { id: 'm3', text: 'Saat 22:00\'da başlayacak, 4 saatlik set düşünüyoruz.', senderId: 'demo_venue', createdAt: { toDate: () => new Date(Date.now() - 5400000) } },
    { id: 'm4', text: 'Etkinlik için müsaitim, detayları konuşalım!', senderId: 'demo_dj1', createdAt: { toDate: () => new Date(Date.now() - 3600000) } },
  ],
  demo_conv2: [
    { id: 'm5', text: 'Merhaba, gelecek ay için randevu almak istiyorum.', senderId: 'demo_customer', createdAt: { toDate: () => new Date(Date.now() - 90000000) } },
    { id: 'm6', text: 'Cumartesi gecesi için davetinizi aldık.', senderId: 'demo_venue1', createdAt: { toDate: () => new Date(Date.now() - 86400000) } },
  ],
  demo_conv3: [
    { id: 'm7', text: 'Bu haftaki etkinlik için hazırlıklarınız nasıl?', senderId: 'demo_venue', createdAt: { toDate: () => new Date(Date.now() - 200000000) } },
    { id: 'm8', text: 'Jazz setim için hazırlıkları tamamladım.', senderId: 'demo_artist1', createdAt: { toDate: () => new Date(Date.now() - 172800000) } },
  ],
};

function formatTime(ts: any): string {
  if (!ts) return '';
  const date = ts.toDate?.() ?? new Date(ts);
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function formatConvTime(ts: any): string {
  if (!ts) return '';
  const date = ts.toDate?.() ?? new Date(ts);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 86400000) return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  if (diff < 172800000) return 'Dün';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export default function MessagesScreen({ navigation, route }: any) {
  const userId      = useAuthStore((s) => s.userId);
  const displayName = useAuthStore((s) => s.displayName);
  const userType    = useAuthStore((s) => s.userType);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const isDemo = userId?.startsWith('demo_') ?? false;

  // Konuşma listesini dinle
  useEffect(() => {
    if (!userId) return;
    if (isDemo) {
      setConversations(DEMO_CONVERSATIONS);
      setLoadingConvs(false);
      return;
    }
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTime', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const convs: Conversation[] = snap.docs.map((d) => {
        const data = d.data();
        const otherUserId = data.participants.find((p: string) => p !== userId) ?? '';
        return {
          id: d.id,
          otherUserId,
          otherName: data.participantNames?.[otherUserId] ?? 'Kullanıcı',
          otherEmoji: data.participantEmojis?.[otherUserId] ?? '👤',
          lastMessage: data.lastMessage ?? '',
          lastMessageTime: data.lastMessageTime,
          unread: data.unreadCount?.[userId] ?? 0,
        };
      });
      setConversations(convs);
      setLoadingConvs(false);
    });
    return unsub;
  }, [userId]);

  // route.params ile doğrudan konuşma açılabilir
  useEffect(() => {
    if (route?.params?.recipientName && userId) {
      setSelectedConv({
        id: '',
        otherUserId: route.params.recipientId ?? '',
        otherName: route.params.recipientName,
        otherEmoji: '👤',
        lastMessage: '',
        lastMessageTime: null,
        unread: 0,
      });
    }
  }, [route?.params?.recipientName, route?.params?.recipientId, userId]);

  // Seçili konuşmanın mesajlarını dinle
  useEffect(() => {
    if (!selectedConv?.id) return;
    if (isDemo) {
      setMessages(DEMO_MESSAGES[selectedConv.id] ?? []);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }
    const q = query(
      collection(db, 'conversations', selectedConv.id, 'messages'),
      orderBy('createdAt', 'asc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    // Okundu olarak işaretle
    if (userId) {
      updateDoc(doc(db, 'conversations', selectedConv.id), {
        [`unreadCount.${userId}`]: 0,
      }).catch(() => console.warn(`[${ERR.MARK_READ}] Okundu işaretlenemedi.`));
    }

    return unsub;
  }, [selectedConv?.id]);

  const openConversation = useCallback((conv: Conversation) => {
    setMessages([]);
    setSelectedConv(conv);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = messageText.trim();
    if (!text || !userId) return;
    setMessageText('');
    if (isDemo) {
      const newMsg: Message = { id: Date.now().toString(), text, senderId: userId, createdAt: { toDate: () => new Date() } };
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    try {
      let convId = selectedConv?.id;

      // Yeni konuşma oluştur (id yoksa)
      if (!convId && selectedConv?.otherUserId) {
        const convRef = doc(collection(db, 'conversations'));
        await setDoc(convRef, {
          participants: [userId, selectedConv.otherUserId],
          participantNames: {
            [userId]: displayName ?? 'Ben',
            [selectedConv.otherUserId]: selectedConv.otherName,
          },
          participantEmojis: {
            [userId]: userType === 'artist' ? '🎤' : userType === 'venue' ? '🏢' : '👤',
            [selectedConv.otherUserId]: selectedConv.otherEmoji,
          },
          lastMessage: text,
          lastMessageTime: serverTimestamp(),
          unreadCount: { [selectedConv.otherUserId]: 1, [userId]: 0 },
        });
        convId = convRef.id;
        setSelectedConv((prev) => prev ? { ...prev, id: convRef.id } : prev);
      }

      if (!convId) return;

      // Mesajı ekle
      await addDoc(collection(db, 'conversations', convId, 'messages'), {
        senderId: userId,
        text,
        createdAt: serverTimestamp(),
      });

      // Konuşma özetini güncelle
      await updateDoc(doc(db, 'conversations', convId), {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        [`unreadCount.${selectedConv?.otherUserId}`]:
          (selectedConv?.unread ?? 0) + 1,
      });
    } catch {
      console.warn(`[${ERR.SEND_MESSAGE}] Mesaj gönderilemedi.`);
    }
  }, [userId, displayName, userType, selectedConv, messageText]);


  // Sohbet ekranı
  if (selectedConv) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setSelectedConv(null)} style={styles.chatBack}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.chatAvatar}>
            <LinearGradient colors={[...getConvColors(selectedConv.otherEmoji)]} style={styles.chatAvatarGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.chatAvatarInitial}>{selectedConv.otherName.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
          </View>
          <View>
            <Text style={styles.chatName}>{selectedConv.otherName}</Text>
            <Text style={styles.chatStatus}>GigBridge</Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <View style={styles.emptyChatWrap}>
              <Text style={styles.emptyChatText}>Sohbeti başlatmak için mesaj gönderin.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.senderId === userId;
            return (
              <View style={[styles.messageRow, isMe ? styles.messageRowRight : styles.messageRowLeft]}>
                <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
                  <Text style={[styles.messageText, isMe && styles.myMessageText]}>{item.text}</Text>
                  <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>{formatTime(item.createdAt)}</Text>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.messageInput}
            placeholder="Mesaj yazın..."
            placeholderTextColor={Colors.textMuted}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Konuşma listesi
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mesajlar</Text>
        <Text style={styles.subtitle}>{displayName ?? ''}</Text>
      </View>

      {loadingConvs ? (
        <View style={styles.convList}>
          {[1, 2, 3, 4].map((i) => <SkeletonConversation key={i} />)}
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.convList}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.convCard} onPress={() => openConversation(item)}>
              <View style={styles.convAvatar}>
                <LinearGradient colors={[...getConvColors(item.otherEmoji)]} style={styles.convAvatarGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.convAvatarInitial}>{item.otherName.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
              </View>
              <View style={styles.convInfo}>
                <View style={styles.convTop}>
                  <Text style={styles.convName}>{item.otherName}</Text>
                  <Text style={styles.convTime}>{formatConvTime(item.lastMessageTime)}</Text>
                </View>
                <View style={styles.convBottom}>
                  <Text style={styles.convLastMessage} numberOfLines={1}>{item.lastMessage}</Text>
                  {item.unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.textMuted} style={styles.emptyIcon} />
              <Text style={styles.emptyText}>Henüz mesajınız yok.</Text>
              <Text style={styles.emptySubText}>Sanatçı veya mekan profilinden mesaj başlatabilirsiniz.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.sm },
  convList: { paddingHorizontal: Spacing.lg, paddingBottom: 80 },
  convCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  convAvatar: {
    width: 52, height: 52, borderRadius: 26,
    overflow: 'hidden',
  },
  convAvatarGrad: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  convAvatarInitial: { fontSize: 22, fontWeight: '900', color: '#fff' },
  convInfo: { flex: 1 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  convName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  convTime: { color: Colors.textMuted, fontSize: FontSize.xs },
  convBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convLastMessage: { color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1 },
  unreadBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chatBack: { padding: 4 },
  chatAvatar: {
    width: 40, height: 40, borderRadius: 20,
    overflow: 'hidden',
  },
  chatAvatarGrad: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  chatAvatarInitial: { fontSize: 18, fontWeight: '900', color: '#fff' },
  chatName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  chatStatus: { color: Colors.textMuted, fontSize: FontSize.xs },
  messageList: { padding: Spacing.lg, gap: 10, flexGrow: 1 },
  emptyChatWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyChatText: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center' },
  messageRow: { flexDirection: 'row' },
  messageRowRight: { justifyContent: 'flex-end' },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageBubble: {
    maxWidth: '75%',
    padding: Spacing.md,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  myBubble: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  theirBubble: { borderBottomLeftRadius: 4 },
  messageText: { color: Colors.text, fontSize: FontSize.sm, lineHeight: 20 },
  myMessageText: { color: '#fff' },
  messageTime: { color: Colors.textMuted, fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  myMessageTime: { color: 'rgba(255,255,255,0.7)' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  messageInput: {
    flex: 1, backgroundColor: Colors.surfaceAlt,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 10,
    color: Colors.text, fontSize: FontSize.sm,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md, marginBottom: 8 },
  emptySubText: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', paddingHorizontal: 40 },
  emptyIcon: { marginBottom: 16 },
});
