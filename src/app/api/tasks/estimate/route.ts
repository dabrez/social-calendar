import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { DurationEstimator } from '@/lib/nlp/duration-estimator';

const durationEstimator = new DurationEstimator();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const estimation = durationEstimator.getEstimationExplanation(title, description);

    // Format the estimate for display
    const formatDuration = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      
      if (hours === 0) return `${mins} minutes`;
      if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
      return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`;
    };

    return NextResponse.json({
      estimatedMinutes: estimation.estimate,
      formattedDuration: formatDuration(estimation.estimate),
      confidence: estimation.confidence,
      reasoning: estimation.reasoning,
      suggestions: generateSuggestions(title, description, estimation.estimate),
    });
  } catch (error) {
    console.error('Duration estimation error:', error);
    return NextResponse.json(
      { error: 'Failed to estimate duration' },
      { status: 500 }
    );
  }
}

function generateSuggestions(title: string, description: string | undefined, estimateMinutes: number): string[] {
  const suggestions: string[] = [];
  const text = `${title} ${description || ''}`.toLowerCase();

  // Time management suggestions
  if (estimateMinutes > 120) {
    suggestions.push('Consider breaking this task into smaller subtasks');
  }

  if (estimateMinutes > 240) {
    suggestions.push('This seems like a multi-day task - consider setting intermediate milestones');
  }

  // Task-specific suggestions
  if (text.includes('meeting') || text.includes('call')) {
    suggestions.push('Block calendar time and send agenda in advance');
  }

  if (text.includes('code') || text.includes('develop')) {
    suggestions.push('Set up development environment and gather requirements first');
  }

  if (text.includes('research')) {
    suggestions.push('Define specific research questions and success criteria');
  }

  if (text.includes('write') || text.includes('document')) {
    suggestions.push('Create an outline before writing to stay focused');
  }

  if (text.includes('review') || text.includes('test')) {
    suggestions.push('Prepare test cases or review checklist beforehand');
  }

  // Complexity-based suggestions
  if (text.includes('complex') || text.includes('difficult')) {
    suggestions.push('Consider pairing with a colleague or seeking expert input');
  }

  if (text.includes('urgent') || text.includes('asap')) {
    suggestions.push('Focus on minimum viable solution first');
  }

  // Default suggestions for longer tasks
  if (estimateMinutes > 90 && suggestions.length === 0) {
    suggestions.push('Plan regular breaks to maintain focus and productivity');
  }

  return suggestions;
}