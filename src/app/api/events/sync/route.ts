import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { GoogleCalendarIntegration } from '@/lib/calendar-integrations/google-calendar';
import { MicrosoftGraphIntegration } from '@/lib/calendar-integrations/microsoft-graph';
import { prisma } from '@/lib/prisma';
import { addDays, subDays } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { calendarIds } = await request.json();
    
    // Default to sync all user calendars if no specific IDs provided
    const calendarsToSync = calendarIds || await prisma.calendar.findMany({
      where: {
        OR: [
          { workUserId: session.user.id },
          { personalUserId: session.user.id },
        ],
      },
    });

    const syncResults = [];
    const now = new Date();
    const timeMin = subDays(now, 30); // Sync past 30 days
    const timeMax = addDays(now, 365); // Sync next 365 days

    for (const calendar of calendarsToSync) {
      try {
        let events: any[] = [];

        if (calendar.provider === 'google') {
          const googleCalendar = new GoogleCalendarIntegration();
          googleCalendar.setCredentials(calendar.accessToken, calendar.refreshToken || undefined);
          events = await googleCalendar.getEvents(calendar.externalId, timeMin, timeMax);
        } else if (calendar.provider === 'microsoft') {
          const microsoftGraph = new MicrosoftGraphIntegration(calendar.accessToken);
          events = await microsoftGraph.getEvents(calendar.externalId, timeMin, timeMax);
        }

        // Transform and store events
        const transformedEvents = events.map(event => {
          let startTime: Date;
          let endTime: Date;
          let isAllDay = false;

          if (calendar.provider === 'google') {
            if (event.start.date) {
              // All-day event
              startTime = new Date(event.start.date);
              endTime = new Date(event.end.date);
              isAllDay = true;
            } else {
              startTime = new Date(event.start.dateTime);
              endTime = new Date(event.end.dateTime);
            }
          } else {
            // Microsoft
            startTime = new Date(event.start.dateTime);
            endTime = new Date(event.end.dateTime);
          }

          return {
            title: calendar.provider === 'google' ? event.summary : event.subject,
            description: calendar.provider === 'google' 
              ? event.description 
              : event.body?.content,
            startTime,
            endTime,
            location: calendar.provider === 'google' 
              ? event.location 
              : event.location?.displayName,
            isAllDay,
            isWork: calendar.isWork,
            externalId: event.id,
            userId: session.user.id,
            calendarId: calendar.id,
          };
        });

        // Remove existing events for this calendar in the time range
        await prisma.event.deleteMany({
          where: {
            calendarId: calendar.id,
            startTime: {
              gte: timeMin,
              lte: timeMax,
            },
          },
        });

        // Insert new events
        if (transformedEvents.length > 0) {
          await prisma.event.createMany({
            data: transformedEvents,
            skipDuplicates: true,
          });
        }

        syncResults.push({
          calendarId: calendar.id,
          calendarName: calendar.name,
          provider: calendar.provider,
          eventsCount: transformedEvents.length,
          success: true,
        });

      } catch (error) {
        console.error(`Error syncing calendar ${calendar.id}:`, error);
        syncResults.push({
          calendarId: calendar.id,
          calendarName: calendar.name,
          provider: calendar.provider,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }
    }

    // Update calendar sync timestamps
    await prisma.calendar.updateMany({
      where: {
        id: {
          in: calendarsToSync.map((cal: any) => cal.id),
        },
      },
      data: {
        updatedAt: now,
      },
    });

    return NextResponse.json({
      message: 'Calendar sync completed',
      results: syncResults,
      syncedAt: now.toISOString(),
    });

  } catch (error) {
    console.error('Calendar sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync calendars' },
      { status: 500 }
    );
  }
}