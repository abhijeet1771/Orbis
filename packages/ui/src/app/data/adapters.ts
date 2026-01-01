import type { TestRun } from '@orbisreport/core';
import { getRun } from '../api/client';
import { LiveRunStore } from './liveStore';

export interface RunDataAdapter {
  mode: 'static' | 'live';
  connect(): void;
  disconnect(): void;
  getRun(): TestRun | null;
  subscribe(cb: () => void): () => void;
}

export class StaticDataAdapter implements RunDataAdapter {
  mode: 'static' = 'static';
  private run: TestRun | null = null;
  private listeners = new Set<() => void>();
  private runId?: string;

  constructor(runId?: string) {
    this.runId = runId;
  }

  async load(runId: string): Promise<void> {
    this.runId = runId;
    this.run = await getRun(runId);
    this.notify();
  }

  connect(): void {
    /* no-op for static */
  }

  disconnect(): void {
    /* no-op for static */
  }

  getRun(): TestRun | null {
    return this.run;
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach(cb => cb());
  }
}

export class LiveDataAdapter implements RunDataAdapter {
  mode: 'live' = 'live';
  private store = new LiveRunStore();
  private listeners = new Set<() => void>();
  private source: EventSource | null = null;

  connect(): void {
    if (this.source) return;
    this.source = new EventSource('/live');
    this.source.onmessage = evt => {
      try {
        const data = JSON.parse(evt.data);
        const changed = this.store.apply(data);
        if (changed) this.notify();
      } catch {
        /* ignore malformed */
      }
    };
    this.source.onerror = () => {
      this.source?.close();
      this.source = null;
      setTimeout(() => this.connect(), 1500);
    };
  }

  disconnect(): void {
    this.source?.close();
    this.source = null;
  }

  getRun(): TestRun | null {
    return this.store.snapshot();
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach(cb => cb());
  }
}

