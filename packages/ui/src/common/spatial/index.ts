/**
 * Orbis Spatial Rhythm System - Phase 8.5
 *
 * Prime Rule: Everything important fits in one viewport. No scroll.
 * Target Viewport: 1440 × 900 (canonical)
 * Grid System: 12-column logical grid (invisible)
 * Vertical Structure: 5 zones with precise spatial relationships
 *
 * ZONE 1 — Executive Header (56px) - Identity + context
 * ZONE 2 — Primary Decision Band (198px) - Verdict nucleus
 * ZONE 3 — Intelligence Triad (315px) - The brain (ownership, governance, trust)
 * ZONE 4 — Evidence Gateway (144px) - Action layer (why, failures, hotspots)
 * ZONE 5 — Navigation Spine (72px) - Silent navigation
 */

// Import spatial rhythm system
import './spatialRhythm.css';

// Export spatial utilities
export * from './spatialUtils.js';

// =============================================================================
// SPATIAL RHYTHM PHILOSOPHY SUMMARY
// =============================================================================

/**
 * Phase 8.5 - Home Layout Grid & Spatial Rhythm
 *
 * Prime Rule: Everything important fits in one viewport. No scroll.
 *
 * 5-Zone Vertical Structure:
 * 1. Executive Header - Fixed identity (56px)
 * 2. Primary Decision Band - Verdict nucleus (198px ~22%)
 * 3. Intelligence Triad - The brain (315px ~35%)
 * 4. Evidence Gateway - Action layer (144px ~16%)
 * 5. Navigation Spine - Silent navigation (72px ~8%)
 *
 * Spatial Rhythm Rules:
 * - Density Gradient: Top calm/sparse → Bottom denser/actionable
 * - Breathing Space: Vertical spacing > horizontal
 * - Alignment Discipline: Logical grid alignment
 *
 * Focus Flow: Verdict → Explanation → Impact → Evidence → Action
 *
 * Bans: No nested scrolling, collapsible sections, tabs, filters, charts
 *
 * CEO Glance Test: Answer in 5 seconds - ship? why/not? where next?
 */
