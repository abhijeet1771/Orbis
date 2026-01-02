import type { TestCaseResult } from '@orbisreport/core';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface OwnershipInfo {
  ownerTeam?: string;
  featureArea?: string;
  severity?: SeverityLevel;
}

export type OwnershipMap = Record<string, OwnershipInfo>;

const severityOrder: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];

export async function loadOwnershipMap(): Promise<OwnershipMap | undefined> {
  try {
    const res = await fetch('/ownership.json', { cache: 'no-store' });
    if (!res.ok) return undefined;
    const data = (await res.json()) as OwnershipMap;
    return data;
  } catch {
    return undefined;
  }
}

export function resolveOwnership(test: TestCaseResult, ownershipMap?: OwnershipMap): OwnershipInfo {
  const fromMap = ownershipMap?.[test.testId];
  const fromTags = parseTags(test.tags ?? []);
  const fromFolder = inferFromPath(test.location.file);

  return {
    ownerTeam: fromMap?.ownerTeam ?? fromTags.ownerTeam ?? fromFolder.ownerTeam,
    featureArea: fromMap?.featureArea ?? fromTags.featureArea ?? fromFolder.featureArea,
    severity: fromMap?.severity ?? fromTags.severity ?? fromFolder.severity
  };
}

export function pickHigherSeverity(a?: SeverityLevel, b?: SeverityLevel): SeverityLevel | undefined {
  if (!a) return b;
  if (!b) return a;
  return severityOrder.indexOf(b) > severityOrder.indexOf(a) ? b : a;
}

function parseTags(tags: string[]): OwnershipInfo {
  let ownerTeam: string | undefined;
  let featureArea: string | undefined;
  let severity: SeverityLevel | undefined;
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    if (lower.startsWith('owner:')) ownerTeam = tag.split(':')[1] ?? ownerTeam;
    if (lower.startsWith('feature:')) featureArea = tag.split(':')[1] ?? featureArea;
    if (lower.startsWith('severity:')) {
      const level = tag.split(':')[1] as SeverityLevel;
      if (severityOrder.includes(level)) severity = level;
    }
  }
  return { ownerTeam, featureArea, severity };
}

function inferFromPath(file: string): OwnershipInfo {
  const parts = file.replace(/\\/g, '/').split('/');
  const ownerTeam = parts.length > 1 ? parts[0] : undefined;
  const featureArea = parts.length > 2 ? parts[1] : ownerTeam;
  return { ownerTeam, featureArea, severity: undefined };
}

