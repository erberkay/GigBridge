import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  TextInput, Image, ImageBackground, useWindowDimensions,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { collection, query, where, onSnapshot, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { PressableScale } from '../../components/common/PressableScale';

// ─── Colors (GigBridge tema — mor) ───────────────────────────────────────────
const C = {
  bg:         '#08080E',
  card:       '#0F0F1A',
  cardBorder: '#232338',
  teal:       '#A855F7',
  tealDim:    '#A855F722',
  tealBorder: '#A855F744',
  text:       '#F2F2F8',
  textSub:    '#8A8AA8',
  textMuted:  '#4E4E6A',
  red:        '#EF4444',
  redDim:     '#EF444422',
  amber:      '#F59E0B',
  surface:    '#161623',
  divider:    '#232338',
};

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface DisplayEvent {
  id: string;
  title: string;
  venue: string;
  artist: string;
  date: string;
  time: string;
  genres: string[];
  attendees: number;
  price: string;
  isHot: boolean;
  isNew: boolean;
  isTrending: boolean;
  isSoldOut?: boolean;
  isExclusive?: boolean;
  banner?: any;
  distanceKm?: number;
  location?: { lat: number; lng: number };
}

function calcDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const HERO_EVENTS: DisplayEvent[] = [
  { id: 'h1', title: 'Electronic Night Vol.12', venue: 'Zorlu PSM', artist: 'Kolsch', date: 'Cum, May 30', time: '22:00', genres: ['TECHNO', 'HOUSE'], attendees: 2000, price: '₺150', isHot: true, isNew: false, isTrending: true, banner: require('../../assets/banner_electronic.png') },
  { id: 'h2', title: 'Hip-Hop Showcase', venue: 'Babylon Club', artist: 'Ceza & Model', date: 'Cum, Haz 06', time: '21:30', genres: ['HIP-HOP', 'RAP'], attendees: 600, price: '₺180', isHot: true, isNew: false, isTrending: false, banner: require('../../assets/banner_hiphop.png') },
  { id: 'h3', title: 'Rock Gecesi', venue: 'IF Performance', artist: 'Duman Tribute', date: 'Paz, Haz 01', time: '20:00', genres: ['ROCK', 'ALTERNATIVE'], attendees: 500, price: '₺200', isHot: true, isNew: false, isTrending: false, banner: require('../../assets/banner_rock.png') },
  { id: 'h4', title: 'Jazz Gecesi', venue: 'Babylon Club', artist: 'Kerem Görsev', date: 'Bugün', time: '21:00', genres: ['JAZZ'], attendees: 124, price: 'Ücretsiz', isHot: false, isNew: true, isTrending: false, banner: require('../../assets/banner_jazz.png') },
];

const TOP10: DisplayEvent[] = [
  { id: 't1', title: 'Electronic Night Vol.12', venue: 'Zorlu PSM', artist: 'Kolsch', date: 'Cum, May 30', time: '22:00', genres: ['TECHNO', 'HOUSE'], attendees: 2000, price: '₺150', isHot: true, isNew: false, isTrending: true, banner: require('../../assets/banner_electronic.png') },
  { id: 't2', title: 'Deep House Set', venue: 'Klein Club', artist: 'DJ Berkay', date: 'Cts, May 31', time: '23:00', genres: ['HOUSE', 'MELODIC'], attendees: 450, price: '₺120', isHot: false, isNew: false, isTrending: true, banner: require('../../assets/banner_deephouse.png') },
  { id: 't3', title: 'Jazz Gecesi', venue: 'Babylon Club', artist: 'Kerem Görsev', date: 'Bugün', time: '21:00', genres: ['JAZZ'], attendees: 124, price: 'Ücretsiz', isHot: false, isNew: true, isTrending: false, banner: require('../../assets/banner_jazz.png') },
  { id: 't4', title: 'Hip-Hop Showcase', venue: 'Babylon Club', artist: 'Ceza & Model', date: 'Cum, Haz 06', time: '21:30', genres: ['HIP-HOP', 'RAP'], attendees: 600, price: '₺180', isHot: true, isNew: false, isTrending: false, banner: require('../../assets/banner_hiphop.png') },
  { id: 't5', title: 'Rock Gecesi', venue: 'IF Performance', artist: 'Duman Tribute', date: 'Paz, Haz 01', time: '20:00', genres: ['ROCK', 'ALTERNATIVE'], attendees: 500, price: '₺200', isHot: true, isNew: false, isTrending: false, banner: require('../../assets/banner_rock.png') },
];

const YENI_EVENTS: DisplayEvent[] = [
  { id: 'y1', title: 'R&B Night Sessions', venue: 'Nardis', artist: 'Merve Özbey', date: 'Per, Haz 05', time: '21:00', genres: ['R&B', 'SOUL'], attendees: 180, price: '₺100', isHot: false, isNew: true, isTrending: false, banner: require('../../assets/banner_rnb.png') },
  { id: 'y2', title: 'Akustik Akşam', venue: 'Nardis', artist: 'Aytaç Doğan', date: 'Cts, Haz 07', time: '20:30', genres: ['AKUSTİK', 'FOLK'], attendees: 80, price: '₺80', isHot: false, isNew: true, isTrending: false, banner: require('../../assets/banner_acoustic.png') },
  { id: 'y3', title: 'Pop Gala İstanbul', venue: 'Zorlu PSM', artist: 'Sıla Şahin', date: 'Paz, Haz 08', time: '20:00', genres: ['POP'], attendees: 800, price: '₺250', isHot: false, isNew: true, isTrending: false, banner: require('../../assets/banner_pop.png') },
  { id: 'y4', title: 'Melodic Techno Night', venue: 'Klein Club', artist: 'DJ Armin', date: 'Cum, Haz 13', time: '23:00', genres: ['MELODIC', 'TECHNO'], attendees: 350, price: '₺160', isHot: false, isNew: true, isTrending: false, banner: require('../../assets/banner_electronic.png') },
];

const SADECE_EVENTS: DisplayEvent[] = [
  { id: 'ex1', title: 'Exclusive: Deep Sessions', venue: 'Klein Club', artist: 'DJ Berkay', date: 'Cum, Haz 06', time: '00:00', genres: ['DEEP HOUSE'], attendees: 200, price: '₺220', isHot: false, isNew: false, isTrending: false, isExclusive: true, isSoldOut: false, banner: require('../../assets/banner_deephouse.png') },
  { id: 'ex2', title: 'Exclusive: Acoustic Sessions', venue: 'Nardis', artist: 'Kerem Görsev', date: 'Cts, Haz 07', time: '20:00', genres: ['JAZZ', 'AKUSTİK'], attendees: 60, price: '₺300', isHot: false, isNew: false, isTrending: false, isExclusive: true, isSoldOut: true, banner: require('../../assets/banner_acoustic.png') },
  { id: 'ex3', title: 'VIP: Electronic Night', venue: 'Zorlu PSM', artist: 'Kolsch', date: 'Cum, May 30', time: '22:00', genres: ['TECHNO'], attendees: 100, price: '₺500', isHot: false, isNew: false, isTrending: false, isExclusive: true, isSoldOut: false, banner: require('../../assets/banner_electronic.png') },
];

const BU_HAFTA_EVENTS: DisplayEvent[] = [
  { id: 'w1', title: 'Pop Gala İstanbul', venue: 'Zorlu PSM', artist: 'Sıla Şahin', date: 'Bugün', time: '20:00', genres: ['POP'], attendees: 800, price: '₺250', isHot: true, isNew: false, isTrending: true, banner: require('../../assets/banner_pop.png') },
  { id: 'w2', title: 'Rock Gecesi', venue: 'IF Performance', artist: 'Duman Tribute', date: 'Yarın', time: '20:00', genres: ['ROCK'], attendees: 500, price: '₺200', isHot: true, isNew: false, isTrending: false, banner: require('../../assets/banner_rock.png') },
  { id: 'w3', title: 'R&B Night Sessions', venue: 'Nardis', artist: 'Merve Özbey', date: 'Per', time: '21:00', genres: ['R&B', 'SOUL'], attendees: 180, price: '₺100', isHot: false, isNew: true, isTrending: false, banner: require('../../assets/banner_rnb.png') },
  { id: 'w4', title: 'Hip-Hop Showcase', venue: 'Babylon', artist: 'Ceza & Model', date: 'Cum', time: '21:30', genres: ['HIP-HOP'], attendees: 600, price: '₺180', isHot: true, isNew: false, isTrending: false, banner: require('../../assets/banner_hiphop.png') },
];

const POPULAR_ARTISTS = [
  { id: 'a1', name: 'DJ Berkay', genre: 'Electronic', followers: '2.4K', photo: require('../../assets/dj_berkay.jpg'), following: false },
  { id: 'a2', name: 'DJ Armin', genre: 'Trance', followers: '12K', photo: require('../../assets/artist_dj.png'), following: true },
  { id: 'a3', name: 'Kerem Görsev', genre: 'Jazz', followers: '8K', photo: require('../../assets/artist_pianist.png'), following: false },
  { id: 'a4', name: 'Koray Avcı', genre: 'Pop Rock', followers: '45K', photo: require('../../assets/artist_guitarist.png'), following: false },
  { id: 'a5', name: 'Merve Özbey', genre: 'Pop', followers: '32K', photo: require('../../assets/artist_vocalist.png'), following: true },
];

const CATEGORIES: { icon: IoniconName; label: string }[] = [
  { icon: 'grid-outline',       label: 'TÜMÜ' },
  { icon: 'ticket-outline',     label: 'ETKİNLİKLER' },
  { icon: 'business-outline',   label: 'MEKANLAR' },
  { icon: 'sunny-outline',      label: 'FESTİVALLER' },
  { icon: 'mic-outline',        label: 'SANATÇILAR' },
  { icon: 'newspaper-outline',  label: 'MAGAZİN' },
];

const CITIES = ['TÜMÜ', 'İstanbul', 'İzmir', 'Ankara', 'Bodrum', 'Çeşme'];

// ─── Genre pills ──────────────────────────────────────────────────────────────

function GenrePills({ genres }: { genres: string[] }) {
  const show = genres.slice(0, 2);
  const extra = genres.length - 2;
  return (
    <View style={gp.row}>
      {show.map((g) => (
        <View key={g} style={gp.pill}>
          <Text style={gp.text}>{g}</Text>
        </View>
      ))}
      {extra > 0 && (
        <View style={gp.extraPill}>
          <Text style={gp.extraText}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}
const gp = StyleSheet.create({
  row:       { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  pill:      { borderWidth: 1, borderColor: C.textSub, borderRadius: 3, paddingHorizontal: 7, paddingVertical: 2 },
  text:      { color: C.textSub, fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  extraPill: { borderWidth: 1, borderColor: C.tealBorder, borderRadius: 3, paddingHorizontal: 7, paddingVertical: 2 },
  extraText: { color: C.teal, fontSize: 9, fontWeight: '700' },
});

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ event }: { event: DisplayEvent }) {
  if (event.isSoldOut) return (
    <View style={[sb.badge, sb.soldOut]}>
      <Text style={[sb.text, sb.soldOutText]}>Bekleme Listesine Katıl!</Text>
    </View>
  );
  if (event.isExclusive) return (
    <View style={[sb.badge, sb.exclusive]}>
      <Ionicons name="star" size={9} color={C.amber} />
      <Text style={[sb.text, sb.exclusiveText]}>SADECE GİGBRİDGE'DE</Text>
    </View>
  );
  if (event.isHot) return (
    <View style={[sb.badge, sb.hot]}>
      <Text style={sb.text}>HOT TICKET</Text>
    </View>
  );
  if (event.isTrending) return (
    <View style={[sb.badge, sb.trending]}>
      <Ionicons name="trending-up" size={9} color={C.teal} />
      <Text style={[sb.text, sb.trendingText]}>ŞİMDİ POPÜLER</Text>
    </View>
  );
  if (event.isNew) return (
    <View style={[sb.badge, sb.newBadge]}>
      <Text style={[sb.text, sb.newText]}>YENİ</Text>
    </View>
  );
  return null;
}
const sb = StyleSheet.create({
  badge:         { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', borderRadius: 3, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 8 },
  text:          { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, color: '#fff' },
  hot:           { backgroundColor: C.red },
  trending:      { backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: '#A855F788' },
  trendingText:  { color: '#D8B4FE' },
  newBadge:      { backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: '#7C3AED99' },
  newText:       { color: '#C4B5FD' },
  soldOut:       { backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  soldOutText:   { color: '#E2E8F0' },
  exclusive:     { backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: '#F5A62388' },
  exclusiveText: { color: C.amber },
});

// ─── Hero Carousel ────────────────────────────────────────────────────────────

function HeroCarousel({ events, onPress, width }: {
  events: DisplayEvent[]; onPress: (e: DisplayEvent) => void;
  width: number;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList<DisplayEvent>>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAuto = useCallback(() => {
    autoRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % events.length;
        flatRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
  }, [events.length]);

  useEffect(() => {
    startAuto();
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [startAuto]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(idx);
  }, [width]);

  const onTouchStart = useCallback(() => {
    if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null; }
  }, []);
  const onTouchEnd = useCallback(() => { startAuto(); }, [startAuto]);

  return (
    <View style={hero.wrap}>
      <FlatList
        ref={flatRef}
        data={events}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        renderItem={({ item }) => {
          const isFree = item.price === 'Ücretsiz';
          return (
            <PressableScale style={[hero.slide, { width }]} onPress={() => onPress(item)} scaleTo={0.99}>
              <ImageBackground source={item.banner} style={hero.img} imageStyle={hero.imgStyle}>
                <LinearGradient
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(8,8,14,0.75)', 'rgba(8,8,14,0.97)'] as const}
                  style={StyleSheet.absoluteFill}
                />
                <View style={hero.content}>
                  <StatusBadge event={item} />
                  <Text style={hero.title} numberOfLines={2}>{item.title}</Text>
                  <Text style={hero.sub} numberOfLines={1}>{item.artist} · {item.venue}</Text>
                  <View style={hero.meta}>
                    <View style={hero.metaPill}>
                      <Ionicons name="calendar-outline" size={11} color={C.textSub} />
                      <Text style={hero.metaText}>{item.date} · {item.time}</Text>
                    </View>
                    {item.distanceKm != null && (
                      <View style={hero.distPill}>
                        <Ionicons name="navigate" size={10} color={C.teal} />
                        <Text style={hero.distText}>
                          {item.distanceKm < 1 ? `${Math.round(item.distanceKm * 1000)}m` : `${item.distanceKm.toFixed(1)}km`}
                        </Text>
                      </View>
                    )}
                    <GenrePills genres={item.genres} />
                  </View>
                  <View style={hero.footer}>
                    <Text style={[hero.price, isFree && hero.priceFree]}>{item.price}</Text>
                  </View>
                </View>
              </ImageBackground>
            </PressableScale>
          );
        }}
      />
      {/* Pagination dots */}
      <View style={hero.dots}>
        {events.map((_, i) => (
          <View key={i} style={[hero.dot, i === activeIndex && hero.dotActive]} />
        ))}
      </View>
    </View>
  );
}
const hero = StyleSheet.create({
  wrap:         { marginBottom: 4 },
  slide:        { overflow: 'hidden' },
  img:          { height: 320, justifyContent: 'flex-end' },
  imgStyle:     { resizeMode: 'cover' },
  content:      { padding: 20, paddingBottom: 24 },
  title:        { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 5, letterSpacing: -0.4 },
  sub:          { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 12 },
  meta:         { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  metaPill:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  metaText:     { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  footer:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price:        { color: C.amber, fontSize: 18, fontWeight: '900' },
  priceFree:    { color: '#4ADE80' },

  distPill:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(168,85,247,0.2)', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  distText:     { color: C.teal, fontSize: 11, fontWeight: '600' },
  dots:         { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 12, paddingBottom: 4 },
  dot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: C.cardBorder },
  dotActive:    { width: 18, backgroundColor: C.teal },
});

// ─── TOP 10 Card ──────────────────────────────────────────────────────────────

function Top10Card({ event, rank, onPress }: {
  event: DisplayEvent; rank: number; onPress: () => void;
}) {
  const isFree = event.price === 'Ücretsiz';
  return (
    <PressableScale style={styles.top10Card} onPress={onPress} scaleTo={0.97}>
      <ImageBackground source={event.banner} style={styles.top10Banner} imageStyle={styles.top10BannerImg}>
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(10,11,14,0.6)', 'rgba(10,11,14,0.96)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.top10RankWrap}>
          <Text style={styles.top10Rank}>{rank}</Text>
        </View>
        <View style={styles.top10Body}>
          <StatusBadge event={event} />
          <Text style={styles.top10Title} numberOfLines={1}>{event.title}</Text>
          <Text style={styles.top10Sub} numberOfLines={1}>{event.artist} · {event.venue}</Text>
          <View style={styles.top10Meta}>
            <View style={styles.datePill}>
              <Ionicons name="calendar-outline" size={10} color={C.textMuted} />
              <Text style={styles.datePillText}>{event.date} · {event.time}</Text>
            </View>
            {event.distanceKm != null && (
              <View style={styles.distPill}>
                <Ionicons name="navigate" size={9} color={C.teal} />
                <Text style={styles.distText}>
                  {event.distanceKm < 1
                    ? `${Math.round(event.distanceKm * 1000)}m`
                    : `${event.distanceKm.toFixed(1)}km`}
                </Text>
              </View>
            )}
          </View>
          <GenrePills genres={event.genres} />
          <View style={styles.top10Footer}>
            <Text style={[styles.priceLabel, isFree && styles.priceLabelFree]}>{event.price}</Text>
          </View>
        </View>
      </ImageBackground>
    </PressableScale>
  );
}

// ─── Regular Event Card ───────────────────────────────────────────────────────

function EventCard({ event, onPress }: {
  event: DisplayEvent; onPress: () => void;
}) {
  const isFree = event.price === 'Ücretsiz';
  return (
    <PressableScale style={styles.eventCard} onPress={onPress} scaleTo={0.97}>
      <ImageBackground source={event.banner} style={styles.eventBanner} imageStyle={styles.eventBannerImg}>
        <LinearGradient
          colors={['transparent', 'transparent', 'rgba(8,8,14,0.85)', 'rgba(8,8,14,0.98)'] as const}
          style={StyleSheet.absoluteFill}
        />
        {(event.isHot || event.isNew || event.isTrending || event.isSoldOut || event.isExclusive) && (
          <View style={styles.eventBadgeAbs}>
            <StatusBadge event={event} />
          </View>
        )}
        <View style={styles.eventBody}>
          <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
          <Text style={styles.eventSub} numberOfLines={1}>{event.artist}</Text>
          <GenrePills genres={event.genres} />
          <View style={styles.eventFooter}>
            <View style={styles.eventDateRow}>
              <Ionicons name="calendar-outline" size={10} color="rgba(255,255,255,0.6)" />
              <Text style={styles.eventDateText}>{event.date}</Text>
            </View>
            <View style={[styles.eventPricePill, isFree && styles.eventPricePillFree]}>
              <Text style={[styles.eventPriceText, isFree && styles.eventPriceTextFree]}>{event.price}</Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </PressableScale>
  );
}

// ─── Artist Card ──────────────────────────────────────────────────────────────

function ArtistCard({ artist, onFollow, onPress }: {
  artist: typeof POPULAR_ARTISTS[0];
  onFollow: () => void;
  onPress: () => void;
}) {
  return (
    <PressableScale style={styles.artistCard} onPress={onPress} scaleTo={0.95}>
      {artist.photo
        ? <Image source={artist.photo} style={styles.artistPhoto} />
        : <LinearGradient colors={['#A855F7', '#6D28D9']} style={styles.artistPhoto}>
            <Text style={styles.artistPhotoInitial}>{artist.name.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
      }
      <View style={styles.artistInfo}>
        <Text style={styles.artistName} numberOfLines={1}>{artist.name}</Text>
        <Text style={styles.artistGenre}>{artist.genre}</Text>
        <Text style={styles.artistFollowers}>{artist.followers} takipçi</Text>
      </View>
      <TouchableOpacity onPress={onFollow} style={[styles.followBtn, artist.following && styles.followBtnActive]} activeOpacity={0.7}>
        <Text style={[styles.followBtnText, artist.following && styles.followBtnTextActive]}>
          {artist.following ? 'TAKİP' : 'TAKİP ET'}
        </Text>
      </TouchableOpacity>
    </PressableScale>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, onSeeAll }: {
  title: string; subtitle?: string; onSeeAll?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccentBar} />
      <View style={styles.sectionTitleWrap}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={styles.seeAllBtn} activeOpacity={0.7}>
          <Text style={styles.seeAllText}>TÜMÜ</Text>
          <Ionicons name="chevron-forward" size={12} color={C.teal} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CustomerHomeScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const displayName = useAuthStore((s) => s.displayName);
  const userId      = useAuthStore((s) => s.userId);

  const [searchText, setSearchText]         = useState('');
  const [searchFocused, setSearchFocused]   = useState(false);
  const [activeCategory, setActiveCategory] = useState('TÜMÜ');
  const [activeCity, setActiveCity]         = useState('İstanbul');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [followStates, setFollowStates]     = useState<Record<string, boolean>>({});
  const [liveArtists, setLiveArtists]       = useState(POPULAR_ARTISTS);
  const [userCoords, setUserCoords]   = useState<{ lat: number; lng: number } | null>(null);
  const [liveEvents, setLiveEvents]   = useState<DisplayEvent[]>([]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = loc.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo.length > 0) {
          const city = geo[0].city ?? geo[0].district ?? geo[0].region;
          if (city) setActiveCity(city);
        }
      }
    })();

    const q = query(collection(db, 'events'), where('status', '==', 'upcoming'));
    const unsub = onSnapshot(q, (snap) => {
      const evts: DisplayEvent[] = snap.docs.map((d) => {
        const data = d.data();
        const genres: string[] = Array.isArray(data.genre)
          ? data.genre.map((g: string) => g.toUpperCase())
          : (data.genre ? [String(data.genre).toUpperCase()] : ['MÜZİK']);
        const rawPrice = data.price;
        return {
          id: d.id,
          title: data.title ?? '',
          venue: data.venueName ?? data.venue ?? '',
          artist: data.artistName ?? data.artist ?? '',
          date: data.date ?? data.dateLabel ?? '',
          time: data.startTime ?? data.time ?? '',
          genres,
          attendees: data.attendeeCount ?? 0,
          price: rawPrice == null || rawPrice === 0 ? 'Ücretsiz' : `₺${rawPrice}`,
          isHot: (data.attendeeCount ?? 0) > 400,
          isNew: !!data.isNew,
          isTrending: (data.attendeeCount ?? 0) > 200,
          isSoldOut: !!data.isSoldOut,
          isExclusive: !!data.isExclusive,
          location: data.location ?? undefined,
        };
      });
      setLiveEvents(evts);
    }, (err) => console.warn('[HomeScreen] events error', err));

    return () => { unsub(); };
  }, []);

  // Sanatçıları Firestore'dan yükle + takip durumlarını çek
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'users'), where('userType', '==', 'artist')));
        if (snap.empty) return;
        const loaded = snap.docs.slice(0, 5).map((d) => {
          const data = d.data();
          const fc = data.followerCount ?? 0;
          return {
            id: d.id,
            name: data.displayName ?? 'Sanatçı',
            genre: data.genres?.[0] ?? 'Müzik',
            followers: fc >= 1000 ? `${(fc / 1000).toFixed(1)}K` : String(fc),
            photo: data.photoURL ? { uri: data.photoURL } : null,
            following: false,
          };
        });
        setLiveArtists(loaded);
        // Mevcut takip durumlarını yükle
        if (userId && !userId.startsWith('demo_')) {
          const followSnap = await getDocs(collection(db, 'users', userId, 'following'));
          const followedIds = new Set(followSnap.docs.map((d) => d.id));
          setFollowStates(Object.fromEntries(loaded.map((a) => [a.id, followedIds.has(a.id)])));
        }
      } catch { /* POPULAR_ARTISTS fallback kalır */ }
    })();
  }, [userId]);

  const addDistance = useCallback((evts: DisplayEvent[]): DisplayEvent[] =>
    evts.map((e) => {
      if (userCoords && e.location?.lat != null && e.location?.lng != null) {
        return { ...e, distanceKm: calcDistanceKm(userCoords.lat, userCoords.lng, e.location.lat, e.location.lng) };
      }
      return e;
    }), [userCoords]);

  const heroEvents  = useMemo(() =>
    liveEvents.length >= 3 ? addDistance(liveEvents.slice(0, 4)) : HERO_EVENTS,
    [liveEvents, addDistance]);

  const top10 = useMemo(() =>
    addDistance(liveEvents.length > 0 ? liveEvents.slice(0, 10) : TOP10),
    [liveEvents, addDistance]);

  const yeniEvents = useMemo(() =>
    liveEvents.length > 0 ? liveEvents.filter((e) => e.isNew).slice(0, 6) : YENI_EVENTS,
    [liveEvents]);

  const sadeceEvents = useMemo(() =>
    liveEvents.length > 0 ? liveEvents.filter((e) => e.isExclusive).slice(0, 4) : SADECE_EVENTS,
    [liveEvents]);

  const buHaftaEvents = useMemo(() =>
    liveEvents.length > 0 ? addDistance(liveEvents.slice(0, 6)) : BU_HAFTA_EVENTS,
    [liveEvents, addDistance]);

  const searchResults = useMemo(() => {
    if (!searchText) return [];
    const pool = liveEvents.length > 0 ? liveEvents : [...TOP10, ...YENI_EVENTS];
    return addDistance(pool).filter((e) =>
      e.title.toLowerCase().includes(searchText.toLowerCase()) ||
      e.artist.toLowerCase().includes(searchText.toLowerCase()) ||
      e.venue.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText, liveEvents, addDistance]);

  const handleFollow = useCallback(async (id: string) => {
    const isNowFollowing = !followStates[id];
    setFollowStates((prev) => ({ ...prev, [id]: isNowFollowing }));
    if (!userId || userId.startsWith('demo_')) return;
    const ref = doc(db, 'users', userId, 'following', id);
    try {
      if (isNowFollowing) {
        const artist = liveArtists.find((a) => a.id === id);
        await setDoc(ref, { artistId: id, artistName: artist?.name ?? '', followedAt: serverTimestamp() });
      } else {
        await deleteDoc(ref);
      }
    } catch { /* local state already updated */ }
  }, [followStates, userId, liveArtists]);

  const navEvent = useCallback((event: DisplayEvent) => {
    navigation.navigate('EventDetail', { event });
  }, [navigation]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[0]}
      >
        {/* ── STICKY HEADER ── */}
        <View style={styles.stickyHeader}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <Text style={styles.logoText}>GigBridge</Text>

            <TouchableOpacity
              style={styles.citySel}
              onPress={() => setShowCityPicker((v) => !v)}
              activeOpacity={0.8}
            >
              <Ionicons name="location-sharp" size={11} color={C.teal} />
              <Text style={styles.citySelText} numberOfLines={1}>{activeCity.toUpperCase()}</Text>
              <Ionicons name={showCityPicker ? 'chevron-up' : 'chevron-down'} size={11} color={C.textSub} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={20} color={C.text} />
              <View style={styles.notifDot} />
            </TouchableOpacity>
          </View>

          {/* City dropdown */}
          {showCityPicker && (
            <View style={styles.cityDropdown}>
              {CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[styles.cityItem, activeCity === city && styles.cityItemActive]}
                  onPress={() => { setActiveCity(city); setShowCityPicker(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cityItemText, activeCity === city && styles.cityItemTextActive]}>
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Search bar */}
          <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
            <Ionicons name="search-outline" size={16} color={C.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Etkinlik, mekan veya sanatçı ara..."
              placeholderTextColor={C.textMuted}
              value={searchText}
              onChangeText={setSearchText}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category tabs */}
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catContent}
            style={styles.catScroll}
          >
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat.label;
              return (
                <TouchableOpacity
                  key={cat.label}
                  style={[styles.catTabOuter, active && styles.catTabActive]}
                  onPress={() => setActiveCategory(cat.label)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={cat.icon} size={13} color="#fff" />
                  <Text style={styles.catText}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── SEARCH RESULTS ── */}
        {searchText.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults.length === 0 ? (
              <View style={styles.emptySearch}>
                <Ionicons name="search-outline" size={32} color={C.textMuted} />
                <Text style={styles.emptySearchText}>Sonuç bulunamadı</Text>
              </View>
            ) : searchResults.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => navEvent(event)}
              />
            ))}
          </View>
        )}

        {searchText.length === 0 && (
          <>
            {/* ── HERO CAROUSEL ── */}
            <HeroCarousel
              events={heroEvents}
              onPress={navEvent}
              width={width}
            />

            {/* ── TOP 10 ── */}
            <SectionHeader
              title="TOP 10 on GigBridge"
              onSeeAll={() => navigation.navigate('Events')}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {top10.map((event, i) => (
                <Top10Card
                  key={event.id}
                  event={event}
                  rank={i + 1}
                  onPress={() => navEvent(event)}
                />
              ))}
            </ScrollView>

            {/* ── SADECE GİGBRİDGE'DE ── */}
            <SectionHeader
              title="Sadece GigBridge'de"
              subtitle="Özel etkinlikler, VIP deneyimler"
              onSeeAll={() => navigation.navigate('Events')}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {sadeceEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onPress={() => navEvent(event)}
                />
              ))}
            </ScrollView>

            {/* ── YENİLER ── */}
            <SectionHeader
              title="GigBridge'de En Yeniler!"
              onSeeAll={() => navigation.navigate('Events')}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {yeniEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onPress={() => navEvent(event)}
                />
              ))}
            </ScrollView>

            {/* ── BU HAFTA ── */}
            <SectionHeader
              title="Bu Hafta"
              subtitle={activeCity !== 'TÜMÜ' ? activeCity : undefined}
              onSeeAll={() => navigation.navigate('Events')}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {buHaftaEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onPress={() => navEvent(event)}
                />
              ))}
            </ScrollView>

            {/* ── SANATÇILAR ── */}
            <SectionHeader
              title="Popüler Sanatçılar"
              onSeeAll={() => navigation.navigate('Following')}
            />
            <View style={styles.artistList}>
              {liveArtists.map((artist) => (
                <ArtistCard
                  key={artist.id}
                  artist={{ ...artist, following: followStates[artist.id] ?? artist.following }}
                  onFollow={() => handleFollow(artist.id)}
                  onPress={() => navigation.navigate('ArtistDetail', { artist })}
                />
              ))}
            </View>

            {/* ── PRO BANNER ── */}
            <PressableScale
              style={styles.proBanner}
              onPress={() => navigation.navigate('ProAccount')}
              scaleTo={0.98}
            >
              <LinearGradient
                colors={['#1A0533', '#2D1B69']}
                style={styles.proGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <View style={styles.proLeft}>
                  <Text style={styles.proEye}>EXCLUSIVE</Text>
                  <Text style={styles.proTitle}>GigBridge Pro</Text>
                  <Text style={styles.proDesc}>Katılımcı listeleri, erken erişim ve sınırsız keşif</Text>
                </View>
                <View style={styles.proBtn}>
                  <Text style={styles.proBtnText}>KEŞFET</Text>
                  <Ionicons name="arrow-forward" size={13} color={C.bg} />
                </View>
              </LinearGradient>
            </PressableScale>
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  // ── Sticky Header ──
  stickyHeader: { backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.divider },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, gap: 10,
  },
  logoText:    { color: C.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.5, flex: 1 },

  citySel:     { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 130, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  citySelText: { color: C.text, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, flexShrink: 1 },

  notifBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: 6, right: 5, width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.red, borderWidth: 1.5, borderColor: C.bg },

  cityDropdown:        { marginHorizontal: 16, marginBottom: 8, backgroundColor: C.surface, borderRadius: 8, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden' },
  cityItem:            { paddingHorizontal: 16, paddingVertical: 11 },
  cityItemActive:      { backgroundColor: C.tealDim },
  cityItemText:        { color: C.textSub, fontSize: 13, fontWeight: '500' },
  cityItemTextActive:  { color: C.teal, fontWeight: '700' },

  searchBar:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 12, backgroundColor: C.surface, borderRadius: 8, borderWidth: 1, borderColor: C.cardBorder, paddingHorizontal: 12, paddingVertical: 0 },
  searchBarFocused: { borderColor: C.teal, shadowColor: C.teal, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  searchInput:      { flex: 1, color: C.text, fontSize: 13, paddingVertical: 12 },

  catScroll:    { marginBottom: 0 },
  catContent:   { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  catTabOuter:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  catTabActive: { backgroundColor: 'rgba(168,85,247,0.2)', borderColor: 'rgba(168,85,247,0.5)' },
  catText:      { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // ── Search results ──
  searchResults:   { padding: 16, gap: 12 },
  emptySearch:     { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptySearchText: { color: C.textMuted, fontSize: 14 },

  // ── Section ──
  sectionHeader:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 28, marginBottom: 14 },
  sectionAccentBar: { width: 3, height: 22, backgroundColor: C.teal, borderRadius: 2, marginRight: 10 },
  sectionTitleWrap: { flex: 1 },
  sectionTitle:     { color: C.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sectionSubtitle:  { color: C.textSub, fontSize: 11, marginTop: 2 },
  seeAllBtn:        { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' as any },
  seeAllText:       { color: C.teal, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  hScroll: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },

  // ── TOP 10 Card ──
  top10Card:      { width: 270, borderRadius: 10, overflow: 'hidden', backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder },
  top10Banner:    { height: 220, justifyContent: 'space-between', padding: 14 },
  top10BannerImg: { resizeMode: 'cover' },
  top10RankWrap:  { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.7)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  top10Rank:      { color: '#fff', fontSize: 15, fontWeight: '900' },
  top10Body:      { justifyContent: 'flex-end' },
  top10Title:     { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 3, letterSpacing: -0.2 },
  top10Sub:       { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginBottom: 8 },
  top10Meta:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  top10Footer:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },

  // ── Event Card ──
  eventCard:          { width: 210, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.cardBorder },
  eventBanner:        { height: 270, justifyContent: 'space-between', padding: 12 },
  eventBannerImg:     { resizeMode: 'cover' },
  eventBadgeAbs:      { alignSelf: 'flex-start' },
  eventBody:          { gap: 4 },
  eventTitle:         { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  eventSub:           { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginBottom: 2 },
  eventFooter:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  eventDateRow:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventDateText:      { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  eventPricePill:     { backgroundColor: 'rgba(245,158,11,0.2)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.5)', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
  eventPricePillFree: { backgroundColor: 'rgba(74,222,128,0.2)', borderColor: 'rgba(74,222,128,0.5)' },
  eventPriceText:     { color: C.amber, fontSize: 11, fontWeight: '800' },
  eventPriceTextFree: { color: '#4ADE80' },

  // ── Date / Distance pill (Top10Card) ──
  datePill:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  datePillText: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '500' },
  distPill:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.tealDim, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  distText:     { color: C.teal, fontSize: 10, fontWeight: '600' },

  // ── Price (Top10Card) ──
  priceLabel:          { color: C.amber, fontSize: 13, fontWeight: '800' },
  priceLabelFree:      { color: '#4ADE80' },

  // ── Artist list ──
  artistList:          { paddingHorizontal: 16 },
  artistCard:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.divider },
  artistPhoto:         { width: 52, height: 52, borderRadius: 26, resizeMode: 'cover', alignItems: 'center', justifyContent: 'center' },
  artistPhotoInitial:  { color: '#fff', fontSize: 20, fontWeight: '800' },
  artistInfo:          { flex: 1 },
  artistName:          { color: C.text, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  artistGenre:         { color: C.textSub, fontSize: 11, marginBottom: 2 },
  artistFollowers:     { color: C.textMuted, fontSize: 10 },
  followBtn:           { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(109,40,217,0.35)', backgroundColor: 'rgba(109,40,217,0.07)', paddingHorizontal: 14, paddingVertical: 7 },
  followBtnActive:     { backgroundColor: 'rgba(109,40,217,0.15)', borderColor: 'rgba(109,40,217,0.5)' },
  followBtnText:       { color: '#A78BFA', fontSize: 11, fontWeight: '700' },
  followBtnTextActive: { color: '#C084FC' },

  // ── Pro Banner ──
  proBanner: { marginHorizontal: 16, marginTop: 28, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#7C3AED44' },
  proGrad:   { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 16 },
  proLeft:   { flex: 1 },
  proEye:    { color: '#A78BFA', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  proTitle:  { color: C.text, fontSize: 18, fontWeight: '900', marginBottom: 6, letterSpacing: -0.3 },
  proDesc:   { color: C.textSub, fontSize: 12, lineHeight: 18 },
  proBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.teal, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 10 },
  proBtnText:{ color: C.bg, fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },

  bottomSpacer: { height: 110 },
});
