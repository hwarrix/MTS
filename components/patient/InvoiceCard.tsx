import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { formatDate } from '@/lib/timezone';
import { Database } from '@/lib/supabase';

type Invoice = Database['public']['Tables']['invoices']['Row'] & {
  doctor_profiles?: {
    profiles?: {
      full_name: string;
    } | null;
    specialty: string;
  } | null;
};

export interface InvoiceCardProps {
  invoice: Invoice;
  onPay?: (invoice: Invoice) => void;
}

export function InvoiceCard({ invoice, onPay }: InvoiceCardProps) {
  const isPending = invoice.status === 'pending';
  const doctorName = invoice.doctor_profiles?.profiles?.full_name || 'Hospital';
  const amountStr = `$${(invoice.amount_cents / 100).toFixed(2)}`;
  
  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.amountContainer}>
          <Text style={styles.amountText}>{amountStr}</Text>
          <Text style={styles.descriptionText}>
            {invoice.description || `Visit with Dr. ${doctorName}`}
          </Text>
        </View>
        <Badge text={invoice.status} status={invoice.status as any} />
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Invoice ID</Text>
          <Text style={styles.detailValue}>{invoice.id.substring(0, 8).toUpperCase()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Created On</Text>
          <Text style={styles.detailValue}>{formatDate(invoice.created_at)}</Text>
        </View>
        {invoice.due_date && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Due Date</Text>
            <Text style={styles.detailValue}>{formatDate(invoice.due_date)}</Text>
          </View>
        )}
      </View>

      {isPending && (
        <View style={styles.actions}>
          <Button
            title="Pay Now"
            variant="primary"
            fullWidth
            onPress={() => onPay?.(invoice)}
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
  amountContainer: {
    flex: 1,
  },
  amountText: {
    ...Typography.h2,
    color: Colors.text1,
  },
  descriptionText: {
    ...Typography.bodyMedium,
    color: Colors.text2,
    marginTop: 4,
  },
  details: {
    gap: Spacing.xs,
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
    marginTop: Spacing.lg,
  },
});
