/**
 * Spatial Rhythm Utilities
 *
 * Helper functions for implementing the 5-zone spatial rhythm system.
 */

/**
 * Calculate zone heights based on current viewport
 */
export function calculateZoneHeights(viewportHeight: number): {
  zone1: number;
  zone2: number;
  zone3: number;
  zone4: number;
  zone5: number;
  total: number;
} {
  // Canonical calculations for 900px height
  const canonical = {
    zone1: 56,
    zone2: 198, // ~22%
    zone3: 315, // ~35%
    zone4: 144, // ~16%
    zone5: 72   // ~8%
  };

  // Scale based on actual viewport
  const scale = viewportHeight / 900;

  return {
    zone1: Math.round(canonical.zone1 * scale),
    zone2: Math.round(canonical.zone2 * scale),
    zone3: Math.round(canonical.zone3 * scale),
    zone4: Math.round(canonical.zone4 * scale),
    zone5: Math.round(canonical.zone5 * scale),
    total: viewportHeight
  };
}

/**
 * Validate that content fits within viewport (no scroll)
 */
export function validateViewportFit(
  contentHeight: number,
  viewportHeight: number
): { fits: boolean; overflow: number } {
  const overflow = contentHeight - viewportHeight;
  return {
    fits: overflow <= 0,
    overflow: Math.max(0, overflow)
  };
}

/**
 * Get column span width for logical grid
 */
export function getColumnSpan(span: number, totalColumns = 12): string {
  return `calc((100vw / ${totalColumns}) * ${span})`;
}

/**
 * Apply density gradient styling
 */
export function applyDensityGradient(element: HTMLElement, density: number): void {
  // Density affects spacing and visual weight
  const spacingMultiplier = 0.5 + (density * 0.5); // 0.5 to 1.0
  const opacity = 0.7 + (density * 0.3); // 0.7 to 1.0

  element.style.setProperty('--local-density', density.toString());
  element.style.setProperty('--density-spacing', `${spacingMultiplier}`);
  element.style.opacity = opacity.toString();
}

/**
 * Ensure proper focus flow (accessibility)
 */
export function setupFocusFlow(container: HTMLElement): void {
  const focusableElements = container.querySelectorAll(
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  // Ensure logical tab order matches visual hierarchy
  focusableElements.forEach((element, index) => {
    (element as HTMLElement).style.setProperty('--focus-order', index.toString());
  });
}

/**
 * Measure content to ensure viewport compliance
 */
export function measureContentHeight(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  return rect.height;
}

/**
 * Adjust spacing for breathing room
 */
export function applyBreathingSpace(element: HTMLElement, multiplier = 1): void {
  const baseSpacing = 8; // 8px base
  const breathingSpace = baseSpacing * multiplier;

  element.style.marginBottom = `${breathingSpace}px`;
  element.style.padding = `${breathingSpace * 0.5}px`;
}

/**
 * Validate spatial rhythm implementation
 */
export function validateSpatialRhythm(
  container: HTMLElement
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for scrolling
  if (container.scrollHeight > container.clientHeight) {
    issues.push('Content exceeds viewport height - scrolling detected');
  }

  // Check zone structure
  const zones = container.querySelectorAll('[class*="zone-"]');
  if (zones.length !== 5) {
    issues.push(`Expected 5 zones, found ${zones.length}`);
  }

  // Check density gradient
  const zoneElements = Array.from(zones);
  let previousDensity = 0;
  zoneElements.forEach((zone, index) => {
    const density = parseFloat(
      getComputedStyle(zone as HTMLElement).getPropertyValue('--local-density') || '0'
    );

    // Density should generally increase down the page (with some exceptions)
    if (index > 0 && density < previousDensity * 0.8 && index < 3) {
      issues.push(`Zone ${index + 1} density (${density}) too low compared to previous (${previousDensity})`);
    }

    previousDensity = density;
  });

  // Check alignment
  const misaligned = container.querySelectorAll('[class*="float"], [style*="float"]');
  if (misaligned.length > 0) {
    issues.push('Found floating elements - use grid alignment instead');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
