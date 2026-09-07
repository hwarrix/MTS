import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, Database } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { ApplicationCard } from '@/components/manager/ApplicationCard';
import { CredentialViewer } from '@/components/manager/CredentialViewer';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

type DoctorProfile = Database['public']['Tables']['doctor_profiles']['Row'] & {
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  } | null;
};

export default function VerificationsScreen() {
  const { user } = useAuthStore();
  const [applications, setApplications] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<DoctorProfile | null>(null);
  
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('doctor_profiles')
        .select(`
          *,
          profiles(full_name, avatar_url)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setApplications(data as DoctorProfile[]);
    } catch (err) {
      console.error('Failed to fetch applications', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (doctor: DoctorProfile) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('doctor_profiles')
        .update({ 
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', doctor.id);

      if (error) throw error;

      // Send push notification to doctor
      await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: doctor.id,
          title: 'Account Approved! 🎉',
          body: 'Your doctor profile has been verified. You can now manage your schedule.',
          data: { type: 'doctor_verified' }
        }
      });

      Alert.alert('Success', 'Doctor approved successfully');
      setSelectedApp(null);
      fetchApplications();
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to approve doctor');
      setLoading(false);
    }
  };

  const handleReject = async (doctor: DoctorProfile) => {
    Alert.prompt(
      'Reject Application',
      'Please provide a reason for rejection (optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('doctor_profiles')
                .update({ 
                  status: 'rejected',
                  rejection_reason: reason || 'Application did not meet criteria.'
                })
                .eq('id', doctor.id);

              if (error) throw error;

              // Send push notification to doctor
              await supabase.functions.invoke('send-push-notification', {
                body: {
                  user_id: doctor.id,
                  title: 'Account Update',
                  body: 'Your doctor application was rejected. Please contact support.',
                  data: { type: 'doctor_rejected' }
                }
              });

              Alert.alert('Success', 'Application rejected');
              setSelectedApp(null);
              fetchApplications();
            } catch (err: any) {
              console.error(err);
              Alert.alert('Error', 'Failed to reject doctor');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Pending Verifications</Text>
        <Text style={styles.subtitle}>Review new doctor applications</Text>
      </View>

      <FlatList
        data={applications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, isTablet && styles.tabletListContent]}
        renderItem={({ item }) => (
          <ApplicationCard 
            doctor={item} 
            onView={setSelectedApp} 
            isTablet={isTablet} 
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No pending applications.</Text>
            </View>
          ) : null
        }
        refreshing={loading && !selectedApp}
        onRefresh={fetchApplications}
      />

      {selectedApp && (
        <CredentialViewer
          doctor={selectedApp}
          onClose={() => setSelectedApp(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      <LoadingOverlay visible={loading && applications.length === 0} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg0,
  },
  header: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border1,
    backgroundColor: Colors.bg1,
  },
  title: {
    ...Typography.h1,
    color: Colors.text1,
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: Colors.text2,
    marginTop: 4,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  tabletListContent: {
    padding: Spacing.xl,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: 100,
  },
  emptyText: {
    ...Typography.bodyLarge,
    color: Colors.text2,
  },
});
