export interface SavedWorkspace {
    path: string;
    projectHash: string;
    source: 'cli' | 'saved' | 'auto' | 'cwd';
    lastUsed: number;
}
export interface ResolvedWorkspace {
    path: string;
    projectHash: string;
    source: SavedWorkspace['source'];
    reason: string;
}
export declare function getOrbisHome(): Promise<string>;
export declare function resolveProjectHash(cwd: string): Promise<string>;
export declare function loadSavedWorkspace(): Promise<SavedWorkspace | undefined>;
export declare function saveWorkspaceSelection(ws: SavedWorkspace): Promise<void>;
export interface ResolveWorkspaceOptions {
    cliWorkspace?: string;
    cwd?: string;
}
export declare function resolveWorkspace(options?: ResolveWorkspaceOptions): Promise<ResolvedWorkspace>;
//# sourceMappingURL=workspace.d.ts.map