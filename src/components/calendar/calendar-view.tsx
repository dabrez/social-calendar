'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Grid, List, MoreHorizontal } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

type CalendarViewType = 'month' | 'week' | 'day' | 'year';

interface CalendarViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export function CalendarView({ currentDate, onDateChange }: CalendarViewProps) {
  const [viewType, setViewType] = useState<CalendarViewType>('month');

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? subMonths(currentDate, 1)
      : addMonths(currentDate, 1);
    onDateChange(newDate);
  };

  const renderCalendarHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <h2 className="text-2xl font-semibold text-gray-900">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1 rounded-md hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={() => navigateMonth('next')}
            className="p-1 rounded-md hover:bg-gray-100"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="flex rounded-md shadow-sm">
          {(['month', 'week', 'day'] as CalendarViewType[]).map((view) => (
            <button
              key={view}
              onClick={() => setViewType(view)}
              className={`px-3 py-2 text-sm font-medium first:rounded-l-md last:rounded-r-md border ${
                viewType === view
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
        
        <button className="p-2 text-gray-400 hover:text-gray-500">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="bg-white rounded-lg shadow">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b">
          {weekDays.map((day) => (
            <div key={day} className="px-4 py-3 text-sm font-medium text-gray-500 text-center">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div
                key={day.toISOString()}
                className={`min-h-24 border-r border-b p-2 ${
                  !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                } hover:bg-gray-50 transition-colors cursor-pointer`}
                onClick={() => onDateChange(day)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm ${
                    isToday
                      ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-medium'
                      : isCurrentMonth
                      ? 'text-gray-900'
                      : 'text-gray-400'
                  }`}>
                    {format(day, 'd')}
                  </span>
                </div>
                
                {/* Sample events */}
                <div className="space-y-1">
                  {Math.random() > 0.7 && (
                    <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded truncate">
                      Team Meeting
                    </div>
                  )}
                  {Math.random() > 0.8 && (
                    <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded truncate">
                      Personal
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-center text-gray-500">Week view coming soon...</div>
    </div>
  );

  const renderDayView = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-center text-gray-500">Day view coming soon...</div>
    </div>
  );

  const renderContent = () => {
    switch (viewType) {
      case 'month':
        return renderMonthView();
      case 'week':
        return renderWeekView();
      case 'day':
        return renderDayView();
      default:
        return renderMonthView();
    }
  };

  return (
    <div>
      {renderCalendarHeader()}
      {renderContent()}
    </div>
  );
}