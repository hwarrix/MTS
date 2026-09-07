import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { View, StatusBar } from 'react-native';

export default function RootLayout() {
  const { session, profile, doctorProfile, initialized, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      if (!inAuthGroup) {
        // Redirect to the sign-in page.
        router.replace('/(auth)/login');
      }
    } else if (session && profile) {
      if (inAuthGroup) {
        // Redirect away from the sign-in page.
        const role = profile.role;
        if (role === 'patient') {
          router.replace('/(patient)');
        } else if (role === 'doctor') {
          if (doctorProfile?.status === 'pending') {
            // Can be sent to a pending verification screen or just block access
            // Assuming doctor home will show the pending banner if needed
            router.replace('/(doctor)');
          } else {
            router.replace('/(doctor)');
          }
        } else if (role === 'manager') {
          router.replace('/(manager)');
        }
      }
    }
  }, [session, initialized, segments, profile, doctorProfile]);

  if (!initialized) {
    return <LoadingOverlay visible={true} />;
  }

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: Colors.bg0 }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg0} />
      <OfflineBanner />
      <Slot />
    </SafeAreaProvider>
  );
}
