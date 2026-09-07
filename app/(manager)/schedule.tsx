import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, useWindowDimensions, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, Database } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { formatTime, formatDate } from '@/lib/timezone';
import { Button } from '@/components/ui/Button';

type Appointment = Database['public']['Tables']['appointments']['Row'] & {
  profiles?: {
    full_name: string;
  } | null;
  doctor_profiles?: {
    profiles?: {
      full_name: string;
    } | null;
    specialty: string;
  } | null;
  appointment_slots?: {
    start_time: string;
    end_time: string;
  } | null;
};

export default function GlobalScheduleScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles(full_name),
          doctor_profiles(
            specialty,
            profiles(full_name)
          ),
          appointment_slots(start_time, end_time)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAppointments(data as Appointment[]);
    } catch (err) {
      console.error('Failed to fetch appointments', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (appointment: Appointment) => {
    Alert.alert('Cancel Appointment', 'Are you sure you want to cancel this appointment as an admin?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            const { error } = await supabase.rpc('cancel_appointment', {
              p_appointment_id: appointment.id,
              p_cancelled_by: 'manager',
              p_reason: 'Cancelled by hospital administration'
            });

            if (error) throw error;
            Alert.alert('Success', 'Appointment cancelled.');
            fetchAppointments();
          } catch (err: any) {
            console.error(err);
            Alert.alert('Error', err.message);
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  const renderAppointment = ({ item }: { item: Appointment }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.patientName}>{item.profiles?.full_name}</Text>
          <Text style={styles.doctorName}>Dr. {item.doctor_profiles?.profiles?.full_name}</Text>
        </View>
        <Badge text={item.status} status={item.status as any} />
      </View>
      <View style={styles.timeInfo}>
        <Text style={styles.dateText}>{item.appointment_slots?.start_time ? formatDate(item.appointment_slots.start_time) : 'N/A'}</Text>
        <Text style={styles.timeText}>{item.appointment_slots?.start_time ? formatTime(item.appointment_slots.start_time) : 'N/A'}</Text>
      </View>
      {item.status === 'scheduled' && (
        <View style={styles.actions}>
          <Button 
            title="Cancel" 
            variant="outline" 
            size="sm" 
            onPress={() => handleCancel(item)} 
          />
        </View>
      )}
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Global Schedule</Text>
        <Text style={styles.subtitle}>Monitor all hospital appointments</Text>
      </View>

      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, isTablet && styles.tabletListContent]}
        renderItem={renderAppointment}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No appointments found.</Text>
            </View>
          ) : null
        }
        refreshing={loading}
        onRefresh={fetchAppointments}
      />
      <LoadingOverlay visible={loading && appointments.length === 0} />
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
  card: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  patientName: {
    ...Typography.h3,
    color: Colors.text1,
    marginBottom: 2,
  },
  doctorName: {
    ...Typography.bodyMedium,
    color: Colors.text2,
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border1,
    marginBottom: Spacing.sm,
  },
  dateText: {
    ...Typography.bodyMedium,
    color: Colors.text1,
  },
  timeText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.sm,
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
