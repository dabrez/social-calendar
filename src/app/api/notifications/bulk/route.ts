import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notifications } = await request.json();

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return NextResponse.json(
        { error: 'Notifications array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate notification format
    for (const notification of notifications) {
      if (!notification.type || !notification.title || !notification.message) {
        return NextResponse.json(
          { error: 'Each notification must have type, title, and message' },
          { status: 400 }
        );
      }
    }

    // Prepare notifications for bulk creation
    const notificationsToCreate = notifications.map(notification => ({
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      userId: notification.userId || session.user.id,
      isRead: false,
    }));

    // Create notifications in bulk
    const result = await prisma.notification.createMany({
      data: notificationsToCreate,
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      created: result.count,
    });

  } catch (error) {
    console.error('Bulk create notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to create bulk notifications' },
      { status: 500 }
    );
  }
}