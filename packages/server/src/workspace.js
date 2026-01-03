"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrbisHome = getOrbisHome;
exports.resolveProjectHash = resolveProjectHash;
exports.loadSavedWorkspace = loadSavedWorkspace;
exports.saveWorkspaceSelection = saveWorkspaceSelection;
exports.resolveWorkspace = resolveWorkspace;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const node_crypto_1 = require("node:crypto");
const ORBIS_HOME_DIR = node_path_1.default.join(node_os_1.default.homedir(), '.orbis');
const WORKSPACE_FILE = node_path_1.default.join(ORBIS_HOME_DIR, 'workspace.json');
async function getOrbisHome() {
    await node_fs_1.promises.mkdir(ORBIS_HOME_DIR, { recursive: true });
    return ORBIS_HOME_DIR;
}
async function resolveProjectHash(cwd) {
    const repoRoot = node_path_1.default.resolve(cwd);
    const gitConfig = node_path_1.default.join(repoRoot, '.git', 'config');
    try {
        const raw = await node_fs_1.promises.readFile(gitConfig, 'utf-8');
        const remoteMatch = raw.match(/url\\s*=\\s*(.+)/);
        if (remoteMatch?.[1]) {
            return stableHash(remoteMatch[1].trim());
        }
    }
    catch {
        /* ignore */
    }
    return stableHash(repoRoot);
}
async function loadSavedWorkspace() {
    try {
        const raw = await node_fs_1.promises.readFile(WORKSPACE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed?.path && parsed?.projectHash) {
            return parsed;
        }
        return undefined;
    }
    catch {
        return undefined;
    }
}
async function saveWorkspaceSelection(ws) {
    const home = await getOrbisHome();
    await node_fs_1.promises.mkdir(node_path_1.default.dirname(WORKSPACE_FILE), { recursive: true });
    await node_fs_1.promises.writeFile(WORKSPACE_FILE, JSON.stringify(ws, null, 2), 'utf-8');
    // Ensure runs folder exists for the saved workspace hash in the global home
    await node_fs_1.promises.mkdir(node_path_1.default.join(home, 'runs', ws.projectHash), { recursive: true });
}
async function resolveWorkspace(options = {}) {
    const cwd = node_path_1.default.resolve(options.cwd ?? process.cwd());
    const home = await getOrbisHome();
    // 1) CLI flag
    if (options.cliWorkspace) {
        const candidate = node_path_1.default.resolve(options.cliWorkspace);
        return {
            path: candidate,
            projectHash: await resolveProjectHash(candidate),
            source: 'cli',
            reason: '--workspace flag'
        };
    }
    // 2) saved workspace
    const saved = await loadSavedWorkspace();
    if (saved) {
        return {
            path: node_path_1.default.resolve(saved.path),
            projectHash: saved.projectHash,
            source: 'saved',
            reason: 'saved workspace'
        };
    }
    // 3) global Orbis home project-hash folder
    const autoHash = await resolveProjectHash(cwd);
    const autoPath = node_path_1.default.join(home, 'runs', autoHash);
    await node_fs_1.promises.mkdir(autoPath, { recursive: true });
    return {
        path: autoPath,
        projectHash: autoHash,
        source: 'auto',
        reason: 'orbis home project folder'
    };
}
function stableHash(input) {
    return (0, node_crypto_1.createHash)('sha256').update(input).digest('hex').slice(0, 16);
}
//# sourceMappingURL=workspace.js.map