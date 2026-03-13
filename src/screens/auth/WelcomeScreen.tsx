import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { useAuthStore } from '../../store/authStore';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function WelcomeScreen({ navigation }: any) {
  // Selector ile sadece gerekli fonksiyonu subscribe et — tüm store değişimlerinde re-render önlenir
  const setUser = useAuthStore((s) => s.setUser);

  const handleDevLogin = useCallback(() => {
    Alert.alert('Demo Giriş', 'Hangi kullanıcı tipiyle girmek istersin?', [
      {
        text: 'Müşteri',
        onPress: () => setUser({ userId: 'demo_customer', email: 'demo@gigbridge.app', displayName: 'Demo Müşteri', userType: 'customer' }),
      },
      {
        text: 'Sanatçı',
        onPress: () => setUser({ userId: 'demo_artist', email: 'artist@gigbridge.app', displayName: 'Demo Sanatçı', userType: 'artist' }),
      },
      {
        text: 'Mekan',
        onPress: () => setUser({ userId: 'demo_venue', email: 'venue@gigbridge.app', displayName: 'Demo Mekan', userType: 'venue' }),
      },
      {
        text: 'Organizatör',
        onPress: () => setUser({ userId: 'demo_organizer', email: 'organizer@gigbridge.app', displayName: 'Demo Organizatör', userType: 'organizer', orgId: 'demo_org_1', orgRole: 'owner', orgName: 'Demo Organizasyon' }),
      },
      { text: 'İptal', style: 'cancel' },
    ]);
  }, [setUser]);

  return (
    <View style={styles.container}>
      {/* Arka plan gradient */}
      <LinearGradient
        colors={['#0A0A0F', '#1A0A2E', '#0A0A0F']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Dekoratif daireler */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      {/* Logo ve başlık */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientEnd]}
            style={styles.logo}
          >
            <Ionicons name="musical-notes" size={36} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={styles.appName}>GigBridge</Text>
        <Text style={styles.tagline}>Sanatçılar, Mekanlar ve{'\n'}Müzik Severler Bir Arada</Text>
      </View>

      {/* Özellikler */}
      <View style={styles.features}>
        <FeatureItem iconName="mic-outline" text="Sanatçı profilleri ve portföyler" />
        <FeatureItem iconName="business-outline" text="Mekanları keşfet ve etkinlikleri takip et" />
        <FeatureItem iconName="map-outline" text="Yakınındaki etkinlikleri haritada gör" />
        <FeatureItem iconName="star-outline" text="Sanatçı ve mekanlara puan ver" />
      </View>

      {/* Butonlar */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.loginGradient}
          >
            <Text style={styles.loginText}>Giriş Yap</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.85}
        >
          <Text style={styles.registerText}>Hesap Oluştur</Text>
        </TouchableOpacity>

        <Text style={styles.terms}>
          Devam ederek{' '}
          <Text style={styles.link} onPress={() => Alert.alert('Kullanım Koşulları', 'GigBridge kullanım koşulları yakında yayınlanacaktır.')}>Kullanım Koşulları</Text>
          {' '}ve{' '}
          <Text style={styles.link} onPress={() => Alert.alert('Gizlilik Politikası', 'GigBridge gizlilik politikası yakında yayınlanacaktır.')}>Gizlilik Politikası</Text>
          {"'nı kabul etmiş olursunuz."}
        </Text>

        {/* Yalnızca geliştirme ortamında göster */}
        {__DEV__ && (
          <TouchableOpacity onPress={handleDevLogin} style={styles.devLoginBtn}>
            <Text style={styles.devLoginText}>Geliştirici Girişi</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function FeatureItem({ iconName, text }: { iconName: IoniconName; text: string }) {
  return (
    <View style={featureStyles.container}>
      <View style={featureStyles.iconWrapper}>
        <Ionicons name={iconName} size={18} color={Colors.primary} />
      </View>
      <Text style={featureStyles.text}>{text}</Text>
    </View>
  );
}

const featureStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    flex: 1,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },
  circle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.primary,
    opacity: 0.06,
    top: -80,
    right: -80,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primaryDark,
    opacity: 0.08,
    bottom: 100,
    left: -60,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  features: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  buttons: {
    gap: 12,
  },
  loginButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  loginGradient: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  registerButton: {
    height: 52,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  terms: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
  link: {
    color: Colors.primary,
  },
  devLoginBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  devLoginText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textDecorationLine: 'underline',
  },
});
