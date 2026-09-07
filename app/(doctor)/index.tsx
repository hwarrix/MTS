import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { supabase, Database } from '@/lib/supabase';
import { Colors, Spacing } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { ScheduleItem } from '@/components/doctor/ScheduleItem';
import { PendingBanner } from '@/components/doctor/PendingBanner';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { Button } from '@/components/ui/Button';
import { SlotManager } from '@/components/doctor/SlotManager';
import { isOnline, getCachedSchedule, cacheDoctorSchedule, getLastSyncTime } from '@/lib/offline';
import { formatDayHeading } from '@/lib/timezone';

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

type Slot = Database['public']['Tables']['appointment_slots']['Row'];

export default function DoctorScheduleScreen() {
  const { user, doctorProfile } = useAuthStore();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  
  const [showSlotManager, setShowSlotManager] = useState(false);

  const fetchSchedule = useCallback(async () => {
    if (!user) return;
    
    const online = await isOnline();
    setOffline(!online);

    if (!online) {
      // Load from SQLite cache
      const cached = await getCachedSchedule(user.id);
      setAppointments(cached);
      const syncTime = await getLastSyncTime(user.id);
      setLastSync(syncTime);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // Fetch today's appointments
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data: apptData, error: apptError } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles(full_name, avatar_url),
          appointment_slots!inner(start_time, end_time)
        `)
        .eq('doctor_id', user.id)
        .eq('status', 'scheduled')
        .gte('appointment_slots.start_time', startOfDay.toISOString())
        .lte('appointment_slots.start_time', endOfDay.toISOString())
        .order('appointment_slots(start_time)', { ascending: true });

      if (apptError) throw apptError;
      setAppointments(apptData as Appointment[]);

      // Fetch today's slots for SlotManager
      const { data: slotData, error: slotError } = await supabase
        .from('appointment_slots')
        .select('*')
        .eq('doctor_id', user.id)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .order('start_time', { ascending: true });

      if (slotError) throw slotError;
      setSlots(slotData as Slot[]);

      // Update local SQLite cache
      const cacheData = (apptData as Appointment[]).map(a => ({
        id: a.id,
        slot_id: a.slot_id,
        patient_id: a.patient_id,
        patient_name: a.profiles?.full_name || 'Unknown',
        doctor_id: a.doctor_id,
        status: a.status,
        notes: a.notes,
        start_time: a.appointment_slots!.start_time,
        end_time: a.appointment_slots!.end_time,
        cached_at: new Date().toISOString()
      }));

      await cacheDoctorSchedule(user.id, cacheData);
      setLastSync(new Date().toISOString());

    } catch (err) {
      console.error('Failed to fetch schedule', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedule();
  };

  const handleToggleSlot = async (slot: Slot) => {
    try {
      const newStatus = !slot.is_available;
      
      // Optimistic update
      setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, is_available: newStatus } : s));

      const { error } = await supabase
        .from('appointment_slots')
        .update({ is_available: newStatus })
        .eq('id', slot.id);

      if (error) throw error;
      
    } catch (err) {
      console.error('Failed to toggle slot', err);
      // Revert optimistic update
      setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, is_available: slot.is_available } : s));
    }
  };

  const isPending = doctorProfile?.status !== 'approved';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PendingBanner status={doctorProfile?.status} />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Today's Schedule</Text>
          <Text style={styles.subtitle}>{formatDayHeading(new Date().toISOString())}</Text>
        </View>
        {!isPending && !offline && (
          <Button 
            title="Manage Slots" 
            variant="outline" 
            size="sm"
            onPress={() => setShowSlotManager(true)} 
          />
        )}
      </View>

      {offline && lastSync && (
        <View style={styles.offlineInfo}>
          <Text style={styles.offlineText}>Last synced: {new Date(lastSync).toLocaleTimeString()}</Text>
        </View>
      )}

      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ScheduleItem 
            appointment={!offline ? item : undefined}
            cachedAppointment={offline ? item : undefined}
            isOffline={offline}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>You have no appointments today.</Text>
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
      
      {showSlotManager && (
        <SlotManager 
          slots={slots} 
          onClose={() => setShowSlotManager(false)} 
          onToggleSlot={handleToggleSlot}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  offlineInfo: {
    backgroundColor: Colors.bg2,
    padding: Spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border1,
  },
  offlineText: {
    ...Typography.bodySmall,
    color: Colors.text3,
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
