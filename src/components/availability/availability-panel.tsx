'use client';

import { useState, useEffect } from 'react';
import { Users, Clock, Calendar, Plus, Search, Loader2, Star, TrendingUp } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  freeSlots?: Array<{
    start: string;
    end: string;
  }>;
}

interface MeetingSuggestion {
  start: string;
  end: string;
  duration: number;
  confidence: number;
  score: number;
  isPreferredTime?: boolean;
  participants: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

export function AvailabilityPanel() {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [meetingSuggestions, setMeetingSuggestions] = useState<MeetingSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    duration: 60,
    startDate: '',
    endDate: '',
    preferredTimes: [] as string[],
  });

  useEffect(() => {
    // Initialize with sample contacts for demo
    // In a real app, these would be fetched from your contacts/users API
    const sampleContacts: Contact[] = [
      {
        id: 'demo-1',
        name: 'Sarah Johnson',
        email: 'sarah@company.com',
      },
      {
        id: 'demo-2',
        name: 'Mike Chen',
        email: 'mike@company.com',
      },
      {
        id: 'demo-3',
        name: 'Emma Wilson',
        email: 'emma@company.com',
      }
    ];
    setContacts(sampleContacts);

    // Set default date range
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    setMeetingForm(prev => ({
      ...prev,
      startDate: now.toISOString().slice(0, 16),
      endDate: nextWeek.toISOString().slice(0, 16),
    }));
  }, []);

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const fetchAvailability = async () => {
    if (selectedContacts.length === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/availability?userIds=${selectedContacts.join(',')}&startDate=${meetingForm.startDate}&endDate=${meetingForm.endDate}`);
      if (response.ok) {
        const data = await response.json();
        
        // Update contacts with availability data
        setContacts(prev => prev.map(contact => {
          const availability = data.availabilities.find((a: any) => a.userId === contact.id);
          return {
            ...contact,
            freeSlots: availability?.freeSlots || [],
          };
        }));
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const suggestMeetingTimes = async () => {
    if (selectedContacts.length === 0) return;
    
    setSuggestionsLoading(true);
    try {
      const response = await fetch('/api/meetings/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedContacts,
          duration: meetingForm.duration,
          startDate: meetingForm.startDate,
          endDate: meetingForm.endDate,
          preferredTimes: meetingForm.preferredTimes,
          title: meetingForm.title,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setMeetingSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Failed to get meeting suggestions:', error);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadge = (confidence: number): string => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Availability</h2>
        <button 
          onClick={() => setShowMeetingForm(!showMeetingForm)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Schedule Meeting
        </button>
      </div>

      {/* Meeting Form */}
      {showMeetingForm && (
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Find Meeting Time</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meeting Title
              </label>
              <input
                type="text"
                value={meetingForm.title}
                onChange={(e) => setMeetingForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Team sync meeting"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <select
                value={meetingForm.duration}
                onChange={(e) => setMeetingForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="datetime-local"
                  value={meetingForm.startDate}
                  onChange={(e) => setMeetingForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="datetime-local"
                  value={meetingForm.endDate}
                  onChange={(e) => setMeetingForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowMeetingForm(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={suggestMeetingTimes}
              disabled={selectedContacts.length === 0 || suggestionsLoading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {suggestionsLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4 mr-2" />
              )}
              Find Times
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contacts List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Your Contacts</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedContacts.includes(contact.id)
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => toggleContact(contact.id)}
                >
                  <div className="relative flex-shrink-0">
                    <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {contact.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${
                      contact.freeSlots && contact.freeSlots.length > 0 ? 'bg-green-400' : 'bg-gray-400'
                    }`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {contact.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {contact.email}
                    </p>
                    <div className="flex items-center mt-1">
                      <Clock className="h-3 w-3 text-gray-400 mr-1" />
                      <span className="text-xs text-gray-500">
                        {contact.freeSlots ? `${contact.freeSlots.length} free slots` : '9:00 - 17:00'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Availability Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Availability */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Current Availability</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selectedContacts.length > 0 ? (
                selectedContacts.map(contactId => {
                  const contact = contacts.find(c => c.id === contactId);
                  if (!contact) return null;
                  
                  return (
                    <div key={contact.id} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                      <div className="relative flex-shrink-0">
                        <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-700">
                            {contact.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-white ${
                          contact.isAvailable ? 'bg-green-400' : 'bg-red-400'
                        }`} />
                      </div>
                      
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                        <p className="text-xs text-gray-500">
                          {contact.isAvailable 
                            ? 'Available now' 
                            : `Next free: ${contact.nextFreeSlot?.toLocaleString()}`
                          }
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  Select contacts to see their availability
                </div>
              )}
            </div>
          </div>

          {/* Suggested Meeting Times */}
          {meetingSuggestions.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Suggested Meeting Times</h3>
                {suggestionsLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                )}
              </div>
              
              <div className="space-y-3">
                {meetingSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-4 border-2 rounded-lg transition-colors cursor-pointer ${
                      suggestion.isPreferredTime 
                        ? 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {formatDateTime(suggestion.start)}
                          </span>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`px-2 py-1 text-xs rounded-full ${getConfidenceBadge(suggestion.confidence)}`}>
                              {Math.round(suggestion.confidence * 100)}% available
                            </span>
                            {suggestion.isPreferredTime && (
                              <div className="flex items-center">
                                <Star className="h-3 w-3 text-yellow-500 mr-1" />
                                <span className="text-xs text-yellow-700">Preferred</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex -space-x-2">
                        {suggestion.participants.slice(0, 4).map((participant) => (
                          <div
                            key={participant.id}
                            className="h-6 w-6 bg-blue-500 text-white rounded-full border-2 border-white flex items-center justify-center"
                          >
                            <span className="text-xs font-medium">
                              {participant.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        ))}
                        {suggestion.participants.length > 4 && (
                          <div className="h-6 w-6 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center">
                            <span className="text-xs text-gray-600">
                              +{suggestion.participants.length - 4}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium bg-blue-50 hover:bg-blue-100 rounded-md transition-colors">
                      Schedule
                    </button>
                  </div>
                ))}
              </div>
              
              {selectedContacts.length > 0 && meetingSuggestions.length === 0 && !suggestionsLoading && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No available meeting times found for selected participants</p>
                  <p className="text-sm mt-1">Try adjusting the date range or meeting duration</p>
                </div>
              )}
            </div>
          )}

          {/* Current Availability Display */}
          {selectedContacts.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Current Availability</h3>
                <button
                  onClick={fetchAvailability}
                  disabled={loading}
                  className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedContacts.map(contactId => {
                  const contact = contacts.find(c => c.id === contactId);
                  if (!contact) return null;
                  
                  return (
                    <div key={contact.id} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                      <div className="relative flex-shrink-0">
                        <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-700">
                            {contact.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-white ${
                          contact.freeSlots && contact.freeSlots.length > 0 ? 'bg-green-400' : 'bg-red-400'
                        }`} />
                      </div>
                      
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                        <p className="text-xs text-gray-500">
                          {contact.freeSlots && contact.freeSlots.length > 0
                            ? `${contact.freeSlots.length} available time slots`
                            : 'No availability data'
                          }
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}