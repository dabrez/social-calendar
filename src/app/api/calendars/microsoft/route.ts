import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { MicrosoftGraphIntegration } from '@/lib/calendar-integrations/microsoft-graph';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Microsoft account tokens
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'azure-ad',
      },
    });

    if (!account?.access_token) {
      return NextResponse.json({ error: 'Microsoft account not connected' }, { status: 404 });
    }

    const microsoftGraph = new MicrosoftGraphIntegration(account.access_token);
    const calendars = await microsoftGraph.getCalendars();

    return NextResponse.json({ calendars });
  } catch (error) {
    console.error('Microsoft calendar API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Microsoft calendars' },
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

    // Get user's Microsoft account tokens
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'azure-ad',
      },
    });

    if (!account?.access_token) {
      return NextResponse.json({ error: 'Microsoft account not connected' }, { status: 404 });
    }

    const microsoftGraph = new MicrosoftGraphIntegration(account.access_token);

    // Get calendar details
    const calendars = await microsoftGraph.getCalendars();
    const calendarInfo = calendars.find(cal => cal.id === calendarId);

    if (!calendarInfo) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    }

    // Store calendar in database
    const calendar = await prisma.calendar.create({
      data: {
        name: calendarInfo.name,
        provider: 'microsoft',
        externalId: calendarId,
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        isWork: Boolean(isWork),
        color: calendarInfo.color,
        workUserId: isWork ? session.user.id : undefined,
        personalUserId: !isWork ? session.user.id : undefined,
      },
    });

    return NextResponse.json({ calendar });
  } catch (error) {
    console.error('Microsoft calendar connection error:', error);
    return NextResponse.json(
      { error: 'Failed to connect Microsoft calendar' },
      { status: 500 }
    );
  }
}