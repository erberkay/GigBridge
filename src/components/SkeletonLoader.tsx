import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius } from '../theme';

interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width = '100%', height = 16, borderRadius = BorderRadius.sm, style }: SkeletonBoxProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius, backgroundColor: Colors.surfaceAlt, opacity }, style]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={skeletonStyles.card}>
      <SkeletonBox width={52} height={52} borderRadius={BorderRadius.md} style={skeletonStyles.cardAvatarBox} />
      <View style={skeletonStyles.cardBody}>
        <SkeletonBox height={14} width="70%" />
        <SkeletonBox height={11} width="50%" />
        <SkeletonBox height={11} width="40%" />
      </View>
      <View style={skeletonStyles.cardRight}>
        <SkeletonBox width={48} height={14} />
        <SkeletonBox width={36} height={11} />
      </View>
    </View>
  );
}

export function SkeletonConversation() {
  return (
    <View style={skeletonStyles.conversation}>
      <SkeletonBox width={52} height={52} borderRadius={26} style={skeletonStyles.convAvatar} />
      <View style={skeletonStyles.convBody}>
        <View style={skeletonStyles.convHeader}>
          <SkeletonBox height={14} width="45%" />
          <SkeletonBox width={40} height={11} />
        </View>
        <SkeletonBox height={11} width="75%" />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 10,
  },
  cardAvatarBox: { marginRight: 12, flexShrink: 0 },
  cardBody: { flex: 1, gap: 8 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  conversation: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  convAvatar: { flexShrink: 0 },
  convBody: { flex: 1, gap: 8, marginLeft: 12 },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between' },
});
