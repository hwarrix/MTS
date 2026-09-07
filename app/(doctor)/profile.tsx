import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { registerForPushNotifications } from '@/lib/notifications';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export default function DoctorProfileScreen() {
  const { user, profile, doctorProfile, signOut } = useAuthStore();
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [hasBiometricsHardware, setHasBiometricsHardware] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setHasBiometricsHardware(hasHardware && isEnrolled);
    
    if (hasHardware && isEnrolled) {
      const enabled = await SecureStore.getItemAsync('biometrics_enabled');
      setBiometricsEnabled(enabled === 'true');
    }
  };

  const toggleBiometrics = async (value: boolean) => {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable Biometric Login',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        await SecureStore.setItemAsync('biometrics_enabled', 'true');
        setBiometricsEnabled(true);
        Alert.alert('Success', 'Biometric login enabled.');
      }
    } else {
      await SecureStore.deleteItemAsync('biometrics_enabled');
      setBiometricsEnabled(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut }
    ]);
  };

  const enableNotifications = async () => {
    if (!user) return;
    const token = await registerForPushNotifications(user.id);
    if (token) {
      Alert.alert('Success', 'Push notifications enabled!');
    } else {
      Alert.alert('Notice', 'Failed to enable push notifications. Check device settings.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Avatar 
            url={profile?.avatar_url} 
            name={profile?.full_name} 
            size={80} 
          />
          <View style={styles.headerInfo}>
            <Text style={styles.name}>Dr. {profile?.full_name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={styles.statusBadge}>
               <Badge 
                 text={doctorProfile?.status || 'pending'} 
                 status={doctorProfile?.status as any} 
               />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Details</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Specialty</Text>
              <Text style={styles.detailValue}>{doctorProfile?.specialty}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Department</Text>
              <Text style={styles.detailValue}>{doctorProfile?.department}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Experience</Text>
              <Text style={styles.detailValue}>{doctorProfile?.experience_years} years</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Hospital</Text>
              <Text style={styles.detailValue}>{doctorProfile?.hospital_name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>License #</Text>
              <Text style={styles.detailValue}>{doctorProfile?.license_number}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security & Settings</Text>
          
          <View style={styles.settingCard}>
            {hasBiometricsHardware && (
              <View style={[styles.settingRow, styles.settingRowBorder]}>
                <View>
                  <Text style={styles.settingText}>Biometric Login</Text>
                  <Text style={styles.settingSubtext}>Face ID / Fingerprint</Text>
                </View>
                <Switch
                  value={biometricsEnabled}
                  onValueChange={toggleBiometrics}
                  trackColor={{ false: Colors.border2, true: Colors.primary }}
                  thumbColor={Colors.text1}
                />
              </View>
            )}

            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingText}>Push Notifications</Text>
                <Text style={styles.settingSubtext}>Get alerts for new bookings</Text>
              </View>
              <Button 
                title="Enable" 
                variant="outline" 
                size="sm" 
                onPress={enableNotifications} 
              />
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Button 
            title="Sign Out" 
            variant="danger" 
            fullWidth 
            onPress={handleLogout} 
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg0,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: Colors.bg1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  headerInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  name: {
    ...Typography.h2,
    color: Colors.text1,
    marginBottom: 4,
  },
  email: {
    ...Typography.bodyMedium,
    color: Colors.text2,
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text1,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  detailsCard: {
    backgroundColor: Colors.bg1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border1,
    gap: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    ...Typography.bodyMedium,
    color: Colors.text3,
  },
  detailValue: {
    ...Typography.bodyMedium,
    color: Colors.text1,
    fontWeight: '500',
  },
  settingCard: {
    backgroundColor: Colors.bg1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border1,
  },
  settingText: {
    ...Typography.bodyLarge,
    color: Colors.text1,
  },
  settingSubtext: {
    ...Typography.bodySmall,
    color: Colors.text3,
    marginTop: 2,
  },
  footer: {
    marginTop: Spacing.lg,
  },
});
