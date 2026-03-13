import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSize } from '../../theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  secureToggle?: boolean;
}

export default function Input({ label, error, secureToggle, secureTextEntry, style, ...props }: Props) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.textMuted}
          selectionColor={Colors.primary}
          secureTextEntry={secureToggle ? !showPassword : secureTextEntry}
          {...props}
        />
        {secureToggle && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginBottom: 8,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
});
