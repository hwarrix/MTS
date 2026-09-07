import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { supabase, Database } from '@/lib/supabase';
import { Colors, Spacing } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { ScheduleItem } from '@/components/doctor/ScheduleItem';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { PendingBanner } from '@/components/doctor/PendingBanner';

type Appointment = Database['public']['Tables']['appointments']['Row'] & {
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  } | null;
  appointment_slots?: {
    start_time: string;
    end_time: string;
  } | null;
};

export default function DoctorQueueScreen() {
  const { user, doctorProfile } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQueue = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles(full_name, avatar_url),
          appointment_slots!inner(start_time, end_time)
        `)
        .eq('doctor_id', user.id)
        .in('status', ['scheduled', 'rescheduled'])
        .order('appointment_slots(start_time)', { ascending: true });

      if (error) throw error;
      setAppointments(data as Appointment[]);
    } catch (err) {
      console.error('Failed to fetch queue', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchQueue();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PendingBanner status={doctorProfile?.status} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Patient Queue</Text>
        <Text style={styles.subtitle}>All upcoming appointments</Text>
      </View>

      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ScheduleItem appointment={item} />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Queue is empty.</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      />

      <LoadingOverlay visible={loading && !refreshing} />
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
