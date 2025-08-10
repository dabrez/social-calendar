export interface NotificationData {
  type: 'event_reminder' | 'task_due' | 'availability_change' | 'conflict_detected' | 'meeting_suggestion';
  title: string;
  message: string;
  data?: Record<string, any>;
  userId: string;
  priority?: 'low' | 'medium' | 'high';
  scheduledFor?: Date;
}

export interface Notification extends NotificationData {
  id: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationService {
  // Create a new notification
  static async createNotification(notificationData: NotificationData): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData),
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to create notification:', error);
      return false;
    }
  }

  // Create bulk notifications
  static async createBulkNotifications(notifications: NotificationData[]): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications }),
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to create bulk notifications:', error);
      return false;
    }
  }

  // Event reminder notifications
  static async createEventReminder(
    userId: string, 
    eventId: string, 
    eventTitle: string, 
    startTime: Date,
    reminderMinutes: number = 15
  ): Promise<boolean> {
    const reminderTime = new Date(startTime.getTime() - reminderMinutes * 60 * 1000);
    
    return this.createNotification({
      type: 'event_reminder',
      title: 'Upcoming Event',
      message: `"${eventTitle}" starts in ${reminderMinutes} minutes`,
      data: { 
        eventId, 
        startTime: startTime.toISOString(),
        reminderMinutes 
      },
      userId,
      priority: 'medium',
      scheduledFor: reminderTime,
    });
  }

  // Task due notifications
  static async createTaskDueNotification(
    userId: string,
    taskId: string,
    taskTitle: string,
    dueDate: Date
  ): Promise<boolean> {
    const now = new Date();
    const timeUntilDue = dueDate.getTime() - now.getTime();
    const hoursUntilDue = Math.floor(timeUntilDue / (1000 * 60 * 60));

    let message: string;
    let priority: 'low' | 'medium' | 'high' = 'medium';

    if (hoursUntilDue < 0) {
      message = `Task "${taskTitle}" is overdue`;
      priority = 'high';
    } else if (hoursUntilDue < 1) {
      message = `Task "${taskTitle}" is due in less than an hour`;
      priority = 'high';
    } else if (hoursUntilDue < 24) {
      message = `Task "${taskTitle}" is due in ${hoursUntilDue} hours`;
      priority = 'medium';
    } else {
      message = `Task "${taskTitle}" is due soon`;
      priority = 'low';
    }

    return this.createNotification({
      type: 'task_due',
      title: 'Task Due',
      message,
      data: { 
        taskId, 
        dueDate: dueDate.toISOString() 
      },
      userId,
      priority,
    });
  }

  // Conflict detected notifications
  static async createConflictNotification(
    userId: string,
    conflictId: string,
    conflictDescription: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<boolean> {
    const priorityMap: { [key: string]: 'low' | 'medium' | 'high' } = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'high',
    };

    return this.createNotification({
      type: 'conflict_detected',
      title: 'Schedule Conflict',
      message: conflictDescription,
      data: { 
        conflictId,
        severity 
      },
      userId,
      priority: priorityMap[severity] || 'medium',
    });
  }

  // Availability change notifications
  static async createAvailabilityChangeNotification(
    userId: string,
    changeType: 'became_free' | 'became_busy',
    timeSlot: { start: Date; end: Date },
    eventTitle?: string
  ): Promise<boolean> {
    let message: string;
    
    if (changeType === 'became_free') {
      message = eventTitle 
        ? `You're now free! "${eventTitle}" was cancelled or moved`
        : `You have a new free time slot available`;
    } else {
      message = eventTitle
        ? `New event added: "${eventTitle}"`
        : `Your availability has changed`;
    }

    return this.createNotification({
      type: 'availability_change',
      title: 'Availability Update',
      message,
      data: { 
        changeType,
        timeSlot: {
          start: timeSlot.start.toISOString(),
          end: timeSlot.end.toISOString(),
        },
        eventTitle
      },
      userId,
      priority: 'low',
    });
  }

  // Meeting suggestion notifications
  static async createMeetingSuggestionNotification(
    userId: string,
    suggestionId: string,
    meetingTitle: string,
    suggestedTime: Date,
    participantCount: number
  ): Promise<boolean> {
    return this.createNotification({
      type: 'meeting_suggestion',
      title: 'Meeting Suggestion',
      message: `Found a time for "${meetingTitle}" with ${participantCount} participants`,
      data: { 
        suggestionId,
        suggestedTime: suggestedTime.toISOString(),
        participantCount
      },
      userId,
      priority: 'medium',
    });
  }

  // Schedule periodic notifications (this would be called by a cron job or background service)
  static async schedulePeriodicNotifications() {
    try {
      // This would typically be implemented as a background job
      // For now, we'll create a simple endpoint that can be called periodically
      const response = await fetch('/api/notifications/scheduled', {
        method: 'POST',
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to schedule periodic notifications:', error);
      return false;
    }
  }

  // Browser notification support
  static async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // Show browser notification
  static async showBrowserNotification(
    title: string, 
    message: string, 
    data?: Record<string, any>
  ): Promise<boolean> {
    if (!await this.requestNotificationPermission()) {
      return false;
    }

    try {
      const notification = new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data,
        requireInteraction: data?.priority === 'high',
      });

      // Auto-close after 5 seconds unless high priority
      if (data?.priority !== 'high') {
        setTimeout(() => notification.close(), 5000);
      }

      return true;
    } catch (error) {
      console.error('Failed to show browser notification:', error);
      return false;
    }
  }

  // Real-time notification helpers for WebSocket/SSE implementation
  static setupRealTimeNotifications(userId: string, onNotification: (notification: Notification) => void) {
    // This would typically use WebSocket or Server-Sent Events
    // For now, we'll use polling as a fallback
    const pollInterval = 30000; // 30 seconds
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/notifications?unread=true&limit=10`);
        if (response.ok) {
          const data = await response.json();
          data.notifications.forEach(onNotification);
        }
      } catch (error) {
        console.error('Failed to poll for notifications:', error);
      }
    };

    const intervalId = setInterval(poll, pollInterval);
    
    // Return cleanup function
    return () => clearInterval(intervalId);
  }

  // Format notification for display
  static formatNotificationTime(createdAt: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return createdAt.toLocaleDateString();
  }

  // Get notification icon based on type
  static getNotificationIcon(type: string): string {
    switch (type) {
      case 'event_reminder': return '📅';
      case 'task_due': return '✅';
      case 'conflict_detected': return '⚠️';
      case 'availability_change': return '🔄';
      case 'meeting_suggestion': return '🤝';
      default: return '🔔';
    }
  }

  // Get notification color based on priority
  static getNotificationColor(priority: string): string {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }
}