import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    iconName: 'musical-notes-outline' as const,
    gradient: ['#1A0533', '#2D0B6B', '#0A0A0F'] as [string, string, string],
    accentColor: Colors.primary,
    title: 'Müziğin Kalbine\nHoş Geldin',
    subtitle: 'GigBridge ile sanatçılar, mekanlar ve müzik severler tek bir platformda buluşuyor.',
    highlight: 'GigBridge',
  },
  {
    id: '2',
    iconName: 'calendar-outline' as const,
    gradient: ['#0A1A2E', '#0D3B6E', '#0A0A0F'] as [string, string, string],
    accentColor: Colors.customerColor,
    title: 'Etkinlikleri\nKeşfet',
    subtitle: 'Şehrindeki canlı müzik etkinliklerini bul, favorilerine ekle, katılımcıları gör.',
    highlight: 'canlı müzik',
  },
  {
    id: '3',
    iconName: 'rocket-outline' as const,
    gradient: ['#0A1A10', '#0D4A2E', '#0A0A0F'] as [string, string, string],
    accentColor: Colors.success,
    title: 'Hemen\nBaşla',
    subtitle: 'Hesap oluştur ya da giriş yap. Tamamen ücretsiz — sınırsız keşif seni bekliyor.',
    highlight: 'ücretsiz',
  },
];

export const ONBOARDING_KEY = '@gigbridge_onboarding_done';

export default function OnboardingScreen({ navigation }: any) {
  const flatRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) setCurrentIndex(viewableItems[0].index ?? 0);
  }).current;

  const next = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    navigation.replace('Welcome');
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <LinearGradient colors={item.gradient} style={StyleSheet.absoluteFillObject} />

            {/* Decorative glow */}
            <View style={[styles.glow, { backgroundColor: item.accentColor + '22' }]} />

            {/* Content */}
            <View style={styles.slideContent}>
              <LinearGradient
                colors={[item.accentColor + '33', item.accentColor + '11']}
                style={styles.emojiContainer}
              >
                <Ionicons name={item.iconName} size={48} color={item.accentColor} />
              </LinearGradient>

              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideSubtitle}>
                {item.subtitle.split(item.highlight).map((part, i, arr) =>
                  i < arr.length - 1
                    ? <React.Fragment key={i}>{part}<Text style={[styles.highlightText, { color: item.accentColor }]}>{item.highlight}</Text></React.Fragment>
                    : part
                )}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Bottom controls */}
      <View style={styles.controls}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 24, 8], extrapolate: 'clamp' });
            const opacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity, backgroundColor: SLIDES[i].accentColor }]}
              />
            );
          })}
        </View>

        {/* Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.skipBtn} onPress={finish}>
            <Text style={styles.skipText}>{isLast ? '' : 'Atla'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={isLast ? finish : next} activeOpacity={0.85}>
            <LinearGradient
              colors={[SLIDES[currentIndex].accentColor, SLIDES[currentIndex].accentColor + 'AA']}
              style={styles.nextBtn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={styles.nextText}>{isLast ? 'Başla' : 'İleri'}</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  slide: { width, flex: 1, alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute', width: 320, height: 320, borderRadius: 160,
    top: height * 0.12, alignSelf: 'center',
  },
  slideContent: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: 160 },
  emojiContainer: {
    width: 100, height: 100, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 36,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  slideTitle: {
    color: Colors.text, fontSize: 34, fontWeight: '900',
    textAlign: 'center', lineHeight: 40, marginBottom: 16,
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    color: Colors.textSecondary, fontSize: FontSize.md,
    textAlign: 'center', lineHeight: 24,
  },
  highlightText: { fontWeight: '800' },
  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.lg, paddingBottom: 50, paddingTop: Spacing.lg,
    backgroundColor: 'rgba(10,10,15,0.9)',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 20 },
  dot: { height: 8, borderRadius: 4 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skipBtn: { padding: 12 },
  skipText: { color: Colors.textMuted, fontSize: FontSize.md },
  nextBtn: { borderRadius: BorderRadius.md, paddingHorizontal: 28, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' },
  nextText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
});
