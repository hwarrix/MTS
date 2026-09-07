import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, Database } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { formatDate } from '@/lib/timezone';

type Invoice = Database['public']['Tables']['invoices']['Row'] & {
  profiles?: {
    full_name: string;
  } | null;
  doctor_profiles?: {
    profiles?: {
      full_name: string;
    } | null;
  } | null;
};

export default function FinancialsScreen() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          profiles(full_name),
          doctor_profiles(
            profiles(full_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data as Invoice[]);
    } catch (err) {
      console.error('Failed to fetch invoices', err);
    } finally {
      setLoading(false);
    }
  };

  const renderInvoice = ({ item }: { item: Invoice }) => (
    <Card style={styles.invoiceCard}>
      <View style={styles.invoiceHeader}>
        <View>
          <Text style={styles.patientName}>{item.profiles?.full_name}</Text>
          <Text style={styles.doctorName}>Dr. {item.doctor_profiles?.profiles?.full_name}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amountText}>${(item.amount_cents / 100).toFixed(2)}</Text>
          <Badge text={item.status} status={item.status as any} />
        </View>
      </View>
      <View style={styles.invoiceFooter}>
        <Text style={styles.dateText}>Created: {formatDate(item.created_at)}</Text>
        <Text style={styles.idText}>ID: {item.id.substring(0, 8).toUpperCase()}</Text>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Financials & Invoices</Text>
        <Text style={styles.subtitle}>Track hospital revenue and patient billing</Text>
      </View>

      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, isTablet && styles.tabletListContent]}
        renderItem={renderInvoice}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No invoices found.</Text>
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
  invoiceCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  patientName: {
    ...Typography.h3,
    color: Colors.text1,
    marginBottom: 4,
  },
  doctorName: {
    ...Typography.bodyMedium,
    color: Colors.text2,
  },
  amountContainer: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  amountText: {
    ...Typography.h2,
    color: Colors.primary,
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border1,
    paddingTop: Spacing.sm,
  },
  dateText: {
    ...Typography.bodySmall,
    color: Colors.text2,
  },
  idText: {
    ...Typography.bodySmall,
    color: Colors.text3,
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
