import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Alert } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { supabase, Database } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

type InsuranceProfile = Database['public']['Tables']['insurance_profiles']['Row'];

export function InsuranceUpload() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<InsuranceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [providerName, setProviderName] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [groupNumber, setGroupNumber] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    fetchInsurance();
  }, []);

  const fetchInsurance = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('insurance_profiles')
        .select('*')
        .eq('patient_id', user.id)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found
      
      if (data) {
        setProfile(data);
        if (data.card_image_path) {
          // Get signed URL for displaying the private image
          const { data: signedData, error: signedError } = await supabase.functions.invoke('get-signed-url', {
            body: { bucket: 'insurance-cards', path: data.card_image_path }
          });
          
          if (!signedError && signedData?.signed_url) {
            setImageUri(signedData.signed_url);
          }
        }
      }
    } catch (err) {
      console.error('Fetch insurance error', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permissions are required to scan your card.');
      return;
    }

    Alert.alert(
      'Upload Insurance Card',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              quality: 0.8,
              base64: true,
            });
            if (!result.canceled && result.assets[0].base64) {
              handleUpload(result.assets[0]);
            }
          }
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 0.8,
              base64: true,
            });
            if (!result.canceled && result.assets[0].base64) {
              handleUpload(result.assets[0]);
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleUpload = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!user) return;
    if (!providerName || !policyNumber) {
      Alert.alert('Missing Details', 'Please enter your Provider Name and Policy Number before uploading.');
      return;
    }

    setUploading(true);
    try {
      const ext = asset.uri.split('.').pop() || 'jpg';
      const fileName = `card_${Date.now()}.${ext}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to private bucket
      const { error: uploadError } = await supabase.storage
        .from('insurance-cards')
        .upload(filePath, decode(asset.base64!), {
          contentType: asset.mimeType || 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Save record in database
      const { error: dbError } = await supabase.from('insurance_profiles').insert({
        patient_id: user.id,
        provider_name: providerName,
        policy_number: policyNumber,
        group_number: groupNumber,
        card_image_path: filePath,
      });

      if (dbError) throw dbError;

      Alert.alert('Success', 'Insurance card uploaded successfully and is pending verification.');
      fetchInsurance();
      
    } catch (err: any) {
      console.error(err);
      Alert.alert('Upload Failed', err.message);
    } finally {
      setUploading(false);
    }
  };

  if (profile) {
    return (
      <Card style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Insurance Profile</Text>
          <Badge 
            text={profile.verified ? 'Verified' : 'Pending Verification'} 
            status={profile.verified ? 'completed' : 'pending'} 
          />
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Provider</Text>
            <Text style={styles.detailValue}>{profile.provider_name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Policy #</Text>
            <Text style={styles.detailValue}>{profile.policy_number}</Text>
          </View>
          {profile.group_number && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Group #</Text>
              <Text style={styles.detailValue}>{profile.group_number}</Text>
            </View>
          )}
        </View>

        {imageUri && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.cardImage} />
          </View>
        )}

        <Button 
          title="Update Insurance" 
          variant="outline" 
          style={{ marginTop: Spacing.md }}
          onPress={() => {
            setProfile(null);
            setProviderName(profile.provider_name);
            setPolicyNumber(profile.policy_number);
            setGroupNumber(profile.group_number || '');
          }} 
        />
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      <Text style={styles.title}>Add Insurance</Text>
      <Text style={styles.subtitle}>Upload your card for faster billing.</Text>

      <Input
        label="Provider Name"
        placeholder="e.g. Blue Cross"
        value={providerName}
        onChangeText={setProviderName}
      />
      <Input
        label="Policy Number"
        placeholder="Enter policy number"
        value={policyNumber}
        onChangeText={setPolicyNumber}
      />
      <Input
        label="Group Number (Optional)"
        placeholder="Enter group number"
        value={groupNumber}
        onChangeText={setGroupNumber}
      />

      <Button
        title="Scan & Upload Card"
        variant="primary"
        loading={uploading}
        onPress={handlePickImage}
        disabled={!providerName || !policyNumber}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h3,
    color: Colors.text1,
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: Colors.text2,
    marginBottom: Spacing.md,
  },
  details: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    backgroundColor: Colors.bg3,
    padding: Spacing.md,
    borderRadius: Radius.md,
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
    fontWeight: '600',
  },
  imageContainer: {
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  cardImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
});
