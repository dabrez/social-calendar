import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ConflictDetector, Event } from '@/lib/conflict-detection/conflict-detector';
import { addDays, subDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const includePast = searchParams.get('includePast') === 'true';
    
    const now = new Date();
    const timeMin = startDate ? new Date(startDate) : (includePast ? subDays(now, 7) : now);
    const timeMax = endDate ? new Date(endDate) : addDays(now, 30);

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
        },
        endTime: {
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

    // Transform events for conflict detection
    const eventsForDetection: Event[] = events.map(event => ({
      id: event.id,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      calendarId: event.calendarId,
      isWork: event.isWork,
      userId: event.userId,
    }));

    // Detect conflicts
    const detector = new ConflictDetector();
    const conflicts = detector.detectConflicts(eventsForDetection, {
      includeBackToBack: true,
      travelTimeMinutes: 15,
      workPersonalSeparation: true,
    });

    // Get existing conflict records from database
    const existingConflicts = await prisma.eventConflict.findMany({
      where: {
        OR: [
          { eventId: { in: events.map(e => e.id) } },
          { conflictId: { in: events.map(e => e.id) } },
        ],
      },
    });

    // Create new conflict records for detected conflicts that don't exist yet
    const newConflictRecords = [];
    for (const conflict of conflicts) {
      const existingRecord = existingConflicts.find(ec => 
        (ec.eventId === conflict.primaryEvent.id && ec.conflictId === conflict.conflictingEvent.id) ||
        (ec.eventId === conflict.conflictingEvent.id && ec.conflictId === conflict.primaryEvent.id)
      );

      if (!existingRecord) {
        newConflictRecords.push({
          eventId: conflict.primaryEvent.id,
          conflictId: conflict.conflictingEvent.id,
          severity: conflict.type === 'double_booking' ? 'critical' : 
                   conflict.severity === 'high' ? 'high' :
                   conflict.severity === 'medium' ? 'medium' : 'low',
        });
      }
    }

    // Batch create new conflict records
    if (newConflictRecords.length > 0) {
      await prisma.eventConflict.createMany({
        data: newConflictRecords,
        skipDuplicates: true,
      });
    }

    // Format response
    const formattedConflicts = conflicts.map(conflict => ({
      id: conflict.id,
      type: conflict.type,
      severity: conflict.severity,
      description: conflict.description,
      suggestions: conflict.suggestions,
      overlapDuration: conflict.overlapDuration,
      primaryEvent: {
        id: conflict.primaryEvent.id,
        title: conflict.primaryEvent.title,
        startTime: conflict.primaryEvent.startTime.toISOString(),
        endTime: conflict.primaryEvent.endTime.toISOString(),
        isWork: conflict.primaryEvent.isWork,
        calendar: events.find(e => e.id === conflict.primaryEvent.id)?.calendar.name,
      },
      conflictingEvent: {
        id: conflict.conflictingEvent.id,
        title: conflict.conflictingEvent.title,
        startTime: conflict.conflictingEvent.startTime.toISOString(),
        endTime: conflict.conflictingEvent.endTime.toISOString(),
        isWork: conflict.conflictingEvent.isWork,
        calendar: events.find(e => e.id === conflict.conflictingEvent.id)?.calendar.name,
      },
    }));

    const stats = detector.getConflictStats(conflicts);

    return NextResponse.json({
      conflicts: formattedConflicts,
      stats,
      timeRange: {
        start: timeMin.toISOString(),
        end: timeMax.toISOString(),
      },
      eventsAnalyzed: events.length,
    });

  } catch (error) {
    console.error('Conflict detection API error:', error);
    return NextResponse.json(
      { error: 'Failed to detect conflicts' },
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

    const { eventData } = await request.json();

    if (!eventData) {
      return NextResponse.json({ error: 'Event data is required' }, { status: 400 });
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

    // Get existing events that might conflict with the new event
    const existingEvents = await prisma.event.findMany({
      where: {
        calendarId: {
          in: calendars.map(cal => cal.id),
        },
        OR: [
          {
            AND: [
              { startTime: { lt: new Date(eventData.endTime) } },
              { endTime: { gt: new Date(eventData.startTime) } },
            ],
          },
          {
            AND: [
              { startTime: { gte: new Date(eventData.startTime) } },
              { startTime: { lt: new Date(eventData.endTime) } },
            ],
          },
        ],
      },
      include: {
        calendar: true,
      },
    });

    // Create event object for conflict detection
    const newEvent: Event = {
      id: eventData.id || 'new-event',
      title: eventData.title,
      startTime: new Date(eventData.startTime),
      endTime: new Date(eventData.endTime),
      calendarId: eventData.calendarId,
      isWork: eventData.isWork || false,
      userId: session.user.id,
    };

    const eventsForDetection: Event[] = existingEvents.map(event => ({
      id: event.id,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      calendarId: event.calendarId,
      isWork: event.isWork,
      userId: event.userId,
    }));

    // Detect conflicts for the new event
    const detector = new ConflictDetector();
    const conflicts = detector.detectConflictsForEvent(newEvent, eventsForDetection, {
      includeBackToBack: true,
      travelTimeMinutes: 15,
      workPersonalSeparation: true,
    });

    // Format response
    const formattedConflicts = conflicts.map(conflict => ({
      id: conflict.id,
      type: conflict.type,
      severity: conflict.severity,
      description: conflict.description,
      suggestions: conflict.suggestions,
      overlapDuration: conflict.overlapDuration,
      conflictingEvent: {
        id: conflict.conflictingEvent.id,
        title: conflict.conflictingEvent.title,
        startTime: conflict.conflictingEvent.startTime.toISOString(),
        endTime: conflict.conflictingEvent.endTime.toISOString(),
        isWork: conflict.conflictingEvent.isWork,
        calendar: existingEvents.find(e => e.id === conflict.conflictingEvent.id)?.calendar.name,
      },
    }));

    return NextResponse.json({
      hasConflicts: conflicts.length > 0,
      conflicts: formattedConflicts,
      conflictCount: conflicts.length,
      highPriorityConflicts: conflicts.filter(c => c.severity === 'high' || c.severity === 'critical').length,
    });

  } catch (error) {
    console.error('Event conflict check API error:', error);
    return NextResponse.json(
      { error: 'Failed to check for conflicts' },
      { status: 500 }
    );
  }
}