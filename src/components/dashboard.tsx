'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Calendar, Users, CheckSquare, Settings, Plus, AlertTriangle } from 'lucide-react';
import { CalendarView } from './calendar/calendar-view';
import { TaskPanel } from './tasks/task-panel';
import { AvailabilityPanel } from './availability/availability-panel';
import { ConflictPanel } from './conflicts/conflict-panel';
import { NotificationDropdown } from './notifications/notification-dropdown';

type View = 'calendar' | 'tasks' | 'availability' | 'conflicts' | 'settings';

export function Dashboard() {
  const { data: session } = useSession();
  const [currentView, setCurrentView] = useState<View>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigation = [
    { id: 'calendar', name: 'Calendar', icon: Calendar },
    { id: 'tasks', name: 'Tasks', icon: CheckSquare },
    { id: 'availability', name: 'Availability', icon: Users },
    { id: 'conflicts', name: 'Conflicts', icon: AlertTriangle },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  const renderContent = () => {
    switch (currentView) {
      case 'calendar':
        return <CalendarView currentDate={currentDate} onDateChange={setCurrentDate} />;
      case 'tasks':
        return <TaskPanel />;
      case 'availability':
        return <AvailabilityPanel />;
      case 'conflicts':
        return <ConflictPanel />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <CalendarView currentDate={currentDate} onDateChange={setCurrentDate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Social Calendar</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <NotificationDropdown />
              
              <div className="flex items-center space-x-2">
                <img
                  className="h-8 w-8 rounded-full"
                  src={session?.user?.image || '/default-avatar.png'}
                  alt={session?.user?.name || 'User'}
                />
                <button
                  onClick={() => signOut()}
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-4">
            <div className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id as View)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      currentView === item.id
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </button>
                );
              })}
            </div>

            <div className="mt-8">
              <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors">
                <Plus className="mr-3 h-5 w-5" />
                Quick Add
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

function SettingsPanel() {
  const [workPersonalSeparation, setWorkPersonalSeparation] = useState(true);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Calendar Connections */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Connected Calendars</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-medium">G</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Google Calendar</p>
                <p className="text-sm text-gray-500">Work & Personal calendars</p>
              </div>
            </div>
            <button className="px-3 py-1 text-sm text-red-600 hover:text-red-800">
              Disconnect
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-medium">M</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Microsoft Outlook</p>
                <p className="text-sm text-gray-500">Work calendar</p>
              </div>
            </div>
            <button className="px-3 py-1 text-sm text-red-600 hover:text-red-800">
              Disconnect
            </button>
          </div>

          <button className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors">
            <Plus className="h-5 w-5 mx-auto mb-2" />
            Connect another calendar
          </button>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy & Account Separation</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Work/Personal Separation</h4>
              <p className="text-sm text-gray-500">Keep work and personal calendar details separate</p>
            </div>
            <button
              onClick={() => setWorkPersonalSeparation(!workPersonalSeparation)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                workPersonalSeparation ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  workPersonalSeparation ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h5 className="font-medium text-blue-900 mb-2">How it works:</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Work contacts can only see your availability, not event details</li>
              <li>• Personal events appear as "Busy" to work contacts</li>
              <li>• You maintain full control over what information is shared</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Availability Sharing</h4>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600" defaultChecked />
                <span className="ml-2 text-sm text-gray-700">Share free/busy status with contacts</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600" />
                <span className="ml-2 text-sm text-gray-700">Share event titles with work contacts</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600" defaultChecked />
                <span className="ml-2 text-sm text-gray-700">Allow meeting suggestions from contacts</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Event Reminders</h4>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600" defaultChecked />
                <span className="ml-2 text-sm text-gray-700">15 minutes before events</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600" />
                <span className="ml-2 text-sm text-gray-700">1 hour before events</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600" defaultChecked />
                <span className="ml-2 text-sm text-gray-700">Email notifications</span>
              </label>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Task Notifications</h4>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600" defaultChecked />
                <span className="ml-2 text-sm text-gray-700">Task due reminders</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600" defaultChecked />
                <span className="ml-2 text-sm text-gray-700">Overdue task alerts</span>
              </label>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Conflict Alerts</h4>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600" defaultChecked />
                <span className="ml-2 text-sm text-gray-700">Schedule conflict detection</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600" defaultChecked />
                <span className="ml-2 text-sm text-gray-700">Meeting suggestion notifications</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}