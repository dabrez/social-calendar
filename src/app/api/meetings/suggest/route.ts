import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AvailabilityCalculator, UserAvailability } from '@/lib/availability/availability-calculator';
import { addDays, startOfDay, endOfDay } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      userIds,
      duration = 60, // minutes
      startDate,
      endDate,
      preferredTimes,
      title,
      description,
    } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds is required and must be a non-empty array' }, { status: 400 });
    }

    const start = startDate ? new Date(startDate) : startOfDay(new Date());
    const end = endDate ? new Date(endDate) : endOfDay(addDays(new Date(), 7));

    // Include the current user in the meeting
    const allUserIds = [...new Set([...userIds, session.user.id])];

    // Get user information
    const users = await prisma.user.findMany({
      where: {
        id: { in: allUserIds },
      },
      include: {
        workCalendars: true,
        personalCalendars: true,
      },
    });

    if (users.length !== allUserIds.length) {
      return NextResponse.json({ error: 'Some users not found' }, { status: 404 });
    }

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

    // Build user availability data
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

    // Calculate meeting suggestions
    const calculator = new AvailabilityCalculator();
    const suggestions = calculator.suggestMeetingTimes(
      userAvailabilities,
      duration,
      start,
      end,
      {
        bufferMinutes: 15,
        minMeetingDuration: Math.min(30, duration),
        maxMeetingDuration: Math.max(120, duration),
      }
    );

    // Boost preferred times if specified
    const enhancedSuggestions = suggestions.map(suggestion => {
      const timeString = suggestion.start.toTimeString().substring(0, 5);
      const isPreferredTime = preferredTimes && preferredTimes.includes(timeString);
      
      return {
        ...suggestion,
        start: suggestion.start.toISOString(),
        end: suggestion.end.toISOString(),
        score: isPreferredTime ? suggestion.score * 1.5 : suggestion.score,
        isPreferredTime,
        participants: suggestion.availableParticipants.map(userId => {
          const user = users.find(u => u.id === userId);
          return {
            id: userId,
            name: user?.name || user?.email || 'Unknown User',
            email: user?.email || '',
          };
        }),
      };
    }).sort((a, b) => b.score - a.score);

    // Store the meeting suggestion in database for future reference
    if (enhancedSuggestions.length > 0 && title) {
      try {
        await prisma.meetingSuggestion.create({
          data: {
            title: title || `Meeting with ${users.length} participants`,
            duration,
            startTime: new Date(enhancedSuggestions[0].start),
            endTime: new Date(enhancedSuggestions[0].end),
            groupId: '', // We'll need to create a group first if this becomes persistent
          },
        });
      } catch (error) {
        // Don't fail the request if we can't store the suggestion
        console.warn('Failed to store meeting suggestion:', error);
      }
    }

    return NextResponse.json({
      suggestions: enhancedSuggestions.slice(0, 5), // Return top 5 suggestions
      totalFound: suggestions.length,
      participants: users.map(user => ({
        id: user.id,
        name: user.name || user.email || 'Unknown User',
        email: user.email || '',
      })),
      searchCriteria: {
        duration,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        preferredTimes,
      },
    });

  } catch (error) {
    console.error('Meeting suggestion API error:', error);
    return NextResponse.json(
      { error: 'Failed to suggest meeting times' },
      { status: 500 }
    );
  }
}