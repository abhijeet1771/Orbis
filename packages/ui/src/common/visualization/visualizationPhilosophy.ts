/**
 * Phase 8.8 - Data Visualization Philosophy
 *
 * "A graph is not decoration. It is compressed truth."
 *
 * First Principle: If a visualization does not change a decision, it does not belong in Orbis.
 */

/**
 * Orbis Visualization Goals (in priority order)
 */
export const VISUALIZATION_GOALS = {
  reduceAmbiguity: 'Reduce ambiguity',
  exposeRisk: 'Expose risk',
  showChangeOverTime: 'Show change over time',
  enableDrillDown: 'Enable drill-down',
  preserveContext: 'Preserve context'
} as const;

/**
 * Banned Visualization Types (forever)
 */
export const BANNED_VISUALIZATION_TYPES = [
  'pie-charts',
  'donut-charts',
  '3d-charts',
  'decorative-gradients',
  'animated-bars-racing',
  'rainbow-legends',
  'charts-requiring-legends',
  'word-clouds',
  'radar-charts',
  'bubble-charts',
  'area-fill-charts',
  'sparklines-without-context'
] as const;

/**
 * Allowed Chart Primitives (only these)
 */
export type AllowedChartType =
  | 'horizontal-bars'      // For comparisons, ranking, "top offenders"
  | 'sparse-line-charts'   // For history (max 2 lines, inflection points only)
  | 'discrete-timelines'   // For events over executions (pass/fail/flaky states)
  | 'rare-heatmaps';       // For concentration detection (muted colors only)

/**
 * Chart Usage Guidelines
 */
export const CHART_USAGE_GUIDELINES: Record<AllowedChartType, {
  purpose: string[];
  maxPerScreen: number;
  colorRestriction: 'muted-only' | 'semantic-only';
  interactionRequirement: 'drill-down' | 'filter' | 'navigate';
}> = {
  'horizontal-bars': {
    purpose: ['longest-running-tests', 'most-failing-tests', 'risk-concentration'],
    maxPerScreen: 1,
    colorRestriction: 'semantic-only',
    interactionRequirement: 'drill-down'
  },
  'sparse-line-charts': {
    purpose: ['pass-rate-over-time', 'flakiness-trend', 'stability-trend'],
    maxPerScreen: 1,
    colorRestriction: 'muted-only',
    interactionRequirement: 'filter'
  },
  'discrete-timelines': {
    purpose: ['test-history', 'regression-detection', 'trust-evolution'],
    maxPerScreen: 2,
    colorRestriction: 'semantic-only',
    interactionRequirement: 'navigate'
  },
  'rare-heatmaps': {
    purpose: ['folder-regressions', 'tag-instability'],
    maxPerScreen: 1,
    colorRestriction: 'muted-only',
    interactionRequirement: 'drill-down'
  }
};

/**
 * Color Semantics (locked)
 */
export const VISUALIZATION_COLOR_SEMANTICS = {
  neutral: 'var(--color-neutral-500)',    // Baseline
  failure: 'var(--color-fail)',           // Muted red
  risk: 'var(--color-risk)',             // Muted amber
  stability: 'var(--color-pass)',         // Muted green

  // Rules: Never pure red/green, never encode multiple meanings
  rules: {
    neverPureColors: true,
    neverMultipleMeanings: true,
    alwaysPairedWithPositionOrShape: true,
    mustBeReadableWithoutColor: true
  }
} as const;

/**
 * Density Rules
 */
export const DENSITY_RULES = {
  maxPrimaryCharts: 1,        // One primary chart per screen
  maxSecondaryVisuals: 2,     // Max 2 secondary visuals
  everythingElseText: true,   // Rest must be text
  noScrollRequired: true      // Must fit without scrolling
} as const;

/**
 * Context Preservation Questions
 * Every chart must answer at least one explicitly
 */
export const CONTEXT_QUESTIONS = [
  'Compared to what?',
  'Compared to when?',
  'Compared to whom?'
] as const;

/**
 * Drill-Down Philosophy
 */
export const DRILL_DOWN_CONTRACT = {
  chartsAreEntryPoints: true,     // Not destinations
  neverOpenModals: true,          // Always deepen story
  clickBehaviors: {
    barClick: 'filtered-execution-index',
    timelinePointClick: 'specific-run',
    anomalyClick: 'debugger',
    heatmapCellClick: 'filtered-view'
  }
} as const;

/**
 * Numbers > Shapes Rule
 */
export const NUMBERS_FIRST_RULE = {
  keyNumbersAlways: {
    largerThanCharts: true,
    moreReadableThanCharts: true,
    visibleWithoutHover: true,
    chartsSupportNumbers: true    // Never replace numbers
  }
} as const;

/**
 * Validation Checklist
 */
export function validateVisualizationProposal(proposal: {
  type: string;
  purpose: string;
  screen: string;
  revealsNonObvious: boolean;
  simplerAlternative?: string;
}): { valid: boolean; issues: string[]; score: number } {
  const issues: string[] = [];
  let score = 0;

  // Check if type is allowed
  if (!Object.keys(CHART_USAGE_GUIDELINES).includes(proposal.type)) {
    issues.push(`Chart type "${proposal.type}" is not in the allowed primitives`);
    return { valid: false, issues, score: 0 };
  }

  // Check if reveals non-obvious insight
  if (!proposal.revealsNonObvious) {
    issues.push('Must reveal something non-obvious to justify visualization');
    score -= 2;
  } else {
    score += 1;
  }

  // Check if simpler alternative exists
  if (proposal.simplerAlternative) {
    issues.push(`Simpler alternative available: ${proposal.simplerAlternative}`);
    score -= 1;
  }

  // Check density rules for screen
  const screenDensity = getScreenDensityLimits(proposal.screen);
  if (screenDensity.maxCharts === 0) {
    issues.push(`Screen "${proposal.screen}" should not have charts`);
    return { valid: false, issues, score: 0 };
  }

  // Check purpose alignment
  const allowedPurposes = CHART_USAGE_GUIDELINES[proposal.type as AllowedChartType].purpose;
  if (!allowedPurposes.includes(proposal.purpose)) {
    issues.push(`Purpose "${proposal.purpose}" not allowed for chart type "${proposal.type}"`);
    score -= 1;
  }

  // CEO test (3 seconds)
  score += 1; // Assume passes unless proven otherwise

  // Engineer action test (10 seconds)
  score += 1; // Assume passes unless proven otherwise

  const valid = issues.length === 0 && score >= 2;

  return { valid, issues, score };
}

/**
 * Screen-specific density limits
 */
function getScreenDensityLimits(screen: string): { maxCharts: number; maxVisuals: number } {
  const limits: Record<string, { maxCharts: number; maxVisuals: number }> = {
    'executive-home': { maxCharts: 0, maxVisuals: 0 }, // Decision only, no charts
    'execution-index': { maxCharts: 1, maxVisuals: 2 }, // Sortable bars + counts
    'history-view': { maxCharts: 1, maxVisuals: 1 },   // Timelines, not lines
    'debugger': { maxCharts: 0, maxVisuals: 0 },      // Raw truth only
    'artifacts': { maxCharts: 0, maxVisuals: 1 }      // Visual previews only
  };

  return limits[screen] || { maxCharts: 0, maxVisuals: 0 };
}

/**
 * Emotional Tone Guidelines
 */
export const VISUALIZATION_EMOTIONAL_TONE = {
  not: [
    'Look how much data we have',
    'Wow, interactive!',
    'Pretty colors!'
  ],
  but: [
    'Here is the one thing you need to know',
    'This changes your decision',
    'Focus here'
  ],
  qualities: ['calm', 'certain', 'unrushed']
} as const;

/**
 * Chart Implementation Contract
 */
export interface ChartImplementationContract {
  type: AllowedChartType;
  data: any[];
  dimensions: {
    width: number;
    height: number;
  };
  interactions: {
    onClick?: (dataPoint: any) => void;
    onHover?: (dataPoint: any) => void;
  };
  context: {
    comparedToWhat?: string;
    comparedToWhen?: string;
    comparedToWhom?: string;
  };
  validation: {
    ceoUnderstandable: boolean;
    engineerActionable: boolean;
    revealsNonObvious: boolean;
    noSimplerAlternative: boolean;
  };
}

/**
 * Utility to enforce Numbers > Shapes rule
 */
export function enforceNumbersFirst(container: HTMLElement): void {
  const numbers = container.querySelectorAll('.key-number, .metric-value');
  const charts = container.querySelectorAll('.chart, .visualization');

  numbers.forEach(number => {
    const element = number as HTMLElement;
    // Ensure numbers are larger and more prominent than charts
    element.style.fontWeight = 'var(--font-weight-bold)';
    element.style.fontSize = 'var(--font-size-metrics)';
    element.style.color = 'var(--color-number-primary)';
  });

  charts.forEach(chart => {
    const element = chart as HTMLElement;
    // Ensure charts are secondary to numbers
    element.style.opacity = '0.8';
    element.style.fontSize = 'var(--font-size-sm)';
  });
}
