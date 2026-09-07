import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Image, Alert, useWindowDimensions } from 'react-native';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Button } from '@/components/ui/Button';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { supabase, Database } from '@/lib/supabase';

type DoctorProfile = Database['public']['Tables']['doctor_profiles']['Row'] & {
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  } | null;
};

export interface CredentialViewerProps {
  doctor: DoctorProfile;
  onClose: () => void;
  onApprove: (doctor: DoctorProfile) => void;
  onReject: (doctor: DoctorProfile) => void;
}

export function CredentialViewer({ doctor, onClose, onApprove, onReject }: CredentialViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      // Fetch credential record
      const { data, error } = await supabase
        .from('doctor_credentials')
        .select('*')
        .eq('doctor_id', doctor.id)
        .eq('file_type', 'certificate')
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          Alert.alert('Missing Documents', 'This doctor has not uploaded any credentials yet.');
        } else {
          throw error;
        }
      }

      if (data && data.storage_path) {
        // Fetch signed URL for private bucket
        const { data: signedData, error: signedError } = await supabase.functions.invoke('get-signed-url', {
          body: { bucket: 'doctor-credentials', path: data.storage_path }
        });

        if (signedError) throw signedError;
        if (signedData?.signed_url) {
          setImageUrl(signedData.signed_url);
        }
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  const name = doctor.profiles?.full_name || 'Unknown';

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, isTablet && styles.tabletContainer]}>
          <View style={styles.header}>
            <Text style={styles.title}>Review Application</Text>
            <Text style={styles.subtitle}>Dr. {name}</Text>
          </View>

          <View style={[styles.content, isTablet && styles.tabletContent]}>
            <View style={styles.infoSection}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Specialty</Text>
                <Text style={styles.detailValue}>{doctor.specialty}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Department</Text>
                <Text style={styles.detailValue}>{doctor.department}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>License #</Text>
                <Text style={styles.detailValue}>{doctor.license_number}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Experience</Text>
                <Text style={styles.detailValue}>{doctor.experience_years} years</Text>
              </View>
            </View>

            <View style={[styles.imageSection, isTablet && styles.tabletImageSection]}>
              <Text style={styles.detailLabel}>Medical Certificate</Text>
              <View style={styles.imageContainer}>
                {loading ? (
                  <LoadingOverlay visible={true} />
                ) : imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
                ) : (
                  <Text style={styles.noImageText}>No certificate found</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              title="Close"
              variant="outline"
              style={styles.actionBtn}
              onPress={onClose}
            />
            <Button
              title="Reject"
              variant="danger"
              style={styles.actionBtn}
              onPress={() => onReject(doctor)}
            />
            <Button
              title="Approve"
              variant="primary"
              style={styles.actionBtn}
              onPress={() => onApprove(doctor)}
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  container: {
    backgroundColor: Colors.bg1,
    borderRadius: Radius.xl,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  tabletContainer: {
    width: '80%',
    maxWidth: 900,
  },
  header: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border1,
    backgroundColor: Colors.bg2,
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
  content: {
    padding: Spacing.lg,
  },
  tabletContent: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  infoSection: {
    flex: 1,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border1,
    paddingBottom: Spacing.sm,
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
  imageSection: {
    flex: 2,
  },
  tabletImageSection: {
    flex: 2,
  },
  imageContainer: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.bg0,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border1,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  noImageText: {
    ...Typography.bodyMedium,
    color: Colors.text3,
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border1,
    backgroundColor: Colors.bg2,
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
});
