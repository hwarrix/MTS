import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupScreen() {
  const router = useRouter();
  const { signUp, loading } = useAuthStore();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');

  const { control, handleSubmit, formState: { errors } } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setErrorMsg(null);
    const { error } = await signUp(data.email, data.password, {
      full_name: data.fullName,
      role: role,
    });
    
    if (error) {
      setErrorMsg(error);
    } else {
      // Successfully signed up and logged in
      if (role === 'doctor') {
        router.replace('/(auth)/doctor-onboarding');
      } else {
        router.replace('/(patient)');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join MediCare today</Text>
          </View>

          {errorMsg && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <View style={styles.roleSelector}>
            <Text style={styles.roleLabel}>I am a:</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={[styles.roleButton, role === 'patient' && styles.roleButtonActive]}
                onPress={() => setRole('patient')}
              >
                <Text style={[styles.roleButtonText, role === 'patient' && styles.roleButtonTextActive]}>
                  Patient
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleButton, role === 'doctor' && styles.roleButtonActive]}
                onPress={() => setRole('doctor')}
              >
                <Text style={[styles.roleButtonText, role === 'doctor' && styles.roleButtonTextActive]}>
                  Doctor
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Full Name"
                  placeholder="Enter your full name"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.fullName?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Password"
                  placeholder="Create a password"
                  isPassword
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.password?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  isPassword
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            <Button
              title="Sign Up"
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              fullWidth
              style={styles.submitButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Button 
              title="Sign In" 
              variant="ghost" 
              size="sm" 
              onPress={() => router.replace('/(auth)/login')} 
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg0,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    color: Colors.text1,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.bodyLarge,
    color: Colors.text2,
  },
  roleSelector: {
    marginBottom: Spacing.xl,
  },
  roleLabel: {
    ...Typography.bodyMedium,
    color: Colors.text2,
    marginBottom: Spacing.sm,
  },
  roleButtons: {
    flexDirection: 'row',
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    padding: 4,
  },
  roleButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  roleButtonActive: {
    backgroundColor: Colors.bg4,
  },
  roleButtonText: {
    ...Typography.buttonMedium,
    color: Colors.text2,
  },
  roleButtonTextActive: {
    color: Colors.text1,
  },
  form: {
    marginBottom: Spacing.xl,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    ...Typography.bodyMedium,
    color: Colors.text2,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 90, 101, 0.1)',
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 101, 0.3)',
  },
  errorText: {
    ...Typography.bodyMedium,
    color: Colors.danger,
  },
});
