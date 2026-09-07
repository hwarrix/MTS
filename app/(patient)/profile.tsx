import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { InsuranceUpload } from '@/components/patient/InsuranceUpload';
import { registerForPushNotifications } from '@/lib/notifications';

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuthStore();

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
      Alert.alert('Notice', 'Failed to enable push notifications. Check settings.');
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
            <Text style={styles.name}>{profile?.full_name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Insurance</Text>
          <InsuranceUpload />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <Text style={styles.settingText}>Push Notifications</Text>
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
  settingCard: {
    backgroundColor: Colors.bg1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingText: {
    ...Typography.bodyLarge,
    color: Colors.text1,
  },
  footer: {
    marginTop: Spacing.lg,
  },
});
