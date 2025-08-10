interface TaskPattern {
  keywords: string[];
  baseMinutes: number;
  multipliers?: { [key: string]: number };
}

export class DurationEstimator {
  private patterns: TaskPattern[] = [
    // Meetings and calls
    {
      keywords: ['meeting', 'call', 'standup', 'sync', 'check-in', 'discussion'],
      baseMinutes: 30,
      multipliers: {
        'quick': 0.5,
        'brief': 0.5,
        'short': 0.5,
        'long': 2,
        'extended': 2.5,
        'all-day': 8,
        'team': 1.5,
        'client': 1.5
      }
    },
    
    // Development tasks
    {
      keywords: ['code', 'develop', 'implement', 'build', 'create', 'program', 'debug', 'fix'],
      baseMinutes: 120,
      multipliers: {
        'simple': 0.5,
        'basic': 0.5,
        'quick': 0.5,
        'complex': 2,
        'advanced': 2.5,
        'refactor': 1.5,
        'prototype': 0.8,
        'production': 2
      }
    },
    
    // Research and analysis
    {
      keywords: ['research', 'analyze', 'investigate', 'study', 'explore', 'learn'],
      baseMinutes: 90,
      multipliers: {
        'quick': 0.5,
        'deep': 2,
        'thorough': 2,
        'comprehensive': 3,
        'preliminary': 0.7
      }
    },
    
    // Documentation
    {
      keywords: ['document', 'write', 'documentation', 'readme', 'manual', 'guide'],
      baseMinutes: 60,
      multipliers: {
        'quick': 0.5,
        'brief': 0.5,
        'detailed': 2,
        'comprehensive': 3,
        'technical': 1.5
      }
    },
    
    // Design tasks
    {
      keywords: ['design', 'mockup', 'wireframe', 'prototype', 'ui', 'ux'],
      baseMinutes: 90,
      multipliers: {
        'simple': 0.7,
        'complex': 2,
        'detailed': 1.5,
        'high-fidelity': 2,
        'low-fidelity': 0.8
      }
    },
    
    // Testing
    {
      keywords: ['test', 'testing', 'qa', 'review', 'validate'],
      baseMinutes: 45,
      multipliers: {
        'quick': 0.5,
        'thorough': 2,
        'comprehensive': 2.5,
        'unit': 0.8,
        'integration': 1.5,
        'e2e': 2
      }
    },
    
    // Administrative tasks
    {
      keywords: ['email', 'admin', 'administrative', 'paperwork', 'form', 'application'],
      baseMinutes: 20,
      multipliers: {
        'quick': 0.5,
        'detailed': 1.5,
        'complex': 2
      }
    },
    
    // Presentations
    {
      keywords: ['presentation', 'present', 'demo', 'showcase', 'pitch'],
      baseMinutes: 45,
      multipliers: {
        'prepare': 3,
        'create': 4,
        'deliver': 1,
        'practice': 1.5
      }
    }
  ];

  private commonMultipliers = {
    // Size indicators
    'small': 0.5,
    'large': 2,
    'huge': 3,
    'tiny': 0.3,
    'massive': 4,
    
    // Urgency indicators
    'urgent': 0.8, // Less time available, work faster
    'asap': 0.8,
    'rush': 0.7,
    
    // Complexity indicators
    'simple': 0.6,
    'easy': 0.5,
    'hard': 2,
    'difficult': 2.5,
    'challenging': 2,
    
    // Time indicators
    'hour': 1,
    'hours': 2,
    'day': 8,
    'days': 16,
    'week': 40,
    'month': 160,
  };

  estimateDuration(title: string, description?: string): number {
    const text = `${title} ${description || ''}`.toLowerCase();
    const words = text.split(/\s+/);
    
    let bestMatch: TaskPattern | null = null;
    let matchScore = 0;
    
    // Find the best matching pattern
    for (const pattern of this.patterns) {
      const score = this.calculateMatchScore(words, pattern.keywords);
      if (score > matchScore) {
        matchScore = score;
        bestMatch = pattern;
      }
    }
    
    // Default estimate if no pattern matches
    let baseEstimate = bestMatch ? bestMatch.baseMinutes : 60;
    
    // Apply multipliers
    let totalMultiplier = 1;
    
    // Check pattern-specific multipliers
    if (bestMatch?.multipliers) {
      for (const [keyword, multiplier] of Object.entries(bestMatch.multipliers)) {
        if (text.includes(keyword)) {
          totalMultiplier *= multiplier;
        }
      }
    }
    
    // Apply common multipliers
    for (const [keyword, multiplier] of Object.entries(this.commonMultipliers)) {
      if (text.includes(keyword)) {
        totalMultiplier *= multiplier;
      }
    }
    
    // Check for numeric time indicators
    const timeMatch = this.extractTimeIndicators(text);
    if (timeMatch) {
      return timeMatch;
    }
    
    // Apply complexity heuristics
    totalMultiplier *= this.calculateComplexityMultiplier(text, words.length);
    
    const estimate = Math.round(baseEstimate * totalMultiplier);
    
    // Ensure reasonable bounds (5 minutes to 8 hours)
    return Math.max(5, Math.min(480, estimate));
  }
  
  private calculateMatchScore(words: string[], keywords: string[]): number {
    let score = 0;
    for (const keyword of keywords) {
      if (words.some(word => word.includes(keyword) || keyword.includes(word))) {
        score += 1;
      }
    }
    return score / keywords.length;
  }
  
  private extractTimeIndicators(text: string): number | null {
    // Look for explicit time mentions
    const timePatterns = [
      { pattern: /(\d+)\s*(minute|min)s?/i, multiplier: 1 },
      { pattern: /(\d+)\s*(hour|hr)s?/i, multiplier: 60 },
      { pattern: /(\d+)\s*(day)s?/i, multiplier: 480 }, // 8-hour work day
      { pattern: /(\d+)\s*(week)s?/i, multiplier: 2400 }, // 5-day work week
    ];
    
    for (const { pattern, multiplier } of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1]) * multiplier;
      }
    }
    
    return null;
  }
  
  private calculateComplexityMultiplier(text: string, wordCount: number): number {
    let multiplier = 1;
    
    // Longer descriptions often indicate more complex tasks
    if (wordCount > 20) multiplier *= 1.3;
    if (wordCount > 50) multiplier *= 1.5;
    
    // Technical terms increase complexity
    const technicalTerms = [
      'api', 'database', 'server', 'deploy', 'infrastructure',
      'architecture', 'framework', 'integration', 'migration',
      'optimization', 'performance', 'security', 'scalability'
    ];
    
    const technicalMatches = technicalTerms.filter(term => text.includes(term));
    if (technicalMatches.length > 0) {
      multiplier *= 1 + (technicalMatches.length * 0.2);
    }
    
    // Multiple steps or phases
    if (text.includes('step') || text.includes('phase') || text.includes('stage')) {
      multiplier *= 1.4;
    }
    
    // Collaboration indicators
    if (text.includes('team') || text.includes('collaborate') || text.includes('coordinate')) {
      multiplier *= 1.3;
    }
    
    return multiplier;
  }
  
  // Method to get explanation of the estimate
  getEstimationExplanation(title: string, description?: string): {
    estimate: number;
    reasoning: string[];
    confidence: 'low' | 'medium' | 'high';
  } {
    const estimate = this.estimateDuration(title, description);
    const text = `${title} ${description || ''}`.toLowerCase();
    const reasoning: string[] = [];
    
    // Find matched pattern
    const words = text.split(/\s+/);
    let bestMatch: TaskPattern | null = null;
    let matchScore = 0;
    
    for (const pattern of this.patterns) {
      const score = this.calculateMatchScore(words, pattern.keywords);
      if (score > matchScore) {
        matchScore = score;
        bestMatch = pattern;
      }
    }
    
    if (bestMatch) {
      const matchedKeywords = bestMatch.keywords.filter(keyword => 
        words.some(word => word.includes(keyword) || keyword.includes(word))
      );
      reasoning.push(`Identified as ${matchedKeywords.join(', ')} task (base: ${bestMatch.baseMinutes} min)`);
    }
    
    // Check for multipliers applied
    const appliedMultipliers: string[] = [];
    
    if (bestMatch?.multipliers) {
      for (const [keyword, multiplier] of Object.entries(bestMatch.multipliers)) {
        if (text.includes(keyword)) {
          appliedMultipliers.push(`${keyword} (${multiplier}x)`);
        }
      }
    }
    
    for (const [keyword, multiplier] of Object.entries(this.commonMultipliers)) {
      if (text.includes(keyword)) {
        appliedMultipliers.push(`${keyword} (${multiplier}x)`);
      }
    }
    
    if (appliedMultipliers.length > 0) {
      reasoning.push(`Applied multipliers: ${appliedMultipliers.join(', ')}`);
    }
    
    // Determine confidence
    let confidence: 'low' | 'medium' | 'high' = 'low';
    
    if (matchScore > 0.5) confidence = 'medium';
    if (matchScore > 0.8 || this.extractTimeIndicators(text)) confidence = 'high';
    
    if (words.length > 10) confidence = confidence === 'low' ? 'medium' : 'high';
    
    return {
      estimate,
      reasoning,
      confidence
    };
  }
}