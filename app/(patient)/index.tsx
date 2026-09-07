import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, Database } from '@/lib/supabase';
import { Colors, Spacing } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { DoctorCard } from '@/components/patient/DoctorCard';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { Input } from '@/components/ui/Input';
import { BookingSheet } from '@/components/patient/BookingSheet';

type DoctorProfile = Database['public']['Tables']['doctor_profiles']['Row'] & {
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  } | null;
};

export default function DiscoverScreen() {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('doctor_profiles')
        .select(`
          *,
          profiles(full_name, avatar_url)
        `)
        .eq('status', 'approved');

      if (error) throw error;
      setDoctors(data as DoctorProfile[]);
    } catch (err) {
      console.error('Failed to fetch doctors', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const q = searchQuery.toLowerCase();
    return (
      doc.profiles?.full_name.toLowerCase().includes(q) ||
      doc.specialty.toLowerCase().includes(q) ||
      doc.department.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Find a Doctor</Text>
        <Input
          placeholder="Search by name, specialty or department..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={filteredDoctors}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <DoctorCard doctor={item} onPress={setSelectedDoctor} />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No doctors found matching your search.</Text>
            </View>
          ) : null
        }
      />

      <LoadingOverlay visible={loading && doctors.length === 0} />
      
      {selectedDoctor && (
        <BookingSheet 
          doctor={selectedDoctor} 
          onClose={() => setSelectedDoctor(null)} 
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
    padding: Spacing.md,
    paddingBottom: 0,
  },
  title: {
    ...Typography.h1,
    color: Colors.text1,
    marginBottom: Spacing.md,
  },
  searchInput: {
    marginBottom: 0,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.bodyLarge,
    color: Colors.text2,
    textAlign: 'center',
  },
});
