import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Database } from '@/lib/supabase';
import { formatDate } from '@/lib/timezone';

type DoctorProfile = Database['public']['Tables']['doctor_profiles']['Row'] & {
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  } | null;
};

export interface ApplicationCardProps {
  doctor: DoctorProfile;
  onView: (doctor: DoctorProfile) => void;
  isTablet?: boolean;
}

export function ApplicationCard({ doctor, onView, isTablet = false }: ApplicationCardProps) {
  const name = doctor.profiles?.full_name || 'Unknown Doctor';
  const avatarUrl = doctor.profiles?.avatar_url;

  return (
    <Card style={[styles.container, isTablet && styles.tabletContainer]}>
      <View style={styles.content}>
        <Avatar url={avatarUrl} name={name} size={isTablet ? 64 : 48} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>Dr. {name}</Text>
          <Text style={styles.details}>
            {doctor.specialty} · {doctor.department}
          </Text>
          <Text style={styles.date}>
            Applied: {formatDate(doctor.created_at)}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button 
          title="Review" 
          variant="primary" 
          size={isTablet ? 'md' : 'sm'} 
          fullWidth={!isTablet}
          onPress={() => onView(doctor)} 
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  tabletContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  info: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  name: {
    ...Typography.h3,
    color: Colors.text1,
    marginBottom: 4,
  },
  details: {
    ...Typography.bodyMedium,
    color: Colors.text2,
  },
  date: {
    ...Typography.bodySmall,
    color: Colors.text3,
    marginTop: 4,
  },
  actions: {
    justifyContent: 'center',
  },
});
