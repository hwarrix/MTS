import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Colors, Radius, Spacing } from '@/constants/Colors';

export interface RevenueChartProps {
  data: { labels: string[]; datasets: { data: number[] }[] };
  width?: number;
}

export function RevenueChart({ data, width }: RevenueChartProps) {
  const chartWidth = width || Dimensions.get('window').width - Spacing.md * 4;

  return (
    <View style={styles.container}>
      <LineChart
        data={data}
        width={chartWidth}
        height={220}
        yAxisLabel="$"
        yAxisSuffix=""
        chartConfig={{
          backgroundColor: Colors.bg2,
          backgroundGradientFrom: Colors.bg2,
          backgroundGradientTo: Colors.bg2,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(79, 135, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(154, 170, 200, ${opacity})`,
          style: {
            borderRadius: Radius.md,
          },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: Colors.primaryDark,
          },
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  chart: {
    borderRadius: Radius.md,
  },
});
