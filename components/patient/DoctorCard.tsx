import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PressableCard } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Database } from '@/lib/supabase';

type DoctorProfile = Database['public']['Tables']['doctor_profiles']['Row'] & {
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  } | null;
};

export interface DoctorCardProps {
  doctor: DoctorProfile;
  onPress: (doctor: DoctorProfile) => void;
}

export function DoctorCard({ doctor, onPress }: DoctorCardProps) {
  const name = doctor.profiles?.full_name || 'Unknown Doctor';
  const avatarUrl = doctor.profiles?.avatar_url;
  
  return (
    <PressableCard style={styles.container} onPress={() => onPress(doctor)}>
      <View style={styles.header}>
        <Avatar url={avatarUrl} name={name} size={64} style={styles.avatar} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>Dr. {name}</Text>
          <Text style={styles.specialty}>{doctor.specialty}</Text>
          
          <View style={styles.badges}>
            <View 
              style={[
                styles.deptBadge, 
                { backgroundColor: Colors.department[doctor.department] || Colors.primary }
              ]}
            >
              <Text style={styles.deptText}>{doctor.department}</Text>
            </View>
            <View style={styles.expBadge}>
              <Text style={styles.expText}>{doctor.experience_years} yrs exp</Text>
            </View>
          </View>
        </View>
      </View>
      
      {doctor.bio && (
        <Text style={styles.bio} numberOfLines={2}>
          {doctor.bio}
        </Text>
      )}
      
      <View style={styles.footer}>
        <Text style={styles.hospitalText}>{doctor.hospital_name || 'MediCare General'}</Text>
        <Text style={styles.bookText}>Book Slot</Text>
      </View>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  avatar: {
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    ...Typography.h4,
    color: Colors.text1,
    marginBottom: 2,
  },
  specialty: {
    ...Typography.bodyMedium,
    color: Colors.text2,
    marginBottom: Spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  deptBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  deptText: {
    ...Typography.bodySmall,
    color: '#fff',
    fontWeight: '600',
  },
  expBadge: {
    backgroundColor: Colors.bg3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  expText: {
    ...Typography.bodySmall,
    color: Colors.text2,
  },
  bio: {
    ...Typography.bodyMedium,
    color: Colors.text3,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border1,
  },
  hospitalText: {
    ...Typography.bodySmall,
    color: Colors.text2,
  },
  bookText: {
    ...Typography.buttonMedium,
    color: Colors.primary,
  },
});
