import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, useWindowDimensions, Modal, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, Database } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { formatDate } from '@/lib/timezone';

type InsuranceProfile = Database['public']['Tables']['insurance_profiles']['Row'] & {
  profiles?: {
    full_name: string;
  } | null;
};

export default function InsuranceScreen() {
  const [profiles, setProfiles] = useState<InsuranceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  useEffect(() => {
    fetchInsurance();
  }, []);

  const fetchInsurance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('insurance_profiles')
        .select(`
          *,
          profiles(full_name)
        `)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setProfiles(data as InsuranceProfile[]);
    } catch (err) {
      console.error('Failed to fetch insurance', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (profile: InsuranceProfile) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('insurance_profiles')
        .update({ verified: true })
        .eq('id', profile.id);

      if (error) throw error;
      
      Alert.alert('Success', 'Insurance verified successfully.');
      fetchInsurance();
    } catch (err) {
      console.error('Failed to verify', err);
      Alert.alert('Error', 'Failed to verify insurance.');
      setLoading(false);
    }
  };

  const viewCard = async (path: string | null) => {
    if (!path) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-signed-url', {
        body: { bucket: 'insurance-cards', path }
      });
      if (error) throw error;
      if (data?.signed_url) {
        setSelectedImage(data.signed_url);
      }
    } catch (err) {
      console.error('Failed to view card', err);
      Alert.alert('Error', 'Failed to load image.');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: InsuranceProfile }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.patientName}>{item.profiles?.full_name}</Text>
          <Text style={styles.dateText}>Uploaded: {formatDate(item.uploaded_at)}</Text>
        </View>
        <Badge text={item.verified ? 'Verified' : 'Pending'} status={item.verified ? 'completed' : 'pending'} />
      </View>
      
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Provider</Text>
          <Text style={styles.detailValue}>{item.provider_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Policy #</Text>
          <Text style={styles.detailValue}>{item.policy_number}</Text>
        </View>
        {item.group_number && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Group #</Text>
            <Text style={styles.detailValue}>{item.group_number}</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Button 
          title="View Card" 
          variant="outline" 
          size="sm" 
          disabled={!item.card_image_path}
          onPress={() => viewCard(item.card_image_path)} 
          style={styles.actionBtn}
        />
        {!item.verified && (
          <Button 
            title="Verify" 
            variant="primary" 
            size="sm" 
            onPress={() => handleVerify(item)} 
            style={styles.actionBtn}
          />
        )}
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Insurance Claims</Text>
        <Text style={styles.subtitle}>Review and verify patient insurance</Text>
      </View>

      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, isTablet && styles.tabletListContent]}
        renderItem={renderItem}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No insurance records found.</Text>
            </View>
          ) : null
        }
        refreshing={loading && !selectedImage}
        onRefresh={fetchInsurance}
      />

      {selectedImage && (
        <Modal transparent visible={true} animationType="fade" onRequestClose={() => setSelectedImage(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
              <Button title="Close" onPress={() => setSelectedImage(null)} style={{ marginTop: Spacing.md }} fullWidth />
            </View>
          </View>
        </Modal>
      )}

      <LoadingOverlay visible={loading && profiles.length === 0} />
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
  dateText: {
    ...Typography.bodySmall,
    color: Colors.text3,
  },
  details: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    backgroundColor: Colors.bg2,
    padding: Spacing.md,
    borderRadius: Radius.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    ...Typography.bodyMedium,
    color: Colors.text3,
  },
  detailValue: {
    ...Typography.bodyMedium,
    color: Colors.text1,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  actionBtn: {
    minWidth: 100,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalContent: {
    backgroundColor: Colors.bg1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    width: '100%',
    maxWidth: 600,
    height: '60%',
  },
  fullImage: {
    flex: 1,
    width: '100%',
    borderRadius: Radius.sm,
  },
});
