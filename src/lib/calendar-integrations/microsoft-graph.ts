import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';

export interface MicrosoftCalendarEvent {
  id: string;
  subject: string;
  body?: {
    content?: string;
    contentType?: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName?: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    status?: {
      response?: string;
    };
  }>;
}

class CustomAuthProvider implements AuthenticationProvider {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}

export class MicrosoftGraphIntegration {
  private client: Client;

  constructor(accessToken: string) {
    const authProvider = new CustomAuthProvider(accessToken);
    this.client = Client.initWithMiddleware({ authProvider });
  }

  async getCalendars() {
    try {
      const calendars = await this.client.api('/me/calendars').get();
      
      return calendars.value.map((cal: any) => ({
        id: cal.id,
        name: cal.name,
        description: cal.description,
        owner: cal.owner?.name,
        canEdit: cal.canEdit,
        canShare: cal.canShare,
        canViewPrivateItems: cal.canViewPrivateItems,
        color: cal.color,
      }));
    } catch (error) {
      console.error('Error fetching Microsoft calendars:', error);
      throw new Error('Failed to fetch calendars from Microsoft Graph');
    }
  }

  async getEvents(calendarId: string, startTime: Date, endTime: Date): Promise<MicrosoftCalendarEvent[]> {
    try {
      const events = await this.client
        .api(`/me/calendars/${calendarId}/events`)
        .filter(`start/dateTime ge '${startTime.toISOString()}' and end/dateTime le '${endTime.toISOString()}'`)
        .select('id,subject,body,start,end,location,attendees')
        .orderby('start/dateTime')
        .top(1000)
        .get();

      return events.value.map((event: any) => ({
        id: event.id,
        subject: event.subject || 'Untitled Event',
        body: event.body,
        start: event.start,
        end: event.end,
        location: event.location,
        attendees: event.attendees,
      }));
    } catch (error) {
      console.error('Error fetching Microsoft Calendar events:', error);
      throw new Error('Failed to fetch events from Microsoft Calendar');
    }
  }

  async createEvent(calendarId: string, event: {
    subject: string;
    body?: string;
    start: Date;
    end: Date;
    location?: string;
    attendees?: string[];
  }) {
    try {
      const eventData = {
        subject: event.subject,
        body: event.body ? {
          contentType: 'HTML',
          content: event.body,
        } : undefined,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: 'UTC',
        },
        location: event.location ? {
          displayName: event.location,
        } : undefined,
        attendees: event.attendees?.map(email => ({
          emailAddress: {
            address: email,
            name: email.split('@')[0],
          },
        })),
      };

      const createdEvent = await this.client
        .api(`/me/calendars/${calendarId}/events`)
        .post(eventData);

      return createdEvent;
    } catch (error) {
      console.error('Error creating Microsoft Calendar event:', error);
      throw new Error('Failed to create event in Microsoft Calendar');
    }
  }

  async updateEvent(calendarId: string, eventId: string, event: {
    subject?: string;
    body?: string;
    start?: Date;
    end?: Date;
    location?: string;
  }) {
    try {
      const eventData: any = {};
      
      if (event.subject) eventData.subject = event.subject;
      if (event.body) {
        eventData.body = {
          contentType: 'HTML',
          content: event.body,
        };
      }
      if (event.location) {
        eventData.location = {
          displayName: event.location,
        };
      }
      if (event.start) {
        eventData.start = {
          dateTime: event.start.toISOString(),
          timeZone: 'UTC',
        };
      }
      if (event.end) {
        eventData.end = {
          dateTime: event.end.toISOString(),
          timeZone: 'UTC',
        };
      }

      const updatedEvent = await this.client
        .api(`/me/calendars/${calendarId}/events/${eventId}`)
        .patch(eventData);

      return updatedEvent;
    } catch (error) {
      console.error('Error updating Microsoft Calendar event:', error);
      throw new Error('Failed to update event in Microsoft Calendar');
    }
  }

  async deleteEvent(calendarId: string, eventId: string) {
    try {
      await this.client
        .api(`/me/calendars/${calendarId}/events/${eventId}`)
        .delete();
      
      return true;
    } catch (error) {
      console.error('Error deleting Microsoft Calendar event:', error);
      throw new Error('Failed to delete event from Microsoft Calendar');
    }
  }

  async getFreeBusy(calendars: string[], startTime: Date, endTime: Date) {
    try {
      const freeBusyData = await this.client
        .api('/me/calendar/getSchedule')
        .post({
          schedules: calendars,
          startTime: {
            dateTime: startTime.toISOString(),
            timeZone: 'UTC',
          },
          endTime: {
            dateTime: endTime.toISOString(),
            timeZone: 'UTC',
          },
          availabilityViewInterval: 60, // 60-minute intervals
        });

      return freeBusyData;
    } catch (error) {
      console.error('Error fetching free/busy information from Microsoft Graph:', error);
      throw new Error('Failed to fetch availability from Microsoft Calendar');
    }
  }

  async getUserProfile() {
    try {
      const profile = await this.client.api('/me').get();
      return {
        id: profile.id,
        displayName: profile.displayName,
        mail: profile.mail,
        userPrincipalName: profile.userPrincipalName,
      };
    } catch (error) {
      console.error('Error fetching user profile from Microsoft Graph:', error);
      throw new Error('Failed to fetch user profile');
    }
  }
}