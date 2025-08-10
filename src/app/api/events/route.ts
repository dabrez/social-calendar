import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const view = searchParams.get('view') || 'month';

    let timeMin: Date;
    let timeMax: Date;

    if (startDate && endDate) {
      timeMin = new Date(startDate);
      timeMax = new Date(endDate);
    } else {
      // Default to current month
      const now = new Date();
      if (view === 'day') {
        timeMin = startOfDay(now);
        timeMax = endOfDay(now);
      } else {
        timeMin = startOfMonth(now);
        timeMax = endOfMonth(now);
      }
    }

    // Get user's calendars
    const calendars = await prisma.calendar.findMany({
      where: {
        OR: [
          { workUserId: session.user.id },
          { personalUserId: session.user.id },
        ],
      },
    });

    // Get events from all user's calendars
    const events = await prisma.event.findMany({
      where: {
        calendarId: {
          in: calendars.map(cal => cal.id),
        },
        startTime: {
          gte: timeMin,
          lte: timeMax,
        },
      },
      include: {
        calendar: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Transform events for frontend
    const transformedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      location: event.location,
      isAllDay: event.isAllDay,
      isWork: event.isWork,
      calendar: {
        id: event.calendar.id,
        name: event.calendar.name,
        provider: event.calendar.provider,
        color: event.calendar.color,
      },
    }));

    return NextResponse.json({
      events: transformedEvents,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
    });

  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      title,
      description,
      startTime,
      endTime,
      location,
      isAllDay,
      isWork,
      calendarId,
    } = await request.json();

    // Validate required fields
    if (!title || !startTime || !endTime || !calendarId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify calendar ownership
    const calendar = await prisma.calendar.findFirst({
      where: {
        id: calendarId,
        OR: [
          { workUserId: session.user.id },
          { personalUserId: session.user.id },
        ],
      },
    });

    if (!calendar) {
      return NextResponse.json(
        { error: 'Calendar not found or unauthorized' },
        { status: 404 }
      );
    }

    // Create event in database
    const event = await prisma.event.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        isAllDay: Boolean(isAllDay),
        isWork: Boolean(isWork),
        userId: session.user.id,
        calendarId,
      },
      include: {
        calendar: true,
      },
    });

    // TODO: Also create event in external calendar (Google/Microsoft)
    // This would require additional logic to sync back to the calendar provider

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        location: event.location,
        isAllDay: event.isAllDay,
        isWork: event.isWork,
        calendar: {
          id: event.calendar.id,
          name: event.calendar.name,
          provider: event.calendar.provider,
          color: event.calendar.color,
        },
      },
    });

  } catch (error) {
    console.error('Create event error:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}