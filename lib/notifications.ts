import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from './supabase'

// Configure notification handling behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

/**
 * Request push notification permission and register device token with Supabase.
 * Should be called after successful login.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device')
    return null
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4F87FF',
    })
    await Notifications.setNotificationChannelAsync('appointments', {
      name: 'Appointments',
      description: 'Appointment reminders and updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4F87FF',
    })
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission denied')
    return null
  }

  // Get Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-expo-project-id', // Replace with actual EAS project ID
  })

  const token = tokenData.data
  const platform = Platform.OS as 'ios' | 'android'

  // Upsert push token in Supabase
  await supabase
    .from('push_tokens')
    .upsert(
      { user_id: userId, token, platform },
      { onConflict: 'user_id,token' }
    )

  return token
}

/**
 * Schedule a local push notification for an appointment reminder.
 * Schedules two reminders: 24h before and 1h before.
 */
export async function scheduleAppointmentReminder(
  appointmentId: string,
  startTimeUtc: string,
  doctorName: string
): Promise<void> {
  const startDate = new Date(startTimeUtc)
  const now = new Date()

  // 24 hours before
  const reminder24h = new Date(startDate.getTime() - 24 * 60 * 60 * 1000)
  if (reminder24h > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📅 Appointment Tomorrow',
        body: `You have an appointment with ${doctorName} tomorrow.`,
        data: { type: 'appointment_reminder', appointment_id: appointmentId },
        sound: 'default',
      },
      trigger: { date: reminder24h, channelId: 'appointments' },
      identifier: `${appointmentId}_24h`,
    })
  }

  // 1 hour before
  const reminder1h = new Date(startDate.getTime() - 60 * 60 * 1000)
  if (reminder1h > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Appointment in 1 Hour',
        body: `Your appointment with ${doctorName} starts in 1 hour.`,
        data: { type: 'appointment_reminder', appointment_id: appointmentId },
        sound: 'default',
      },
      trigger: { date: reminder1h, channelId: 'appointments' },
      identifier: `${appointmentId}_1h`,
    })
  }
}

/**
 * Cancel all scheduled notifications for an appointment.
 */
export async function cancelAppointmentReminders(appointmentId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`${appointmentId}_24h`)
  await Notifications.cancelScheduledNotificationAsync(`${appointmentId}_1h`)
}

/**
 * Clear the badge count (iOS).
 */
export async function clearBadgeCount(): Promise<void> {
  await Notifications.setBadgeCountAsync(0)
}
