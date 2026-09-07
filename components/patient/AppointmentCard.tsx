import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { formatTime, formatDate } from '@/lib/timezone';
import { Database } from '@/lib/supabase';

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

export interface AppointmentCardProps {
  appointment: Appointment;
  onCancel?: (id: string) => void;
  onReschedule?: (appointment: Appointment) => void;
}

export function AppointmentCard({ appointment, onCancel, onReschedule }: AppointmentCardProps) {
  const isUpcoming = appointment.status === 'scheduled';
  const doctorName = appointment.doctor_profiles?.profiles?.full_name || 'Doctor';
  const avatarUrl = appointment.doctor_profiles?.profiles?.avatar_url;
  const specialty = appointment.doctor_profiles?.specialty;
  const startTime = appointment.appointment_slots?.start_time;

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.dateContainer}>
          <Text style={styles.dateLabel}>Date & Time</Text>
          <Text style={styles.dateText}>
            {startTime ? `${formatDate(startTime)} · ${formatTime(startTime)}` : 'TBD'}
          </Text>
        </View>
        <Badge text={appointment.status} status={appointment.status as any} />
      </View>

      <View style={styles.doctorInfo}>
        <Avatar url={avatarUrl} name={doctorName} size={48} />
        <View style={styles.doctorText}>
          <Text style={styles.name}>Dr. {doctorName}</Text>
          <Text style={styles.specialty}>{specialty}</Text>
        </View>
      </View>

      {isUpcoming && (
        <View style={styles.actions}>
          <Button
            title="Cancel"
            variant="outline"
            size="sm"
            style={styles.actionButton}
            onPress={() => onCancel?.(appointment.id)}
          />
          <Button
            title="Reschedule"
            variant="primary"
            size="sm"
            style={styles.actionButton}
            onPress={() => onReschedule?.(appointment)}
          />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border1,
  },
  dateContainer: {
    flex: 1,
  },
  dateLabel: {
    ...Typography.bodySmall,
    color: Colors.text3,
    marginBottom: 4,
  },
  dateText: {
    ...Typography.bodyMedium,
    color: Colors.text1,
    fontWeight: '600',
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  name: {
    ...Typography.h4,
    color: Colors.text1,
  },
  specialty: {
    ...Typography.bodyMedium,
    color: Colors.text2,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border1,
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  actionButton: {
    minWidth: 100,
  },
});
