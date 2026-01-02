/**
 * Orbis Data Visualization System - Phase 8.8
 *
 * "A graph is not decoration. It is compressed truth."
 *
 * First Principle: If a visualization does not change a decision, it does not belong.
 */

// Core philosophy and validation
export * from './visualizationPhilosophy.js';

// Chart components
export * from './components/HorizontalBars.js';
export * from './components/SparseLineChart.js';
export * from './components/DiscreteTimeline.js';

// =============================================================================
// VISUALIZATION PHILOSOPHY SUMMARY
// =============================================================================

/**
 * Orbis Visualization Goals (in priority order):
 * 1. Reduce ambiguity
 * 2. Expose risk
 * 3. Show change over time
 * 4. Enable drill-down
 * 5. Preserve context
 *
 * Allowed Chart Primitives:
 * - Horizontal Bars: comparisons, ranking, "top offenders"
 * - Sparse Line Charts: history (max 2 lines, inflection points only)
 * - Discrete Timelines: events over executions (pass/fail/flaky states)
 * - Rare Heatmaps: concentration detection (muted colors only)
 *
 * Banned Forever:
 * - Pie/donut charts, 3D charts, decorative gradients
 * - Animated bars racing, rainbow legends
 * - Charts requiring legends for basic understanding
 *
 * Color Semantics (locked):
 * - Neutral: baseline
 * - Muted red: failure
 * - Muted amber: risk
 * - Muted green: stability
 * - Never pure colors, never multiple meanings per color
 *
 * Density Rules:
 * - Max 1 primary chart per screen
 * - Max 2 secondary visuals per screen
 * - Everything else = text
 * - Must fit without scrolling
 *
 * Context Preservation: Must answer "Compared to what/when/whom?"
 *
 * Drill-Down Philosophy:
 * - Charts are entry points, never destinations
 * - Click → filtered view, never modals
 * - Always deepen the story
 *
 * Numbers > Shapes:
 * - Key numbers larger than charts
 * - More readable than charts
 * - Visible without hover
 * - Charts support numbers, never replace them
 *
 * Validation Checklist:
 * 1. CEO understand in 3 seconds?
 * 2. Engineer act in 10 seconds?
 * 3. Reveals non-obvious insight?
 * 4. No simpler alternative available?
 *
 * Emotional Tone: Calm, certain, unrushed
 * "Here is the one thing you need to know."
 */
