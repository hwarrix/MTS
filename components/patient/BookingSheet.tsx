import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { supabase, Database } from '@/lib/supabase';
import { formatTime, formatDayHeading } from '@/lib/timezone';
import { Button } from '@/components/ui/Button';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { useAuthStore } from '@/stores/authStore';

type DoctorProfile = Database['public']['Tables']['doctor_profiles']['Row'] & {
  profiles?: {
    full_name: string;
  } | null;
};

type Slot = Database['public']['Tables']['appointment_slots']['Row'];

interface GroupedSlots {
  [dateHeading: string]: Slot[];
}

export interface BookingSheetProps {
  doctor: DoctorProfile;
  onClose: () => void;
}

export function BookingSheet({ doctor, onClose }: BookingSheetProps) {
  const { session } = useAuthStore();
  const [slots, setSlots] = useState<GroupedSlots>({});
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('appointment_slots')
        .select('*')
        .eq('doctor_id', doctor.id)
        .eq('is_available', true)
        .gte('start_time', now)
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Group by day
      const grouped: GroupedSlots = {};
      (data as Slot[]).forEach((slot) => {
        const heading = formatDayHeading(slot.start_time);
        if (!grouped[heading]) grouped[heading] = [];
        grouped[heading].push(slot);
      });

      setSlots(grouped);
    } catch (err) {
      console.error('Failed to fetch slots', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!selectedSlot || !session) return;
    
    setBookingLoading(true);
    try {
      // Call edge function for transactional booking
      const { data, error } = await supabase.functions.invoke('book-appointment', {
        body: { slot_id: selectedSlot.id },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error);

      Alert.alert('Success', 'Appointment booked successfully!', [
        { text: 'OK', onPress: onClose }
      ]);
      
    } catch (err: any) {
      console.error('Booking error', err);
      Alert.alert('Booking Failed', err.message || 'The slot might have just been taken. Please try another.');
      // Refresh slots on failure (in case it was double booked)
      fetchSlots();
      setSelectedSlot(null);
    } finally {
      setBookingLoading(false);
    }
  };

  const renderSlotGroup = ({ item: dateHeading }: { item: string }) => (
    <View style={styles.groupContainer}>
      <Text style={styles.dateHeading}>{dateHeading}</Text>
      <View style={styles.slotsGrid}>
        {slots[dateHeading].map((slot) => {
          const isSelected = selectedSlot?.id === slot.id;
          return (
            <TouchableOpacity
              key={slot.id}
              style={[
                styles.slotButton,
                isSelected && styles.slotButtonActive
              ]}
              onPress={() => setSelectedSlot(slot)}
            >
              <Text style={[
                styles.slotText,
                isSelected && styles.slotTextActive
              ]}>
                {formatTime(slot.start_time)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Book Appointment</Text>
            <Text style={styles.subtitle}>Dr. {doctor.profiles?.full_name}</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <LoadingOverlay visible={true} />
            </View>
          ) : Object.keys(slots).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No available slots at the moment.</Text>
            </View>
          ) : (
            <FlatList
              data={Object.keys(slots)}
              keyExtractor={(item) => item}
              renderItem={renderSlotGroup}
              contentContainerStyle={styles.listContent}
            />
          )}

          <View style={styles.footer}>
            <Button
              title="Cancel"
              variant="outline"
              style={styles.actionBtn}
              onPress={onClose}
            />
            <Button
              title={bookingLoading ? "Booking..." : "Confirm"}
              style={styles.actionBtn}
              onPress={handleBook}
              disabled={!selectedSlot || bookingLoading}
              loading={bookingLoading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.bg1,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    height: '80%',
  },
  header: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border1,
  },
  title: {
    ...Typography.h2,
    color: Colors.text1,
  },
  subtitle: {
    ...Typography.bodyLarge,
    color: Colors.primary,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    ...Typography.bodyLarge,
    color: Colors.text2,
  },
  listContent: {
    padding: Spacing.lg,
  },
  groupContainer: {
    marginBottom: Spacing.xl,
  },
  dateHeading: {
    ...Typography.h4,
    color: Colors.text1,
    marginBottom: Spacing.md,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  slotButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.bg2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border2,
    width: '30%',
    alignItems: 'center',
  },
  slotButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  slotText: {
    ...Typography.buttonMedium,
    color: Colors.text2,
  },
  slotTextActive: {
    color: '#FFF',
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border1,
    backgroundColor: Colors.bg2,
    paddingBottom: Spacing.xl, // Safe area for iOS
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
});
