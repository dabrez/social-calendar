'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Calendar, X, CheckCircle, RefreshCw } from 'lucide-react';

interface ConflictEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  isWork: boolean;
  calendar: string;
}

interface Conflict {
  id: string;
  type: 'overlap' | 'double_booking' | 'back_to_back' | 'travel_time';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestions: string[];
  overlapDuration?: number;
  primaryEvent: ConflictEvent;
  conflictingEvent: ConflictEvent;
}

interface ConflictStats {
  total: number;
  bySeverity: { [key: string]: number };
  byType: { [key: string]: number };
}

export function ConflictPanel() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [stats, setStats] = useState<ConflictStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [dismissedConflicts, setDismissedConflicts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchConflicts();
  }, []);

  const fetchConflicts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/conflicts');
      if (response.ok) {
        const data = await response.json();
        setConflicts(data.conflicts);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch conflicts:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissConflict = (conflictId: string) => {
    setDismissedConflicts(prev => new Set(prev).add(conflictId));
    setSelectedConflict(null);
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'text-red-700 bg-red-100 border-red-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Clock className="h-4 w-4" />;
      case 'low':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'overlap': return 'Time Overlap';
      case 'double_booking': return 'Double Booking';
      case 'back_to_back': return 'Back-to-Back';
      case 'travel_time': return 'Travel Time';
      default: return type;
    }
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const visibleConflicts = conflicts.filter(conflict => !dismissedConflicts.has(conflict.id));
  const highPriorityCount = visibleConflicts.filter(c => c.severity === 'critical' || c.severity === 'high').length;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Checking for conflicts...</span>
        </div>
      </div>
    );
  }

  if (visibleConflicts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Schedule Conflicts</h3>
          <button
            onClick={fetchConflicts}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Conflicts Found</h4>
          <p className="text-gray-500">Your schedule looks good! No conflicts detected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Schedule Conflicts</h3>
            <p className="text-sm text-gray-500 mt-1">
              {visibleConflicts.length} conflict{visibleConflicts.length !== 1 ? 's' : ''} detected
              {highPriorityCount > 0 && (
                <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                  {highPriorityCount} high priority
                </span>
              )}
            </p>
          </div>
          <button
            onClick={fetchConflicts}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {stats && (
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.bySeverity.critical || 0}</div>
              <div className="text-xs text-gray-500">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{stats.bySeverity.high || 0}</div>
              <div className="text-xs text-gray-500">High</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{stats.bySeverity.medium || 0}</div>
              <div className="text-xs text-gray-500">Medium</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{stats.bySeverity.low || 0}</div>
              <div className="text-xs text-gray-500">Low</div>
            </div>
          </div>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {visibleConflicts.map((conflict) => (
          <div
            key={conflict.id}
            className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
            onClick={() => setSelectedConflict(conflict)}
          >
            <div className="flex items-start space-x-3">
              <div className={`p-1 rounded ${getSeverityColor(conflict.severity)}`}>
                {getSeverityIcon(conflict.severity)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(conflict.severity)}`}>
                    {getTypeLabel(conflict.type)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(conflict.primaryEvent.startTime)}
                  </span>
                </div>
                
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {conflict.description}
                </p>
                
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex items-center">
                    <span className="font-medium">{conflict.primaryEvent.title}</span>
                    <span className="mx-2">•</span>
                    <span>{formatTime(conflict.primaryEvent.startTime)} - {formatTime(conflict.primaryEvent.endTime)}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium">{conflict.conflictingEvent.title}</span>
                    <span className="mx-2">•</span>
                    <span>{formatTime(conflict.conflictingEvent.startTime)} - {formatTime(conflict.conflictingEvent.endTime)}</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissConflict(conflict.id);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Conflict Detail Modal */}
      {selectedConflict && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-medium text-gray-900">Conflict Details</h4>
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(selectedConflict.severity)} mt-2`}>
                    {getSeverityIcon(selectedConflict.severity)}
                    <span className="ml-1">{getTypeLabel(selectedConflict.type)} - {selectedConflict.severity.charAt(0).toUpperCase() + selectedConflict.severity.slice(1)}</span>
                  </span>
                </div>
                <button
                  onClick={() => setSelectedConflict(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Problem</h5>
                  <p className="text-sm text-gray-600">{selectedConflict.description}</p>
                  {selectedConflict.overlapDuration && (
                    <p className="text-sm text-gray-500 mt-1">
                      Overlap duration: {selectedConflict.overlapDuration} minutes
                    </p>
                  )}
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Events</h5>
                  <div className="space-y-2">
                    <div className="p-3 bg-gray-50 rounded-md">
                      <div className="font-medium text-sm text-gray-900">
                        {selectedConflict.primaryEvent.title}
                      </div>
                      <div className="text-xs text-gray-600">
                        {formatDate(selectedConflict.primaryEvent.startTime)} • {formatTime(selectedConflict.primaryEvent.startTime)} - {formatTime(selectedConflict.primaryEvent.endTime)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {selectedConflict.primaryEvent.calendar} • {selectedConflict.primaryEvent.isWork ? 'Work' : 'Personal'}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-md">
                      <div className="font-medium text-sm text-gray-900">
                        {selectedConflict.conflictingEvent.title}
                      </div>
                      <div className="text-xs text-gray-600">
                        {formatDate(selectedConflict.conflictingEvent.startTime)} • {formatTime(selectedConflict.conflictingEvent.startTime)} - {formatTime(selectedConflict.conflictingEvent.endTime)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {selectedConflict.conflictingEvent.calendar} • {selectedConflict.conflictingEvent.isWork ? 'Work' : 'Personal'}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedConflict.suggestions.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Suggestions</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {selectedConflict.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedConflict(null)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
                <button
                  onClick={() => dismissConflict(selectedConflict.id)}
                  className="px-4 py-2 text-sm text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}