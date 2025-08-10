import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
}

export class GoogleCalendarIntegration {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );
  }

  setCredentials(accessToken: string, refreshToken?: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  async getCalendars() {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      const response = await calendar.calendarList.list();
      
      return response.data.items?.map(cal => ({
        id: cal.id!,
        name: cal.summary!,
        description: cal.description,
        primary: cal.primary || false,
        accessRole: cal.accessRole,
        backgroundColor: cal.backgroundColor,
      })) || [];
    } catch (error) {
      console.error('Error fetching Google calendars:', error);
      throw new Error('Failed to fetch calendars from Google');
    }
  }

  async getEvents(calendarId: string, timeMin: Date, timeMax: Date): Promise<GoogleCalendarEvent[]> {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      const response = await calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500,
      });

      return response.data.items?.map(event => ({
        id: event.id!,
        summary: event.summary || 'Untitled Event',
        description: event.description,
        start: event.start!,
        end: event.end!,
        location: event.location,
        attendees: event.attendees,
      })) || [];
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error);
      throw new Error('Failed to fetch events from Google Calendar');
    }
  }

  async createEvent(calendarId: string, event: {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    location?: string;
    attendees?: string[];
  }) {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      const eventResource = {
        summary: event.summary,
        description: event.description,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: 'UTC',
        },
        location: event.location,
        attendees: event.attendees?.map(email => ({ email })),
      };

      const response = await calendar.events.insert({
        calendarId,
        requestBody: eventResource,
      });

      return response.data;
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      throw new Error('Failed to create event in Google Calendar');
    }
  }

  async updateEvent(calendarId: string, eventId: string, event: {
    summary?: string;
    description?: string;
    start?: Date;
    end?: Date;
    location?: string;
  }) {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      const eventResource: any = {};
      if (event.summary) eventResource.summary = event.summary;
      if (event.description) eventResource.description = event.description;
      if (event.location) eventResource.location = event.location;
      
      if (event.start) {
        eventResource.start = {
          dateTime: event.start.toISOString(),
          timeZone: 'UTC',
        };
      }
      
      if (event.end) {
        eventResource.end = {
          dateTime: event.end.toISOString(),
          timeZone: 'UTC',
        };
      }

      const response = await calendar.events.update({
        calendarId,
        eventId,
        requestBody: eventResource,
      });

      return response.data;
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      throw new Error('Failed to update event in Google Calendar');
    }
  }

  async deleteEvent(calendarId: string, eventId: string) {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      await calendar.events.delete({
        calendarId,
        eventId,
      });
      return true;
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      throw new Error('Failed to delete event from Google Calendar');
    }
  }

  async getFreeBusy(calendars: string[], timeMin: Date, timeMax: Date) {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: calendars.map(id => ({ id })),
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching free/busy information:', error);
      throw new Error('Failed to fetch availability from Google Calendar');
    }
  }
}