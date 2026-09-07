import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Switch, FlatList } from 'react-native';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Button } from '@/components/ui/Button';
import { Database } from '@/lib/supabase';
import { formatTime, formatSlotRange } from '@/lib/timezone';

type Slot = Database['public']['Tables']['appointment_slots']['Row'];

export interface SlotManagerProps {
  slots: Slot[];
  onClose: () => void;
  onToggleSlot: (slot: Slot) => void;
}

export function SlotManager({ slots, onClose, onToggleSlot }: SlotManagerProps) {
  
  const renderItem = ({ item }: { item: Slot }) => (
    <View style={styles.slotRow}>
      <Text style={styles.timeText}>{formatSlotRange(item.start_time, item.end_time)}</Text>
      <View style={styles.switchContainer}>
        <Text style={[styles.statusText, { color: item.is_available ? Colors.success : Colors.text3 }]}>
          {item.is_available ? 'Available' : 'Unavailable'}
        </Text>
        <Switch
          value={item.is_available}
          onValueChange={() => onToggleSlot(item)}
          trackColor={{ false: Colors.border2, true: Colors.primary }}
          thumbColor={Colors.text1}
        />
      </View>
    </View>
  );

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Manage Availability</Text>
            <Text style={styles.subtitle}>Toggle slots to mark yourself (un)available</Text>
          </View>

          <FlatList
            data={slots}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />

          <View style={styles.footer}>
            <Button
              title="Done"
              fullWidth
              onPress={onClose}
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.bg1,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    height: '70%',
  },
  header: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border1,
  },
  title: {
    ...Typography.h2,
    color: Colors.text1,
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: Colors.text2,
    marginTop: 4,
  },
  listContent: {
    padding: Spacing.lg,
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border1,
  },
  timeText: {
    ...Typography.h4,
    color: Colors.text1,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusText: {
    ...Typography.bodySmall,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border1,
    backgroundColor: Colors.bg2,
    paddingBottom: Spacing.xl,
  },
});
