import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { GoogleCalendarIntegration } from '@/lib/calendar-integrations/google-calendar';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Google account tokens
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'google',
      },
    });

    if (!account?.access_token) {
      return NextResponse.json({ error: 'Google account not connected' }, { status: 404 });
    }

    const googleCalendar = new GoogleCalendarIntegration();
    googleCalendar.setCredentials(account.access_token, account.refresh_token || undefined);

    const calendars = await googleCalendar.getCalendars();

    return NextResponse.json({ calendars });
  } catch (error) {
    console.error('Google calendar API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Google calendars' },
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

    const { calendarId, isWork } = await request.json();

    // Get user's Google account tokens
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'google',
      },
    });

    if (!account?.access_token) {
      return NextResponse.json({ error: 'Google account not connected' }, { status: 404 });
    }

    const googleCalendar = new GoogleCalendarIntegration();
    googleCalendar.setCredentials(account.access_token, account.refresh_token || undefined);

    // Get calendar details
    const calendars = await googleCalendar.getCalendars();
    const calendarInfo = calendars.find(cal => cal.id === calendarId);

    if (!calendarInfo) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    }

    // Store calendar in database
    const calendar = await prisma.calendar.create({
      data: {
        name: calendarInfo.name,
        provider: 'google',
        externalId: calendarId,
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        isWork: Boolean(isWork),
        color: calendarInfo.backgroundColor,
        workUserId: isWork ? session.user.id : undefined,
        personalUserId: !isWork ? session.user.id : undefined,
      },
    });

    return NextResponse.json({ calendar });
  } catch (error) {
    console.error('Google calendar connection error:', error);
    return NextResponse.json(
      { error: 'Failed to connect Google calendar' },
      { status: 500 }
    );
  }
}