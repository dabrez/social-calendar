'use client';

import { useState, useEffect } from 'react';
import { Plus, Clock, Calendar, CheckSquare, Square, Brain, Loader2, Lightbulb } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

interface DurationEstimation {
  estimatedMinutes: number;
  formattedDuration: string;
  confidence: 'low' | 'medium' | 'high';
  reasoning: string[];
  suggestions: string[];
}

export function TaskPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [estimating, setEstimating] = useState(false);
  const [estimation, setEstimation] = useState<DurationEstimation | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    estimatedMinutes: '',
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          isCompleted: !task.isCompleted,
        }),
      });

      if (response.ok) {
        setTasks(tasks.map(t => 
          t.id === taskId 
            ? { ...t, isCompleted: !t.isCompleted }
            : t
        ));
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const estimateDuration = async () => {
    if (!formData.title) return;

    setEstimating(true);
    try {
      const response = await fetch('/api/tasks/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setEstimation(data);
        setFormData(prev => ({
          ...prev,
          estimatedMinutes: data.estimatedMinutes.toString(),
        }));
      }
    } catch (error) {
      console.error('Failed to estimate duration:', error);
    } finally {
      setEstimating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          estimatedMinutes: formData.estimatedMinutes ? parseInt(formData.estimatedMinutes) : null,
          dueDate: formData.dueDate || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTasks([data.task, ...tasks]);
        setFormData({
          title: '',
          description: '',
          dueDate: '',
          priority: 'medium',
          estimatedMinutes: '',
        });
        setEstimation(null);
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading tasks...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Tasks</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Task</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Task title..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Task description..."
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select 
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Estimated Time (minutes)
                  </label>
                  <button
                    type="button"
                    onClick={estimateDuration}
                    disabled={!formData.title || estimating}
                    className="flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {estimating ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Brain className="h-3 w-3 mr-1" />
                    )}
                    AI Estimate
                  </button>
                </div>
                <input
                  type="number"
                  value={formData.estimatedMinutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedMinutes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="60"
                />
              </div>
            </div>

            {estimation && (
              <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                <div className="flex items-center mb-2">
                  <Brain className="h-4 w-4 text-purple-600 mr-2" />
                  <span className="text-sm font-medium text-purple-900">
                    AI Estimation: {estimation.formattedDuration}
                  </span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    estimation.confidence === 'high' ? 'bg-green-100 text-green-700' :
                    estimation.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {estimation.confidence} confidence
                  </span>
                </div>
                
                {estimation.reasoning.length > 0 && (
                  <div className="text-xs text-purple-700 mb-2">
                    <strong>Reasoning:</strong>
                    <ul className="list-disc list-inside ml-2 mt-1">
                      {estimation.reasoning.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {estimation.suggestions.length > 0 && (
                  <div className="text-xs text-purple-700">
                    <div className="flex items-center mb-1">
                      <Lightbulb className="h-3 w-3 mr-1" />
                      <strong>Suggestions:</strong>
                    </div>
                    <ul className="list-disc list-inside ml-4">
                      {estimation.suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({
                    title: '',
                    description: '',
                    dueDate: '',
                    priority: 'medium',
                    estimatedMinutes: '',
                  });
                  setEstimation(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`bg-white rounded-lg shadow p-6 transition-all ${
              task.isCompleted ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start space-x-4">
              <button
                onClick={() => toggleTask(task.id)}
                className="mt-1 flex-shrink-0"
              >
                {task.isCompleted ? (
                  <CheckSquare className="h-5 w-5 text-green-600" />
                ) : (
                  <Square className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-lg font-medium ${
                    task.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}>
                    {task.title}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>

                {task.description && (
                  <p className="text-gray-600 mb-3">{task.description}</p>
                )}

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {task.dueDate && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                  {task.estimatedMinutes && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatDuration(task.estimatedMinutes)}
                      {task.actualMinutes && (
                        <span className="ml-1 text-xs text-gray-400">
                          (actual: {formatDuration(task.actualMinutes)})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
          <p className="text-gray-500">Get started by creating your first task.</p>
        </div>
      )}
    </div>
  );
}