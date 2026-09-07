import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Colors, Spacing } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { formatTime } from '@/lib/timezone';
import { Database } from '@/lib/supabase';

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

// Also support CachedAppointment for offline mode
type CachedAppointment = {
  id: string;
  patient_name: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string | null;
};

export interface ScheduleItemProps {
  appointment?: Appointment;
  cachedAppointment?: CachedAppointment;
  isOffline?: boolean;
}

export function ScheduleItem({ appointment, cachedAppointment, isOffline = false }: ScheduleItemProps) {
  const isCached = isOffline && cachedAppointment;
  
  const id = isCached ? cachedAppointment!.id : appointment!.id;
  const patientName = isCached ? cachedAppointment!.patient_name : (appointment!.profiles?.full_name || 'Unknown Patient');
  const startTime = isCached ? cachedAppointment!.start_time : appointment!.appointment_slots?.start_time;
  const endTime = isCached ? cachedAppointment!.end_time : appointment!.appointment_slots?.end_time;
  const status = isCached ? cachedAppointment!.status : appointment!.status;
  const notes = isCached ? cachedAppointment!.notes : appointment!.notes;

  return (
    <Card style={styles.container}>
      <View style={styles.timeLine}>
        <Text style={styles.timeText}>{startTime ? formatTime(startTime) : 'N/A'}</Text>
        <Text style={styles.timeTextDesc}>to {endTime ? formatTime(endTime) : 'N/A'}</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.patientName} numberOfLines={1}>{patientName}</Text>
          <Badge text={status} status={status as any} />
        </View>

        {notes && (
          <Text style={styles.notes} numberOfLines={2}>Note: {notes}</Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  timeLine: {
    width: 80,
    borderRightWidth: 2,
    borderRightColor: Colors.primary,
    paddingRight: Spacing.md,
    marginRight: Spacing.md,
    justifyContent: 'center',
  },
  timeText: {
    ...Typography.h4,
    color: Colors.text1,
  },
  timeTextDesc: {
    ...Typography.bodySmall,
    color: Colors.text3,
    marginTop: 2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  patientName: {
    ...Typography.h4,
    color: Colors.text1,
    flex: 1,
    marginRight: Spacing.sm,
  },
  notes: {
    ...Typography.bodySmall,
    color: Colors.text2,
    marginTop: Spacing.xs,
  },
});
