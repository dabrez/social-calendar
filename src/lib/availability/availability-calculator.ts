import { addDays, format, isWithinInterval, startOfDay, endOfDay, addMinutes, isBefore, isAfter } from 'date-fns';

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface WorkingHours {
  start: string; // HH:mm format
  end: string;   // HH:mm format
  days: number[]; // 0 = Sunday, 1 = Monday, etc.
}

export interface AvailabilityOptions {
  workingHours?: WorkingHours;
  bufferMinutes?: number;
  minMeetingDuration?: number;
  maxMeetingDuration?: number;
}

export interface UserAvailability {
  userId: string;
  name: string;
  email: string;
  busySlots: TimeSlot[];
  workingHours: WorkingHours;
  timeZone?: string;
}

export interface MeetingSuggestion {
  start: Date;
  end: Date;
  duration: number;
  availableParticipants: string[];
  confidence: number; // 0-1 score based on how many people are available
  score: number; // Overall score including time preferences
}

export class AvailabilityCalculator {
  private defaultWorkingHours: WorkingHours = {
    start: '09:00',
    end: '17:00',
    days: [1, 2, 3, 4, 5], // Monday to Friday
  };

  private defaultOptions: AvailabilityOptions = {
    bufferMinutes: 15,
    minMeetingDuration: 30,
    maxMeetingDuration: 120,
  };

  calculateAvailability(
    users: UserAvailability[],
    startDate: Date,
    endDate: Date,
    options: AvailabilityOptions = {}
  ): { [userId: string]: TimeSlot[] } {
    const opts = { ...this.defaultOptions, ...options };
    const result: { [userId: string]: TimeSlot[] } = {};

    for (const user of users) {
      const workingHours = user.workingHours || this.defaultWorkingHours;
      const freeSlots: TimeSlot[] = [];

      // Generate potential time slots for each day
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        
        // Check if this day is a working day
        if (workingHours.days.includes(dayOfWeek)) {
          const dayStart = this.parseTimeOnDate(workingHours.start, currentDate);
          const dayEnd = this.parseTimeOnDate(workingHours.end, currentDate);
          
          // Find free slots for this day
          const dayFreeSlots = this.findFreeSlotsInDay(
            user.busySlots,
            dayStart,
            dayEnd,
            opts.bufferMinutes || 0
          );
          
          freeSlots.push(...dayFreeSlots);
        }
        
        currentDate = addDays(currentDate, 1);
      }

      result[user.userId] = freeSlots;
    }

    return result;
  }

  suggestMeetingTimes(
    users: UserAvailability[],
    duration: number, // in minutes
    startDate: Date,
    endDate: Date,
    options: AvailabilityOptions = {}
  ): MeetingSuggestion[] {
    const opts = { ...this.defaultOptions, ...options };
    const userAvailabilities = this.calculateAvailability(users, startDate, endDate, opts);
    
    const suggestions: MeetingSuggestion[] = [];
    const minParticipants = Math.ceil(users.length * 0.6); // At least 60% of participants

    // Generate time slots to check
    const timeSlots = this.generateTimeSlots(startDate, endDate, duration, opts);

    for (const slot of timeSlots) {
      const availableUsers: string[] = [];
      
      // Check which users are available for this time slot
      for (const user of users) {
        const userFreeSlots = userAvailabilities[user.userId];
        if (this.isSlotAvailable(slot, userFreeSlots)) {
          availableUsers.push(user.userId);
        }
      }

      // Only suggest if minimum participants are available
      if (availableUsers.length >= minParticipants) {
        const confidence = availableUsers.length / users.length;
        const score = this.calculateSlotScore(slot, availableUsers.length, users.length);
        
        suggestions.push({
          start: slot.start,
          end: slot.end,
          duration,
          availableParticipants: availableUsers,
          confidence,
          score,
        });
      }
    }

    // Sort by score and return top suggestions
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  findOptimalMeetingTime(
    users: UserAvailability[],
    duration: number,
    startDate: Date,
    endDate: Date,
    preferredTimes?: string[], // ['09:00', '14:00'] etc
    options: AvailabilityOptions = {}
  ): MeetingSuggestion | null {
    const suggestions = this.suggestMeetingTimes(users, duration, startDate, endDate, options);
    
    if (suggestions.length === 0) return null;

    // If preferred times are specified, boost scores for those times
    if (preferredTimes && preferredTimes.length > 0) {
      for (const suggestion of suggestions) {
        const timeString = format(suggestion.start, 'HH:mm');
        if (preferredTimes.includes(timeString)) {
          suggestion.score *= 1.5; // Boost preferred times
        }
      }
      
      // Re-sort after boosting
      suggestions.sort((a, b) => b.score - a.score);
    }

    return suggestions[0];
  }

  private parseTimeOnDate(timeString: string, date: Date): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  private findFreeSlotsInDay(
    busySlots: TimeSlot[],
    dayStart: Date,
    dayEnd: Date,
    bufferMinutes: number
  ): TimeSlot[] {
    const freeSlots: TimeSlot[] = [];
    
    // Sort busy slots by start time
    const sortedBusy = busySlots
      .filter(slot => 
        isWithinInterval(slot.start, { start: dayStart, end: dayEnd }) ||
        isWithinInterval(slot.end, { start: dayStart, end: dayEnd })
      )
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    if (sortedBusy.length === 0) {
      // Entire day is free
      freeSlots.push({ start: dayStart, end: dayEnd });
      return freeSlots;
    }

    // Check for free slot before first busy slot
    const firstBusy = sortedBusy[0];
    if (isBefore(dayStart, firstBusy.start)) {
      const freeEnd = addMinutes(firstBusy.start, -bufferMinutes);
      if (isBefore(dayStart, freeEnd)) {
        freeSlots.push({ start: dayStart, end: freeEnd });
      }
    }

    // Check for free slots between busy slots
    for (let i = 0; i < sortedBusy.length - 1; i++) {
      const currentEnd = sortedBusy[i].end;
      const nextStart = sortedBusy[i + 1].start;
      
      const freeStart = addMinutes(currentEnd, bufferMinutes);
      const freeEnd = addMinutes(nextStart, -bufferMinutes);
      
      if (isBefore(freeStart, freeEnd)) {
        freeSlots.push({ start: freeStart, end: freeEnd });
      }
    }

    // Check for free slot after last busy slot
    const lastBusy = sortedBusy[sortedBusy.length - 1];
    const freeStart = addMinutes(lastBusy.end, bufferMinutes);
    if (isBefore(freeStart, dayEnd)) {
      freeSlots.push({ start: freeStart, end: dayEnd });
    }

    return freeSlots;
  }

  private generateTimeSlots(
    startDate: Date,
    endDate: Date,
    duration: number,
    options: AvailabilityOptions
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const workingHours = options.workingHours || this.defaultWorkingHours;
    const interval = 30; // Check every 30 minutes

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      
      if (workingHours.days.includes(dayOfWeek)) {
        const dayStart = this.parseTimeOnDate(workingHours.start, currentDate);
        const dayEnd = this.parseTimeOnDate(workingHours.end, currentDate);
        
        let slotStart = new Date(dayStart);
        while (addMinutes(slotStart, duration) <= dayEnd) {
          const slotEnd = addMinutes(slotStart, duration);
          slots.push({ start: new Date(slotStart), end: slotEnd });
          slotStart = addMinutes(slotStart, interval);
        }
      }
      
      currentDate = addDays(currentDate, 1);
    }

    return slots;
  }

  private isSlotAvailable(slot: TimeSlot, freeSlots: TimeSlot[]): boolean {
    return freeSlots.some(freeSlot => 
      !isBefore(slot.start, freeSlot.start) && 
      !isAfter(slot.end, freeSlot.end)
    );
  }

  private calculateSlotScore(slot: TimeSlot, availableCount: number, totalCount: number): number {
    let score = availableCount / totalCount; // Base score from availability
    
    // Time preferences (higher scores for typical meeting times)
    const hour = slot.start.getHours();
    const minute = slot.start.getMinutes();
    
    // Prefer round hours and half hours
    if (minute === 0) score *= 1.2;
    else if (minute === 30) score *= 1.1;
    
    // Prefer typical meeting times (9-11 AM, 1-4 PM)
    if ((hour >= 9 && hour <= 11) || (hour >= 13 && hour <= 16)) {
      score *= 1.3;
    }
    
    // Slightly lower score for very early or late times
    if (hour < 9 || hour > 16) score *= 0.9;
    
    // Prefer not right after lunch or at end of day
    if (hour === 13) score *= 0.95; // Right after typical lunch
    if (hour >= 17) score *= 0.8;   // End of typical workday
    
    return score;
  }

  // Utility method to convert calendar events to busy slots
  static eventsToBusySlots(events: Array<{
    startTime: Date | string;
    endTime: Date | string;
  }>): TimeSlot[] {
    return events.map(event => ({
      start: typeof event.startTime === 'string' ? new Date(event.startTime) : event.startTime,
      end: typeof event.endTime === 'string' ? new Date(event.endTime) : event.endTime,
    }));
  }
}