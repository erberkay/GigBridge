import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Animated, Image,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { seedDemoEvents } from '../../services/seedEvents';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';

const ARTIST_PHOTOS: Record<string, any> = {
  'DJ Berkay':    require('../../assets/dj_berkay.jpg'),
  'Kerem Görsev': require('../../assets/artist_pianist.png'),
  'Merve Özbey':  require('../../assets/artist_vocalist.png'),
  'Kolsch':       require('../../assets/artist_dj.png'),
  'DJ Ege':       require('../../assets/artist_dj.png'),
  'Kemal Trio':   require('../../assets/artist_pianist.png'),
  'Emre Aydın':   require('../../assets/artist_guitarist.png'),
};

const SPONSORED_EVENTS = [
  { id: 'sp1', title: 'DJ Berkay Live Set', venue: "Berkay Er'in Sahnesi", artist: 'DJ Berkay', lat: 37.8578, lng: 27.2597, genre: 'Electronic', time: 'Her C.tesi 23:00', sponsored: true },
];

const FALLBACK_EVENTS = [
  { id: '1', title: 'Jazz Gecesi', venue: 'Babylon', artist: 'Kerem Görsev', lat: 41.0370, lng: 28.9880, genre: 'Jazz', time: '21:00' },
  { id: '2', title: 'Electronic Night', venue: 'Zorlu PSM', artist: 'Kolsch', lat: 41.0619, lng: 29.0094, genre: 'Electronic', time: '22:00' },
  { id: '3', title: 'Rock Akşamı', venue: 'Hayal Kahvesi', artist: 'maNga', lat: 41.0297, lng: 28.9681, genre: 'Rock', time: '20:30' },
  { id: '4', title: 'Pop Night', venue: 'IF Performance', artist: 'Merve Özbey', lat: 41.0419, lng: 29.0094, genre: 'Pop', time: '21:30' },
  { id: '5', title: 'Ege Gecesi', venue: 'Güvercinada Sahne', artist: 'DJ Ege', lat: 37.8590, lng: 27.2554, genre: 'Electronic', time: '22:00' },
  { id: '6', title: 'Sunset Jazz', venue: 'Kadınlar Denizi Bar', artist: 'Kemal Trio', lat: 37.8560, lng: 27.2610, genre: 'Jazz', time: '20:00' },
  { id: '7', title: 'Akustik Gece', venue: 'Kuşadası Barlar Sokağı', artist: 'Emre Aydın', lat: 37.8615, lng: 27.2580, genre: 'Akustik', time: '21:30' },
];

// ─── Hata Kodları ────────────────────────────────────────────────────────────
const ERR = {
  LOCATION_DENIED:   'ERR-MAP-001',
  LOCATION_FAILED:   'ERR-MAP-002',
  EVENTS_FETCH:      'ERR-MAP-003',
  SEED_FAILED:       'ERR-MAP-004',
} as const;

// ─────────────────────────────────────────────────────────────────────────────

const GENRE_IONICON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  Jazz: 'musical-note-outline',
  Electronic: 'headset-outline',
  Rock: 'musical-notes-outline',
  Pop: 'mic-outline',
  Akustik: 'musical-notes-outline',
  'Hip-Hop': 'mic-outline',
  Classical: 'musical-notes-outline',
  Default: 'musical-notes-outline',
};

function SponsoredMiniCard({ event, onPress }: { event: typeof SPONSORED_EVENTS[0]; onPress: () => void }) {
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [breathe]);
  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] });
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity style={styles.sponsoredCard} onPress={onPress}>
        <View style={styles.sponsoredBadge}>
          <Ionicons name="star" size={9} color={Colors.accent} />
          <Text style={styles.sponsoredBadgeText}>Sponsorlu</Text>
        </View>
        <View style={styles.cardRowMb4}>
          <Ionicons name="musical-notes-outline" size={11} color={Colors.primary} />
          <Text style={[styles.miniGenre, styles.noMarginBottom]}>{event.genre}</Text>
        </View>
        <Text style={styles.miniTitle} numberOfLines={1}>{event.title}</Text>
        <View style={styles.cardRowMb2}>
          <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
          <Text style={[styles.miniVenue, styles.noMarginBottom]} numberOfLines={1}>{event.venue}</Text>
        </View>
        <View style={styles.cardRow}>
          <Ionicons name="time-outline" size={11} color={Colors.accent} />
          <Text style={[styles.miniTime, styles.noMarginBottom]}>{event.time}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function PulseMarker({ genre, selected, artistPhoto, scale }: { genre: string; selected: boolean; artistPhoto?: any; scale: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const animatedScale = useRef(new Animated.Value(Math.min(2.2, selected ? scale * 1.45 : scale))).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  useEffect(() => {
    const target = Math.min(2.2, selected ? scale * 1.45 : scale);
    Animated.spring(animatedScale, {
      toValue: target,
      useNativeDriver: true,
      damping: 18,
      stiffness: 280,
      mass: 0.8,
    }).start();
  }, [scale, selected, animatedScale]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
  const iconName = GENRE_IONICON[genre] ?? GENRE_IONICON.Default;
  const color = selected ? '#7C3AED' : '#4F46E5';

  return (
    <Animated.View style={[styles.markerWrapper, { transform: [{ scale: animatedScale }] }]}>
      {/* Nefes alan dış halka */}
      <Animated.View
        style={[
          styles.pulseRing,
          { borderColor: color, transform: [{ scale: pulseScale }], opacity: pulseOpacity },
        ]}
      />
      {/* İkinci halka - daha yavaş */}
      <Animated.View
        style={[
          styles.pulseRing,
          styles.pulseRingDelay,
          { borderColor: color, transform: [{ scale: pulseScale }], opacity: pulseOpacity },
        ]}
      />
      {/* Pin merkezi */}
      <View style={[styles.pinCenter, selected && styles.pinCenterSelected, { borderColor: color, backgroundColor: selected ? color : Colors.surface }]}>
        {artistPhoto ? (
          <Image source={artistPhoto} style={styles.pinPhoto} />
        ) : (
          <Ionicons name={iconName} size={15} color={selected ? '#fff' : color} />
        )}
      </View>
    </Animated.View>
  );
}

export default function MapScreen({ navigation }: any) {
  const [location, setLocation] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [events, setEvents] = useState(FALLBACK_EVENTS);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [latDelta, setLatDelta] = useState(4.5);
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const mapRef = useRef<MapView>(null);
  const zoomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markerScale = useMemo(() => {
    // delta 0.08 → scale 1.0 (baseline), 0.01 → 1.8 (yakın), 0.5+ → 0.55 (uzak)
    return Math.min(1.8, Math.max(0.75, 0.08 / latDelta));
  }, [latDelta]);

  const handleRegionChange = useCallback(() => {
    setTracksViewChanges(true);
    if (zoomTimer.current) clearTimeout(zoomTimer.current);
  }, []);

  const handleRegionChangeComplete = useCallback((region: any) => {
    setLatDelta(region.latitudeDelta);
    zoomTimer.current = setTimeout(() => setTracksViewChanges(false), 400);
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const snap = await getDocs(
        query(
          collection(db, 'events'),
          where('status', '==', 'upcoming'),
        ),
      );
      if (snap.empty) {
        setEvents(FALLBACK_EVENTS);
      } else {
        const firebaseEvents = snap.docs
          .map((d) => {
            const data = d.data();
            const lat = data.location?.lat;
            const lng = data.location?.lng;
            if (!lat || !lng) return null;
            return {
              id:     d.id,
              title:  data.title ?? 'Etkinlik',
              venue:  data.venueName ?? 'Mekan',
              artist: data.artistName ?? '',
              lat,
              lng,
              genre: Array.isArray(data.genre) ? (data.genre[0] ?? '—') : (data.genre ?? '—'),
              time:  data.startTime ?? '—',
            };
          })
          .filter(Boolean) as typeof FALLBACK_EVENTS;
        setEvents(firebaseEvents.length > 0 ? firebaseEvents : FALLBACK_EVENTS);
      }
    } catch {
      // Firestore erişilemez — fallback göster
      console.warn(`[${ERR.EVENTS_FETCH}] Etkinlikler yüklenemedi, fallback kullanılıyor.`);
      setEvents(FALLBACK_EVENTS);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSeedDemo = useCallback(async () => {
    setSeeding(true);
    try {
      await seedDemoEvents();
      await loadEvents();
      mapRef.current?.animateToRegion({
        latitude: 37.8530,
        longitude: 27.2650,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      }, 800);
      Alert.alert('Eklendi', "Demo etkinlikler Kuşadası'na eklendi.");
    } catch {
      Alert.alert('Hata', `Etkinlikler eklenemedi. (${ERR.SEED_FAILED})`);
    } finally {
      setSeeding(false);
    }
  }, [loadEvents]);

  const selectEvent = useCallback((event: typeof FALLBACK_EVENTS[0]) => {
    setSelectedEvent(event);
    mapRef.current?.animateToRegion({
      latitude: event.lat,
      longitude: event.lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 600);
  }, []);

  useEffect(() => {
    return () => { if (zoomTimer.current) clearTimeout(zoomTimer.current); };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn(`[${ERR.LOCATION_DENIED}] Konum izni reddedildi.`);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
        setLatDelta(0.08);
      } catch {
        console.warn(`[${ERR.LOCATION_FAILED}] Konum alınamadı.`);
      }
    })();
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const initialRegion = {
    latitude: location?.latitude ?? 39.5,
    longitude: location?.longitude ?? 28.0,
    latitudeDelta: location ? 0.08 : 4.5,
    longitudeDelta: location ? 0.08 : 4.5,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {events.map((event) => (
          <Marker
            key={event.id}
            coordinate={{ latitude: event.lat, longitude: event.lng }}
            onPress={() => selectEvent(event)}
            tracksViewChanges={tracksViewChanges}
          >
            <PulseMarker
              genre={event.genre}
              selected={selectedEvent?.id === event.id}
              artistPhoto={ARTIST_PHOTOS[event.artist]}
              scale={markerScale}
            />
          </Marker>
        ))}
      </MapView>

      {/* Başlık */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Yakınındaki Etkinlikler</Text>
          <Text style={styles.headerCount}>{events.length} etkinlik</Text>
        </View>
        <TouchableOpacity style={styles.seedBtn} onPress={handleSeedDemo} disabled={seeding}>
          {seeding
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <Text style={styles.seedBtnText}>+ Demo</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Seçili etkinlik kartı */}
      {selectedEvent && (
        <View style={styles.eventCard}>
          <View style={styles.eventCardTop}>
            <View style={styles.genreBadge}>
              <Text style={styles.genreText}>{selectedEvent.genre}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedEvent(null)}>
              <Ionicons name="close" size={14} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.eventCardContent}>
            <View style={styles.eventLeft}>
              <Text style={styles.eventTitle}>{selectedEvent.title}</Text>
              <View style={styles.eventMetaRow}>
                <Ionicons name="mic-outline" size={13} color={Colors.textSecondary} />
                <Text style={styles.eventArtist}>{selectedEvent.artist}</Text>
              </View>
              <View style={styles.eventMetaRow}>
                <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
                <Text style={styles.eventVenue}>{selectedEvent.venue}</Text>
              </View>
            </View>
            <View style={styles.eventRight}>
              <Text style={styles.eventTime}>{selectedEvent.time}</Text>
              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => navigation.navigate('EventDetail', { event: selectedEvent })}
              >
                <Text style={styles.detailBtnText}>Detay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Alt liste - mini kartlar */}
      {!selectedEvent && (
        <View style={styles.bottomList}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bottomListContent}>
            {SPONSORED_EVENTS.map((event) => (
              <SponsoredMiniCard key={event.id} event={event} onPress={() => selectEvent(event)} />
            ))}
            {events.map((event) => (
              <TouchableOpacity key={event.id} style={styles.miniCard} onPress={() => selectEvent(event)}>
                <View style={styles.cardRowMb4}>
                  <Ionicons name="musical-notes-outline" size={11} color={Colors.primary} />
                  <Text style={[styles.miniGenre, styles.noMarginBottom]}>{event.genre}</Text>
                </View>
                <Text style={styles.miniTitle}>{event.title}</Text>
                <View style={styles.cardRowMb2}>
                  <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
                  <Text style={[styles.miniVenue, styles.noMarginBottom]} numberOfLines={1}>{event.venue}</Text>
                </View>
                <View style={styles.cardRow}>
                  <Ionicons name="time-outline" size={11} color={Colors.accent} />
                  <Text style={[styles.miniTime, styles.noMarginBottom]}>{event.time}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const PULSE_SIZE = 50;
const PIN_SIZE = 32;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },

  markerWrapper: {
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    borderWidth: 2,
  },
  pulseRingDelay: {
    width: PIN_SIZE - 8,
    height: PIN_SIZE - 8,
    borderRadius: (PIN_SIZE - 8) / 2,
  },
  pinCenter: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  pinCenterSelected: {
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  pinPhoto: {
    width: PIN_SIZE - 6,
    height: PIN_SIZE - 6,
    borderRadius: (PIN_SIZE - 6) / 2,
    resizeMode: 'cover',
  },

  header: {
    position: 'absolute',
    top: 56,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.surface + 'EE',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  headerCount: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
  seedBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.primary + '22',
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.primary + '55',
    minWidth: 56, alignItems: 'center',
  },
  seedBtnText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700' },

  eventCard: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  eventCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCardContent: { flexDirection: 'row', justifyContent: 'space-between' },
  eventLeft: { flex: 1 },
  genreBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: Colors.primary + '33',
    borderRadius: BorderRadius.full,
  },
  genreText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' },
  eventTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: 4 },
  eventArtist: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: 2 },
  eventVenue: { color: Colors.textSecondary, fontSize: FontSize.sm },
  eventRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  eventTime: { color: Colors.accent, fontSize: FontSize.md, fontWeight: '700' },
  detailBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  detailBtnText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },

  bottomList: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    paddingVertical: Spacing.sm,
  },
  sponsoredCard: {
    width: 170,
    backgroundColor: Colors.surface + 'EE',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.accent + '88',
  },
  sponsoredBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: Colors.accent + '22',
    borderRadius: BorderRadius.full,
    marginBottom: 6,
  },
  sponsoredBadgeText: { color: Colors.accent, fontSize: 9, fontWeight: '700' },
  miniCard: {
    width: 160,
    backgroundColor: Colors.surface + 'EE',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  miniGenre: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600', marginBottom: 4 },
  miniTitle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 4 },
  miniVenue: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: 2 },
  miniTime: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: '600' },

  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardRowMb4: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  cardRowMb2: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  noMarginBottom: { marginBottom: 0 },
  bottomListContent: { gap: 12, paddingHorizontal: Spacing.lg },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
});
