/**
 * Phase 8.9 - History as Story
 *
 * "History should explain why today looks the way it does."
 *
 * Core Philosophy: History as narrative (cause → effect → consequence), not data.
 */

// =============================================================================
// HISTORY LENSES (Only Three Allowed)
// =============================================================================

export type HistoryLens =
  | 'execution-history'    // Run → Run (macro story)
  | 'test-history'         // Test → Time (micro story)
  | 'risk-history';        // Signal → Impact (executive story)

/**
 * History Lens Definitions
 */
export const HISTORY_LENSES: Record<HistoryLens, {
  question: string;
  visualForm: string;
  rules: string[];
  interactions: string[];
  purpose: string;
}> = {
  'execution-history': {
    question: 'How did the system behave over time?',
    visualForm: 'Horizontal execution timeline with discrete nodes',
    rules: [
      'Each execution = one discrete node',
      'Node states: Passed, Failed, Risky, Skipped',
      'No continuous line, no aggregation blur',
      'Each run is atomic'
    ],
    interactions: [
      'Click node → Execution Index',
      'Hover → quick summary (pass rate, failures, duration)'
    ],
    purpose: 'Executions are events, not values. Events belong on timelines.'
  },
  'test-history': {
    question: 'Can I trust this test?',
    visualForm: 'Single-row timeline per test (dots, not bars)',
    rules: [
      'Chronological left → right',
      'States: Green dot (passed), Amber (flaky), Red (failed), Hollow (skipped)',
      'Only one test at a time',
      'Never show multiple test histories together'
    ],
    interactions: [
      'Click any dot → open Debugger for that execution',
      'Hover dot → duration + failure reason summary'
    ],
    purpose: 'Trust is built from patterns, not counts.'
  },
  'risk-history': {
    question: 'Is risk increasing or stabilizing?',
    visualForm: 'Minimal stacked signal timeline',
    rules: [
      'Each point: Blocking risk, High risk, Informational',
      'No numbers on the chart (appear outside)',
      'Timeline only shows direction',
      'Flat → stable, Upward → accumulating risk, Downward → recovery'
    ],
    interactions: [
      'Click signal → filtered view',
      'Hover → risk explanation'
    ],
    purpose: 'This is not per test. This is executive risk assessment.'
  }
};

// =============================================================================
// HISTORY ENTRY POINTS (No Standalone Pages)
// =============================================================================

export type HistoryEntryPoint =
  | 'execution-index'      // → Execution History
  | 'test-case-view'       // → Test History
  | 'executive-overview';  // → Risk History

/**
 * Entry Point Contracts
 */
export const HISTORY_ENTRY_CONTRACTS: Record<HistoryEntryPoint, {
  source: string;
  destination: HistoryLens;
  context: string;
  trigger: string;
}> = {
  'execution-index': {
    source: 'Execution Index',
    destination: 'execution-history',
    context: 'How did executions behave over time?',
    trigger: 'History button or timeline view'
  },
  'test-case-view': {
    source: 'Test Case View',
    destination: 'test-history',
    context: 'Can I trust this specific test?',
    trigger: 'History tab or timeline section'
  },
  'executive-overview': {
    source: 'Executive Overview',
    destination: 'risk-history',
    context: 'Is system risk increasing or stabilizing?',
    trigger: 'Risk timeline section'
  }
};

// =============================================================================
// PROGRESSIVE DISCLOSURE LEVELS
// =============================================================================

export type DisclosureLevel =
  | 'summary'      // "Something changed"
  | 'pattern'      // "This keeps happening"
  | 'cause'        // "This specific run caused it"
  | 'evidence';    // "Debugger / artifacts"

export const DISCLOSURE_LEVELS: Record<DisclosureLevel, {
  description: string;
  reveals: string;
  nextAction: string;
}> = {
  summary: {
    description: 'High-level change detection',
    reveals: 'That something changed',
    nextAction: 'Show pattern'
  },
  pattern: {
    description: 'Recurring behavior identification',
    reveals: 'This keeps happening',
    nextAction: 'Show specific cause'
  },
  cause: {
    description: 'Root cause identification',
    reveals: 'This specific run caused it',
    nextAction: 'Show evidence'
  },
  evidence: {
    description: 'Detailed investigation',
    reveals: 'Full context in Debugger/artifacts',
    nextAction: 'None - investigation complete'
  }
};

// =============================================================================
// COGNITIVE LOAD GUARDRAILS
// =============================================================================

export const COGNITIVE_GUARDRAILS = {
  maxVisibleNodes: 30,           // Max timeline nodes visible at once
  autoCollapseOlder: true,       // Older history collapses automatically
  noInfiniteScroll: true,        // No infinite scroll
  noZoomGestures: true,          // No zoom gestures
  intentionalOnly: true          // Orbis is intentional, not exploratory chaos
} as const;

// =============================================================================
// HISTORY → OTHER VIEW CONTRACTS
// =============================================================================

export const HISTORY_CONTRACTS = {
  'history-to-debugger': {
    alwaysOpensWithContext: true,
    showsBeforeAfterMarkers: true,
    preservesHistoricalView: true,
    providesRunContext: true
  },
  'history-to-execution-index': {
    filteredViewOnly: true,
    neverResetsUserContext: true,
    preservesFilters: true,
    providesTemporalContext: true
  }
} as const;

// =============================================================================
// EMOTIONAL TONE OF HISTORY
// =============================================================================

export const HISTORY_EMOTIONAL_TONE = {
  not: [
    'Here is everything that ever happened',
    'Look at all this data!',
    'Impressive timeline!'
  ],
  but: [
    'Here is why this matters now',
    'This explains the current state',
    'Focus on what changed'
  ],
  qualities: ['narrative', 'explanatory', 'focused']
} as const;

// =============================================================================
// HISTORY VALIDATION RULES
// =============================================================================

export function validateHistoryImplementation(
  lens: HistoryLens,
  entryPoint: HistoryEntryPoint,
  disclosureLevel: DisclosureLevel
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check lens and entry point alignment
  const contract = HISTORY_ENTRY_CONTRACTS[entryPoint];
  if (contract.destination !== lens) {
    issues.push(`Entry point ${entryPoint} should lead to ${contract.destination}, not ${lens}`);
  }

  // Check progressive disclosure
  const currentLevelIndex = Object.keys(DISCLOSURE_LEVELS).indexOf(disclosureLevel);
  if (currentLevelIndex > 0) {
    // Higher levels require lower levels first
    const requiredLevels = Object.keys(DISCLOSURE_LEVELS).slice(0, currentLevelIndex);
    // In real implementation, check if previous levels were properly shown
  }

  // Check cognitive load limits
  // In real implementation, check visible node count

  return {
    valid: issues.length === 0,
    issues
  };
}

// =============================================================================
// HISTORY STATE MANAGEMENT
// =============================================================================

export interface HistoryViewState {
  lens: HistoryLens;
  entryPoint: HistoryEntryPoint;
  disclosureLevel: DisclosureLevel;
  context: {
    testId?: string;
    executionId?: string;
    timeRange?: { start: number; end: number };
  };
  filters: Record<string, any>;
  visibleNodeCount: number;
}

export class HistoryStateManager {
  private currentState: HistoryViewState | null = null;

  enterHistory(entryPoint: HistoryEntryPoint, context: Partial<HistoryViewState['context']> = {}): HistoryViewState {
    const lens = HISTORY_ENTRY_CONTRACTS[entryPoint].destination;
    this.currentState = {
      lens,
      entryPoint,
      disclosureLevel: 'summary',
      context: { ...context },
      filters: {},
      visibleNodeCount: 0
    };
    return this.currentState;
  }

  progressDisclosure(): DisclosureLevel | null {
    if (!this.currentState) return null;

    const levels = Object.keys(DISCLOSURE_LEVELS) as DisclosureLevel[];
    const currentIndex = levels.indexOf(this.currentState.disclosureLevel);

    if (currentIndex < levels.length - 1) {
      this.currentState.disclosureLevel = levels[currentIndex + 1];
      return this.currentState.disclosureLevel;
    }

    return null; // Already at max disclosure
  }

  getCurrentState(): HistoryViewState | null {
    return this.currentState;
  }

  updateFilters(newFilters: Record<string, any>): void {
    if (this.currentState) {
      this.currentState.filters = { ...this.currentState.filters, ...newFilters };
    }
  }

  setVisibleNodeCount(count: number): void {
    if (this.currentState) {
      this.currentState.visibleNodeCount = count;
    }
  }
}

// Singleton instance
export const historyStateManager = new HistoryStateManager();
