import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AvailabilityCalculator, UserAvailability } from '@/lib/availability/availability-calculator';
import { addDays, startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIdsParam = searchParams.get('userIds');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!userIdsParam) {
      return NextResponse.json({ error: 'userIds parameter is required' }, { status: 400 });
    }

    const userIds = userIdsParam.split(',');
    const start = startDate ? new Date(startDate) : startOfDay(new Date());
    const end = endDate ? new Date(endDate) : endOfDay(addDays(new Date(), 7));

    // Get user information
    const users = await prisma.user.findMany({
      where: {
        id: { in: [...userIds, session.user.id] },
      },
      include: {
        workCalendars: true,
        personalCalendars: true,
      },
    });

    // Get events for all users in the date range
    const allCalendarIds = users.flatMap(user => [
      ...user.workCalendars.map(cal => cal.id),
      ...user.personalCalendars.map(cal => cal.id),
    ]);

    const events = await prisma.event.findMany({
      where: {
        calendarId: { in: allCalendarIds },
        startTime: { gte: start },
        endTime: { lte: end },
      },
      include: {
        calendar: true,
      },
    });

    // Group events by user
    const userAvailabilities: UserAvailability[] = users.map(user => {
      const userCalendarIds = [
        ...user.workCalendars.map(cal => cal.id),
        ...user.personalCalendars.map(cal => cal.id),
      ];

      const userEvents = events.filter(event => 
        userCalendarIds.includes(event.calendarId)
      );

      const busySlots = AvailabilityCalculator.eventsToBusySlots(
        userEvents.map(event => ({
          startTime: event.startTime,
          endTime: event.endTime,
        }))
      );

      return {
        userId: user.id,
        name: user.name || user.email || 'Unknown User',
        email: user.email || '',
        busySlots,
        workingHours: {
          start: '09:00',
          end: '17:00',
          days: [1, 2, 3, 4, 5], // Monday to Friday
        },
      };
    });

    const calculator = new AvailabilityCalculator();
    const availabilities = calculator.calculateAvailability(
      userAvailabilities,
      start,
      end
    );

    // Format response
    const result = Object.entries(availabilities).map(([userId, slots]) => {
      const user = users.find(u => u.id === userId);
      return {
        userId,
        name: user?.name || user?.email || 'Unknown User',
        email: user?.email || '',
        freeSlots: slots.map(slot => ({
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
        })),
      };
    });

    return NextResponse.json({
      availabilities: result,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });

  } catch (error) {
    console.error('Availability API error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate availability' },
      { status: 500 }
    );
  }
}