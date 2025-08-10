import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addMinutes, subMinutes, addHours } from 'date-fns';

// This endpoint would typically be called by a cron job or background service
export async function POST(request: NextRequest) {
  try {
    const now = new Date();
    const next15Minutes = addMinutes(now, 15);
    const next24Hours = addHours(now, 24);

    // Create event reminders for events starting in the next 15 minutes
    const upcomingEvents = await prisma.event.findMany({
      where: {
        startTime: {
          gte: now,
          lte: next15Minutes,
        },
      },
      include: {
        user: true,
      },
    });

    const eventReminders = upcomingEvents.map(event => ({
      type: 'event_reminder',
      title: 'Upcoming Event',
      message: `"${event.title}" starts in ${Math.round((event.startTime.getTime() - now.getTime()) / (1000 * 60))} minutes`,
      data: {
        eventId: event.id,
        startTime: event.startTime.toISOString(),
      },
      userId: event.userId,
      isRead: false,
    }));

    // Create task due reminders for tasks due in the next 24 hours
    const dueTasks = await prisma.task.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: next24Hours,
        },
        isCompleted: false,
      },
      include: {
        user: true,
      },
    });

    const taskReminders = dueTasks.map(task => {
      const hoursUntilDue = Math.round((task.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60));
      let priority: 'low' | 'medium' | 'high' = 'medium';
      
      if (hoursUntilDue <= 1) priority = 'high';
      else if (hoursUntilDue <= 6) priority = 'medium';
      else priority = 'low';

      return {
        type: 'task_due',
        title: 'Task Due Soon',
        message: `"${task.title}" is due in ${hoursUntilDue} hour${hoursUntilDue !== 1 ? 's' : ''}`,
        data: {
          taskId: task.id,
          dueDate: task.dueDate!.toISOString(),
        },
        userId: task.userId,
        isRead: false,
      };
    });

    // Check for conflicts in upcoming events
    const conflictNotifications: any[] = [];
    
    // This is a simplified conflict check - in production you'd want more sophisticated logic
    for (const event of upcomingEvents) {
      const conflictingEvents = await prisma.event.findMany({
        where: {
          userId: event.userId,
          id: { not: event.id },
          AND: [
            { startTime: { lt: event.endTime } },
            { endTime: { gt: event.startTime } },
          ],
        },
      });

      if (conflictingEvents.length > 0) {
        conflictNotifications.push({
          type: 'conflict_detected',
          title: 'Schedule Conflict',
          message: `"${event.title}" conflicts with ${conflictingEvents.length} other event${conflictingEvents.length !== 1 ? 's' : ''}`,
          data: {
            eventId: event.id,
            conflictingEventIds: conflictingEvents.map(ce => ce.id),
          },
          userId: event.userId,
          isRead: false,
        });
      }
    }

    // Combine all notifications
    const allNotifications = [
      ...eventReminders,
      ...taskReminders,
      ...conflictNotifications,
    ];

    if (allNotifications.length > 0) {
      // Check for existing notifications to avoid duplicates
      const existingNotifications = await prisma.notification.findMany({
        where: {
          OR: [
            ...eventReminders.map(n => ({
              type: 'event_reminder',
              data: { path: ['eventId'], equals: n.data.eventId },
              userId: n.userId,
            })),
            ...taskReminders.map(n => ({
              type: 'task_due',
              data: { path: ['taskId'], equals: n.data.taskId },
              userId: n.userId,
            })),
          ],
          createdAt: {
            gte: subMinutes(now, 30), // Only check recent notifications
          },
        },
      });

      // Filter out notifications that already exist
      const existingKeys = new Set(
        existingNotifications.map(n => 
          `${n.type}_${JSON.stringify(n.data)}_${n.userId}`
        )
      );

      const newNotifications = allNotifications.filter(n =>
        !existingKeys.has(`${n.type}_${JSON.stringify(n.data)}_${n.userId}`)
      );

      if (newNotifications.length > 0) {
        await prisma.notification.createMany({
          data: newNotifications,
          skipDuplicates: true,
        });
      }

      return NextResponse.json({
        success: true,
        processed: allNotifications.length,
        created: newNotifications.length,
        breakdown: {
          eventReminders: eventReminders.length,
          taskReminders: taskReminders.length,
          conflictNotifications: conflictNotifications.length,
        },
      });
    }

    return NextResponse.json({
      success: true,
      processed: 0,
      created: 0,
      message: 'No notifications needed at this time',
    });

  } catch (error) {
    console.error('Scheduled notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to create scheduled notifications' },
      { status: 500 }
    );
  }
}