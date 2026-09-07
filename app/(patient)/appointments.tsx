import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, Database } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { AppointmentCard } from '@/components/patient/AppointmentCard';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

type Appointment = Database['public']['Tables']['appointments']['Row'] & {
  doctor_profiles?: {
    profiles?: {
      full_name: string;
      avatar_url: string | null;
    } | null;
    specialty: string;
  } | null;
  appointment_slots?: {
    start_time: string;
    end_time: string;
  } | null;
};

export default function AppointmentsScreen() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor_profiles(
            specialty,
            profiles(full_name, avatar_url)
          ),
          appointment_slots(start_time, end_time)
        `)
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Sort in memory to put upcoming first
      const sorted = (data as Appointment[]).sort((a, b) => {
        const timeA = new Date(a.appointment_slots?.start_time || 0).getTime();
        const timeB = new Date(b.appointment_slots?.start_time || 0).getTime();
        return timeB - timeA; // Descending
      });
      
      setAppointments(sorted);
    } catch (err) {
      console.error('Failed to fetch appointments', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    Alert.alert(
      "Cancel Appointment",
      "Are you sure you want to cancel this appointment?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes, Cancel", 
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const { data, error } = await supabase.rpc('cancel_appointment', {
                p_appointment_id: id,
                p_cancelled_by: 'patient',
                p_reason: 'Patient cancelled via app'
              });

              if (error) throw error;
              if (!data.success) throw new Error(data.error);

              Alert.alert('Success', 'Appointment cancelled successfully');
              fetchAppointments();
            } catch (err: any) {
              console.error(err);
              Alert.alert('Error', err.message || 'Failed to cancel appointment');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleReschedule = (appointment: Appointment) => {
    Alert.alert('Reschedule', 'To reschedule, please cancel this appointment and book a new one.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Appointments</Text>
      </View>

      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <AppointmentCard 
            appointment={item} 
            onCancel={handleCancel}
            onReschedule={handleReschedule}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>You have no appointments yet.</Text>
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
