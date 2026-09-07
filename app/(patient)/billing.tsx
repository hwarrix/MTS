import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, Database } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { InvoiceCard } from '@/components/patient/InvoiceCard';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { useStripe } from '@stripe/stripe-react-native';

type Invoice = Database['public']['Tables']['invoices']['Row'] & {
  doctor_profiles?: {
    profiles?: {
      full_name: string;
    } | null;
    specialty: string;
  } | null;
};

export default function BillingScreen() {
  const { user } = useAuthStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          doctor_profiles(
            specialty,
            profiles(full_name)
          )
        `)
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data as Invoice[]);
    } catch (err) {
      console.error('Failed to fetch invoices', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (invoice: Invoice) => {
    setLoading(true);
    try {
      // 1. Fetch PaymentIntent client secret from Edge Function
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { invoice_id: invoice.id },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      // 2. Initialize Stripe Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'MediCare Hospital',
        paymentIntentClientSecret: data.client_secret,
        defaultBillingDetails: {
          email: user?.email,
        },
        appearance: {
          colors: {
            primary: Colors.primary,
            background: Colors.bg1,
            componentBackground: Colors.bg2,
            componentBorder: Colors.border1,
            componentDivider: Colors.border2,
            primaryText: Colors.text1,
            secondaryText: Colors.text2,
            placeholderText: Colors.text3,
            danger: Colors.danger,
          },
        },
      });

      if (initError) throw initError;

      setLoading(false);

      // 3. Present Payment Sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          console.log('Payment sheet closed');
        } else {
          Alert.alert('Payment Failed', presentError.message);
        }
      } else {
        // 4. Update Invoice Status on success (usually better to do via Stripe Webhooks on the server)
        await supabase
          .from('invoices')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', invoice.id);

        Alert.alert('Success', 'Your payment was successful!');
        fetchInvoices();
      }
    } catch (err: any) {
      setLoading(false);
      console.error('Payment error', err);
      Alert.alert('Error', err.message || 'Failed to initialize payment');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Billing & Invoices</Text>
      </View>

      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <InvoiceCard 
            invoice={item} 
            onPay={handlePay}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>You have no invoices.</Text>
            </View>
          ) : null
        }
        refreshing={loading}
        onRefresh={fetchInvoices}
      />

      <LoadingOverlay visible={loading && invoices.length === 0} />
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
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
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
});
