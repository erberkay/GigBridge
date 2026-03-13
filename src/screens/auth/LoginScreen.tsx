import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import Input from '../../components/common/Input';
import GradientButton from '../../components/common/GradientButton';
import { Colors, Spacing, FontSize } from '../../theme';
import { UserType } from '../../types';

// ─── Hata Kodları ────────────────────────────────────────────────────────────
const ERR = {
  EMPTY_FIELDS:         'ERR-AUTH-001',
  INVALID_EMAIL_FORMAT: 'ERR-AUTH-002',
  INVALID_CREDENTIALS:  'ERR-AUTH-003',
  TOO_MANY_REQUESTS:    'ERR-AUTH-004',
  NETWORK_ERROR:        'ERR-AUTH-005',
  USER_DOC_NOT_FOUND:   'ERR-AUTH-006',
  RESET_EMAIL_FAILED:   'ERR-AUTH-007',
  RESET_EMAIL_EMPTY:    'ERR-AUTH-008',
} as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mapAuthError(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return ERR.INVALID_CREDENTIALS;
    case 'auth/too-many-requests':
      return ERR.TOO_MANY_REQUESTS;
    case 'auth/network-request-failed':
      return ERR.NETWORK_ERROR;
    default:
      return 'ERR-AUTH-000';
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  const handleForgotPassword = useCallback(() => {
    const trimmed = email.trim();

    if (!trimmed) {
      Alert.alert('E-posta Girin', `Şifre sıfırlama için önce e-posta adresinizi girin.\n(${ERR.RESET_EMAIL_EMPTY})`);
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      Alert.alert('Geçersiz E-posta', `Lütfen geçerli bir e-posta adresi girin.\n(${ERR.INVALID_EMAIL_FORMAT})`);
      return;
    }

    Alert.alert(
      'Şifremi Unuttum',
      `${trimmed} adresine şifre sıfırlama bağlantısı gönderilsin mi?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Gönder',
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, trimmed);
              Alert.alert('Gönderildi', 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
            } catch {
              Alert.alert('Hata', `E-posta gönderilemedi. Adresinizi kontrol edin.\n(${ERR.RESET_EMAIL_FAILED})`);
            }
          },
        },
      ],
    );
  }, [email]);

  const handleLogin = useCallback(async () => {
    if (loading) return;

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      Alert.alert('Eksik Bilgi', `Lütfen tüm alanları doldurun.\n(${ERR.EMPTY_FIELDS})`);
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      Alert.alert('Geçersiz E-posta', `Lütfen geçerli bir e-posta adresi girin.\n(${ERR.INVALID_EMAIL_FORMAT})`);
      return;
    }

    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, trimmedEmail, password);

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // Auth kaydı var ama Firestore profili yok — tutarsız durum
        await auth.signOut();
        Alert.alert(
          'Hesap Hatası',
          `Kullanıcı profili bulunamadı. Lütfen destek ile iletişime geçin.\n(${ERR.USER_DOC_NOT_FOUND})`,
        );
        return;
      }

      const data = userDoc.data();
      setUser({
        userId:      user.uid,
        email:       user.email ?? '',
        displayName: data.displayName ?? '',
        photoURL:    data.photoURL ?? null,
        userType:    data.userType as UserType,
        orgId:       data.orgId   ?? null,
        orgRole:     data.orgRole ?? null,
        orgName:     data.orgName ?? null,
      });
    } catch (err: any) {
      const code = mapAuthError(err?.code ?? '');
      let message = `Giriş yapılamadı. Lütfen tekrar deneyin.\n(${code})`;

      if (code === ERR.INVALID_CREDENTIALS) {
        message = `E-posta veya şifre hatalı.\n(${code})`;
      } else if (code === ERR.TOO_MANY_REQUESTS) {
        message = `Çok fazla başarısız deneme. Lütfen birkaç dakika bekleyin.\n(${code})`;
      } else if (code === ERR.NETWORK_ERROR) {
        message = `İnternet bağlantınızı kontrol edin.\n(${code})`;
      }

      Alert.alert('Giriş Hatası', message);
    } finally {
      setLoading(false);
    }
  }, [loading, email, password, setUser]);

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Başlık */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            disabled={loading}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.logoRow}>
            <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.logo}>
              <Ionicons name="musical-notes" size={24} color="#fff" />
            </LinearGradient>
            <Text style={styles.appName}>GigBridge</Text>
          </View>

          <Text style={styles.title}>Hoş Geldiniz</Text>
          <Text style={styles.subtitle}>Hesabınıza giriş yapın</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="E-posta"
            placeholder="ornek@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!loading}
          />
          <Input
            label="Şifre"
            placeholder="Şifrenizi girin"
            value={password}
            onChangeText={setPassword}
            secureToggle
            autoComplete="password"
            editable={!loading}
          />

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={handleForgotPassword}
            disabled={loading}
          >
            <Text style={styles.forgotText}>Şifremi Unuttum</Text>
          </TouchableOpacity>

          <GradientButton
            title="Giriş Yap"
            onPress={handleLogin}
            loading={loading}
            style={styles.submitBtn}
          />
        </View>

        {/* Kayıt ol */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Hesabınız yok mu? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            disabled={loading}
          >
            <Text style={styles.footerLink}>Kayıt Ol</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 60,
    flexGrow: 1,           // Android'de minHeight:'100%' yerine güvenli seçenek
  },
  header: {
    marginBottom: Spacing.xl,
  },
  backBtn: {
    marginBottom: Spacing.xl,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  appName: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  form: {
    flex: 1,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    marginTop: -8,
  },
  forgotText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  footerLink: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  kav: { flex: 1 },
  submitBtn: { marginTop: 8 },
});
