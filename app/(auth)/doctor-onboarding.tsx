import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';

const doctorOnboardingSchema = z.object({
  specialty: z.string().min(2, 'Specialty is required'),
  department: z.string().min(2, 'Department is required'),
  licenseNumber: z.string().min(4, 'License number is required'),
  experienceYears: z.string().regex(/^\d+$/, 'Must be a valid number'),
  hospitalName: z.string().min(2, 'Hospital name is required'),
  bio: z.string().optional(),
});

type DoctorOnboardingFormData = z.infer<typeof doctorOnboardingSchema>;

export default function DoctorOnboardingScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [certificateImage, setCertificateImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  
  const { control, handleSubmit, formState: { errors } } = useForm<DoctorOnboardingFormData>({
    resolver: zodResolver(doctorOnboardingSchema),
  });

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You've refused to allow this app to access your photos!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setCertificateImage(result.assets[0]);
    }
  };

  const uploadCertificate = async (doctorId: string, asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64) throw new Error('Image base64 data missing');
    
    const ext = asset.uri.split('.').pop();
    const fileName = `certificate_${Date.now()}.${ext}`;
    const filePath = `${doctorId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('doctor-credentials')
      .upload(filePath, decode(asset.base64), {
        contentType: asset.mimeType || 'image/jpeg',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { error: dbError } = await supabase.from('doctor_credentials').insert({
      doctor_id: doctorId,
      file_type: 'certificate',
      file_name: fileName,
      storage_path: filePath,
      mime_type: asset.mimeType || 'image/jpeg',
    });

    if (dbError) throw dbError;
  };

  const onSubmit = async (data: DoctorOnboardingFormData) => {
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!certificateImage) {
      Alert.alert('Error', 'Please upload your medical certificate or license document');
      return;
    }

    setLoading(true);
    try {
      // 1. Create doctor profile
      const { error: profileError } = await supabase.from('doctor_profiles').insert({
        id: user.id,
        specialty: data.specialty,
        department: data.department,
        license_number: data.licenseNumber,
        experience_years: parseInt(data.experienceYears, 10),
        hospital_name: data.hospitalName,
        bio: data.bio,
        status: 'pending'
      });

      if (profileError) throw profileError;

      // 2. Upload certificate
      await uploadCertificate(user.id, certificateImage);

      // 3. Refresh local auth state and navigate
      await refreshProfile();
      router.replace('/(doctor)');

    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Doctor Onboarding</Text>
          <Text style={styles.subtitle}>Please provide your professional details for verification.</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="specialty"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Specialty"
                placeholder="e.g. Cardiologist"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.specialty?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="department"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Department"
                placeholder="e.g. Cardiology"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.department?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="licenseNumber"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Medical License Number"
                placeholder="Enter your license number"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.licenseNumber?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="experienceYears"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Years of Experience"
                placeholder="e.g. 5"
                keyboardType="numeric"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.experienceYears?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="hospitalName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Hospital/Clinic Name"
                placeholder="Your current hospital"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.hospitalName?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="bio"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Short Bio (Optional)"
                placeholder="Brief summary of your expertise"
                multiline
                numberOfLines={3}
                style={{ height: 80, alignItems: 'flex-start' }}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.bio?.message}
              />
            )}
          />

          <View style={styles.uploadSection}>
            <Text style={styles.uploadLabel}>Medical Certificate / License Document</Text>
            <Text style={styles.uploadSubLabel}>Upload a clear photo of your credentials for verification</Text>
            
            {certificateImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: certificateImage.uri }} style={styles.imagePreview} />
                <Button 
                  title="Change Image" 
                  variant="outline" 
                  size="sm" 
                  onPress={pickImage} 
                  style={styles.changeImageBtn}
                />
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadPlaceholder} onPress={pickImage}>
                <Text style={styles.uploadPlaceholderText}>Tap to Upload Image</Text>
              </TouchableOpacity>
            )}
          </View>

          <Button
            title="Submit Application"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            fullWidth
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg0,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    color: Colors.text1,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.bodyLarge,
    color: Colors.text2,
  },
  form: {
    marginBottom: Spacing.xl,
  },
  submitButton: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  uploadSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  uploadLabel: {
    ...Typography.bodyMedium,
    color: Colors.text1,
    fontWeight: '600',
    marginBottom: 4,
  },
  uploadSubLabel: {
    ...Typography.bodySmall,
    color: Colors.text2,
    marginBottom: Spacing.md,
  },
  uploadPlaceholder: {
    borderWidth: 1,
    borderColor: Colors.border1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg2,
  },
  uploadPlaceholderText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
  },
  imagePreviewContainer: {
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: Radius.md,
    resizeMode: 'cover',
    marginBottom: Spacing.sm,
  },
  changeImageBtn: {
    alignSelf: 'center',
  },
});
