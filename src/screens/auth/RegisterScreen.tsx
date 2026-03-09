import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import Input from '../../components/common/Input';
import GradientButton from '../../components/common/GradientButton';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { UserType } from '../../types';

const USER_TYPES = [
  {
    type: 'customer' as UserType,
    label: 'Müşteri',
    description: 'Etkinlikleri keşfet, sanatçıları takip et',
    iconName: 'headset-outline' as const,
    color: Colors.customerColor,
    gradient: [Colors.customerColor, '#0891B2'] as [string, string],
  },
  {
    type: 'artist' as UserType,
    label: 'Sanatçı',
    description: 'Profilini oluştur, mekanlardan teklif al',
    iconName: 'mic-outline' as const,
    color: Colors.artistColor,
    gradient: [Colors.artistColor, Colors.primaryDark] as [string, string],
  },
  {
    type: 'venue' as UserType,
    label: 'Mekan',
    description: 'Sanatçıları bul, etkinlik planla',
    iconName: 'business-outline' as const,
    color: Colors.venueColor,
    gradient: [Colors.venueColor, '#D97706'] as [string, string],
  },
];

export default function RegisterScreen({ navigation }: any) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  const handleRegister = async () => {
    if (!displayName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (!selectedType) {
      Alert.alert('Hata', 'Lütfen hesap tipini seçin.');
      return;
    }

    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(user, { displayName: displayName.trim() });
      await setDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        email: user.email,
        userType: selectedType,
        photoURL: null,
        createdAt: new Date(),
      });
      setUser({
        userId: user.uid,
        email: user.email!,
        displayName: displayName.trim(),
        userType: selectedType,
      });
    } catch (err: any) {
      let message = 'Kayıt yapılamadı.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'Bu e-posta adresi zaten kullanımda.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Geçersiz e-posta adresi.';
      }
      Alert.alert('Kayıt Hatası', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (step === 2 ? setStep(1) : navigation.goBack())} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>{step === 1 ? 'Hesap Tipini Seç' : 'Bilgilerini Gir'}</Text>
          <Text style={styles.subtitle}>
            {step === 1 ? 'Platforma nasıl katılmak istiyorsun?' : 'Hesap bilgilerini doldur'}
          </Text>

          {/* Adım göstergesi */}
          <View style={styles.steps}>
            {[1, 2].map((s) => (
              <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]} />
            ))}
          </View>
        </View>

        {step === 1 ? (
          /* Adım 1: Kullanıcı tipi seçimi */
          <View style={styles.typeCards}>
            {USER_TYPES.map((item) => (
              <TouchableOpacity
                key={item.type}
                onPress={() => { setSelectedType(item.type); setStep(2); }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={item.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.typeCard}
                >
                  <Ionicons name={item.iconName} size={28} color="#fff" style={styles.typeIcon} />
                  <Text style={styles.typeLabel}>{item.label}</Text>
                  <Text style={styles.typeDesc}>{item.description}</Text>
                  <View style={styles.selectArrow}>
                    <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          /* Adım 2: Form */
          <View style={styles.form}>
            {/* Seçilen tip göstergesi */}
            {selectedType && (() => {
              const selected = USER_TYPES.find((t) => t.type === selectedType)!;
              return (
                <View style={styles.selectedBadge}>
                  <Ionicons name={selected.iconName} size={16} color={selected.color} style={styles.badgeIcon} />
                  <Text style={[styles.badgeText, { color: selected.color }]}>{selected.label} Hesabı</Text>
                </View>
              );
            })()}

            <Input
              label="Ad Soyad / Sahne Adı"
              placeholder="Adınızı girin"
              value={displayName}
              onChangeText={setDisplayName}
            />
            <Input
              label="E-posta"
              placeholder="ornek@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Şifre"
              placeholder="En az 6 karakter"
              value={password}
              onChangeText={setPassword}
              secureToggle
            />
            <Input
              label="Şifre Tekrar"
              placeholder="Şifrenizi tekrar girin"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureToggle
            />

            <GradientButton
              title="Kayıt Ol"
              onPress={handleRegister}
              loading={loading}
              variant={selectedType ?? 'primary'}
              style={{ marginTop: 8 }}
            />
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Zaten hesabınız var mı? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingTop: 60, minHeight: '100%' },
  header: { marginBottom: Spacing.xl },
  backBtn: { marginBottom: Spacing.lg },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: 16 },
  steps: { flexDirection: 'row', gap: 8 },
  stepDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.border,
  },
  stepDotActive: { backgroundColor: Colors.primary, width: 24 },
  typeCards: { gap: 16 },
  typeCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    position: 'relative',
  },
  typeIcon: { marginBottom: 12 },
  typeLabel: { fontSize: FontSize.xl, fontWeight: '800', color: '#fff', marginBottom: 6 },
  typeDesc: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)' },
  selectArrow: {
    position: 'absolute',
    right: Spacing.lg,
    top: '50%',
    transform: [{ translateY: -12 }],
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: { flex: 1 },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: Spacing.lg,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeIcon: { marginRight: 4 },
  badgeText: { fontSize: FontSize.sm, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl, paddingBottom: Spacing.lg },
  footerText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  footerLink: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '700' },
});
