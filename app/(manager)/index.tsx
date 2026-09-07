import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { RevenueChart } from '@/components/manager/RevenueChart';
import { Card } from '@/components/ui/Card';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';

export default function ManagerDashboardScreen() {
  const { signOut } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingDoctors: 0,
    activeAppointments: 0,
    totalRevenue: 0,
  });
  
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Pending doctors
      const { count: pendingCount } = await supabase
        .from('doctor_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Active appointments today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { count: apptCount } = await supabase
        .from('appointment_slots')
        .select('*', { count: 'exact', head: true })
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .eq('is_available', false); // Booked slots

      // Total revenue (paid invoices)
      const { data: invoices } = await supabase
        .from('invoices')
        .select('amount_cents')
        .eq('status', 'paid');

      const revenue = invoices?.reduce((sum, inv) => sum + inv.amount_cents, 0) || 0;

      setStats({
        pendingDoctors: pendingCount || 0,
        activeAppointments: apptCount || 0,
        totalRevenue: revenue / 100, // Convert cents to dollars
      });
    } catch (err) {
      console.error('Failed to fetch stats', err);
    } finally {
      setLoading(false);
    }
  };

  // Mock data for chart
  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{ data: [1500, 2300, 1800, 3200, 2900, 4100, 3800] }],
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, isTablet && styles.tabletContent]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchStats} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>Hospital Overview</Text>
          </View>
          <Button title="Sign Out" variant="outline" size="sm" onPress={signOut} />
        </View>

        <View style={[styles.statsGrid, isTablet && styles.tabletStatsGrid]}>
          <Card style={[styles.statCard, isTablet && { flex: 1 }]}>
            <Text style={styles.statLabel}>Pending Verifications</Text>
            <Text style={styles.statValue}>{stats.pendingDoctors}</Text>
          </Card>
          
          <Card style={[styles.statCard, isTablet && { flex: 1 }]}>
            <Text style={styles.statLabel}>Today's Bookings</Text>
            <Text style={styles.statValue}>{stats.activeAppointments}</Text>
          </Card>
          
          <Card style={[styles.statCard, isTablet && { flex: 1 }]}>
            <Text style={styles.statLabel}>Total Revenue</Text>
            <Text style={styles.statValue}>${stats.totalRevenue.toLocaleString()}</Text>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue Trend (This Week)</Text>
          <Card style={styles.chartCard}>
            <RevenueChart 
              data={chartData} 
              width={isTablet ? Math.min(width - 80, 900) - Spacing.md * 2 : width - Spacing.md * 4} 
            />
          </Card>
        </View>

      </ScrollView>
      <LoadingOverlay visible={loading && stats.totalRevenue === 0} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg0,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  tabletContent: {
    padding: Spacing.xl,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    backgroundColor: Colors.bg1,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border1,
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
  statsGrid: {
    flexDirection: 'column',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  tabletStatsGrid: {
    flexDirection: 'row',
  },
  statCard: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  statLabel: {
    ...Typography.bodyMedium,
    color: Colors.text3,
    marginBottom: Spacing.sm,
  },
  statValue: {
    ...Typography.h1,
    color: Colors.primary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text1,
    marginBottom: Spacing.md,
  },
  chartCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
});
