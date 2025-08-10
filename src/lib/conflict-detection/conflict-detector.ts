import { addMinutes, isBefore, isAfter, isEqual } from 'date-fns';

export interface Event {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  calendarId: string;
  isWork: boolean;
  userId: string;
}

export interface Conflict {
  id: string;
  type: 'overlap' | 'double_booking' | 'back_to_back' | 'travel_time';
  severity: 'low' | 'medium' | 'high' | 'critical';
  primaryEvent: Event;
  conflictingEvent: Event;
  overlapDuration?: number; // in minutes
  description: string;
  suggestions: string[];
}

export interface ConflictDetectionOptions {
  includeBackToBack?: boolean;
  travelTimeMinutes?: number;
  workPersonalSeparation?: boolean;
}

export class ConflictDetector {
  private defaultOptions: ConflictDetectionOptions = {
    includeBackToBack: true,
    travelTimeMinutes: 15,
    workPersonalSeparation: false,
  };

  detectConflicts(
    events: Event[],
    options: ConflictDetectionOptions = {}
  ): Conflict[] {
    const opts = { ...this.defaultOptions, ...options };
    const conflicts: Conflict[] = [];
    const sortedEvents = [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    for (let i = 0; i < sortedEvents.length; i++) {
      for (let j = i + 1; j < sortedEvents.length; j++) {
        const event1 = sortedEvents[i];
        const event2 = sortedEvents[j];

        // Skip if events are from the same calendar (might be intentional)
        if (event1.calendarId === event2.calendarId) continue;

        const conflict = this.detectConflictBetweenEvents(event1, event2, opts);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    return this.deduplicateConflicts(conflicts);
  }

  private detectConflictBetweenEvents(
    event1: Event,
    event2: Event,
    options: ConflictDetectionOptions
  ): Conflict | null {
    // Check for overlapping events
    const overlapConflict = this.checkOverlap(event1, event2);
    if (overlapConflict) return overlapConflict;

    // Check for back-to-back conflicts with travel time
    if (options.includeBackToBack && options.travelTimeMinutes) {
      const backToBackConflict = this.checkBackToBack(event1, event2, options.travelTimeMinutes);
      if (backToBackConflict) return backToBackConflict;
    }

    // Check work/personal separation
    if (options.workPersonalSeparation) {
      const separationConflict = this.checkWorkPersonalSeparation(event1, event2);
      if (separationConflict) return separationConflict;
    }

    return null;
  }

  private checkOverlap(event1: Event, event2: Event): Conflict | null {
    const event1Start = event1.startTime;
    const event1End = event1.endTime;
    const event2Start = event2.startTime;
    const event2End = event2.endTime;

    // Check if events overlap
    if (
      (isBefore(event1Start, event2End) && isAfter(event1End, event2Start)) ||
      (isBefore(event2Start, event1End) && isAfter(event2End, event1Start)) ||
      (isEqual(event1Start, event2Start) && isEqual(event1End, event2End))
    ) {
      const overlapStart = new Date(Math.max(event1Start.getTime(), event2Start.getTime()));
      const overlapEnd = new Date(Math.min(event1End.getTime(), event2End.getTime()));
      const overlapDuration = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60));

      let severity: 'low' | 'medium' | 'high' | 'critical';
      let type: 'overlap' | 'double_booking';

      // Complete overlap (same time)
      if (isEqual(event1Start, event2Start) && isEqual(event1End, event2End)) {
        severity = 'critical';
        type = 'double_booking';
      }
      // Significant overlap (>50% of shorter event)
      else if (overlapDuration > Math.min(
        (event1End.getTime() - event1Start.getTime()) / (1000 * 60),
        (event2End.getTime() - event2Start.getTime()) / (1000 * 60)
      ) * 0.5) {
        severity = 'high';
        type = 'overlap';
      }
      // Moderate overlap
      else if (overlapDuration > 30) {
        severity = 'medium';
        type = 'overlap';
      }
      // Minor overlap
      else {
        severity = 'low';
        type = 'overlap';
      }

      return {
        id: `conflict_${event1.id}_${event2.id}`,
        type,
        severity,
        primaryEvent: event1,
        conflictingEvent: event2,
        overlapDuration,
        description: this.generateConflictDescription(event1, event2, type, overlapDuration),
        suggestions: this.generateConflictSuggestions(event1, event2, type, overlapDuration),
      };
    }

    return null;
  }

  private checkBackToBack(
    event1: Event,
    event2: Event,
    travelTimeMinutes: number
  ): Conflict | null {
    const event1End = event1.endTime;
    const event2Start = event2.startTime;
    const timeBetween = (event2Start.getTime() - event1End.getTime()) / (1000 * 60);

    // Events are back-to-back with insufficient travel time
    if (timeBetween >= 0 && timeBetween < travelTimeMinutes) {
      let severity: 'low' | 'medium' | 'high';

      if (timeBetween === 0) {
        severity = 'medium';
      } else if (timeBetween < 5) {
        severity = 'medium';
      } else {
        severity = 'low';
      }

      return {
        id: `conflict_${event1.id}_${event2.id}`,
        type: 'travel_time',
        severity,
        primaryEvent: event1,
        conflictingEvent: event2,
        description: `Insufficient time between "${event1.title}" and "${event2.title}" (${Math.round(timeBetween)} minutes)`,
        suggestions: [
          `Add ${travelTimeMinutes - timeBetween} minutes buffer between meetings`,
          'Move one of the meetings to a different time',
          'Consider virtual attendance if both meetings are remote',
        ],
      };
    }

    return null;
  }

  private checkWorkPersonalSeparation(
    event1: Event,
    event2: Event
  ): Conflict | null {
    // Check if work event overlaps with personal time or vice versa
    if (event1.isWork !== event2.isWork) {
      const workEvent = event1.isWork ? event1 : event2;
      const personalEvent = event1.isWork ? event2 : event1;

      // Check if work event is outside typical work hours (9-17)
      const workEventHour = workEvent.startTime.getHours();
      if (workEventHour < 9 || workEventHour >= 17) {
        return {
          id: `conflict_${event1.id}_${event2.id}`,
          type: 'overlap',
          severity: 'medium',
          primaryEvent: workEvent,
          conflictingEvent: personalEvent,
          description: `Work event "${workEvent.title}" scheduled during personal time`,
          suggestions: [
            'Move work event to regular business hours',
            'Consider if this work event is truly necessary outside work hours',
            'Block personal time to prevent work scheduling',
          ],
        };
      }
    }

    return null;
  }

  private generateConflictDescription(
    event1: Event,
    event2: Event,
    type: string,
    overlapDuration: number
  ): string {
    switch (type) {
      case 'double_booking':
        return `Double booking: "${event1.title}" and "${event2.title}" are scheduled at the exact same time`;
      case 'overlap':
        return `Time conflict: "${event1.title}" and "${event2.title}" overlap by ${overlapDuration} minutes`;
      default:
        return `Conflict between "${event1.title}" and "${event2.title}"`;
    }
  }

  private generateConflictSuggestions(
    event1: Event,
    event2: Event,
    type: string,
    overlapDuration: number
  ): string[] {
    const suggestions: string[] = [];

    switch (type) {
      case 'double_booking':
        suggestions.push(
          'Reschedule one of the events to a different time',
          'Delegate attendance to a colleague if possible',
          'Consider if both events are truly necessary'
        );
        break;
      case 'overlap':
        suggestions.push(
          `Shorten "${event1.title}" by ${overlapDuration} minutes`,
          `Move "${event2.title}" to start ${overlapDuration} minutes later`,
          'Reschedule one event to a completely different time slot'
        );
        if (overlapDuration < 30) {
          suggestions.push('Join the second meeting late or leave the first meeting early');
        }
        break;
    }

    // Add general suggestions
    suggestions.push(
      'Check with attendees about flexibility in timing',
      'Consider if any meetings can be made shorter or asynchronous'
    );

    return suggestions;
  }

  private deduplicateConflicts(conflicts: Conflict[]): Conflict[] {
    const seen = new Set<string>();
    return conflicts.filter(conflict => {
      // Create a unique key that's the same regardless of event order
      const key = [conflict.primaryEvent.id, conflict.conflictingEvent.id].sort().join('_');
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Utility method to detect conflicts for a single new event
  detectConflictsForEvent(
    newEvent: Event,
    existingEvents: Event[],
    options: ConflictDetectionOptions = {}
  ): Conflict[] {
    const opts = { ...this.defaultOptions, ...options };
    const conflicts: Conflict[] = [];

    for (const existingEvent of existingEvents) {
      if (existingEvent.id === newEvent.id) continue;

      const conflict = this.detectConflictBetweenEvents(newEvent, existingEvent, opts);
      if (conflict) {
        conflicts.push(conflict);
      }
    }

    return conflicts;
  }

  // Method to get conflict statistics
  getConflictStats(conflicts: Conflict[]): {
    total: number;
    bySeverity: { [key: string]: number };
    byType: { [key: string]: number };
  } {
    const stats = {
      total: conflicts.length,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byType: { overlap: 0, double_booking: 0, back_to_back: 0, travel_time: 0 },
    };

    for (const conflict of conflicts) {
      stats.bySeverity[conflict.severity]++;
      stats.byType[conflict.type]++;
    }

    return stats;
  }
}