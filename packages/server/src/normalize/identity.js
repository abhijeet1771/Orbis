/**
 * Identity & Traceability Layer - Enterprise test case management
 *
 * NEVER hardcodes Jira IDs, NEVER assumes ownership of naming.
 * Supports multiple systems: jira, xray, zephyr, testrail, custom
 */
// ID extraction regex - ONLY ONE ALLOWED
// Matches: WEBAPP-123, BOX-9, SHIELD_CORE-882
const ID_REGEX = /\b([A-Z][A-Z0-9_]{1,15})-(\d+)\b/g;
/**
 * Normalize identities for a test case result
 * Ensures identities array is valid, derives missing fields, drops malformed IDs
 * NEVER throws, logs once per run if fixes applied, idempotent
 */
export function normalizeIdentities(test, log) {
    if (!test.identities || test.identities.length === 0) {
        // No identities to normalize
        return test;
    }
    const normalizedIdentities = [];
    let hasFixes = false;
    for (const identity of test.identities) {
        try {
            const normalized = normalizeSingleIdentity(identity);
            if (normalized) {
                normalizedIdentities.push(normalized);
            }
            else {
                hasFixes = true; // Dropped malformed identity
            }
        }
        catch {
            hasFixes = true; // Skip malformed identity
        }
    }
    if (hasFixes && log) {
        log.fixed = true;
    }
    return {
        ...test,
        identities: normalizedIdentities.length > 0 ? normalizedIdentities : undefined
    };
}
/**
 * Normalize a single external identity
 * Derives projectKey and numericId, validates structure
 */
function normalizeSingleIdentity(identity) {
    // Validate required fields
    if (!identity.id || !identity.system || !identity.source) {
        return null;
    }
    // Extract project key and numeric ID from canonical ID
    const match = identity.id.match(ID_REGEX);
    if (!match) {
        return null; // Invalid ID format
    }
    const [, projectKey, numericIdStr] = match[0].split(/[-]/);
    const numericId = parseInt(numericIdStr, 10);
    if (!projectKey || isNaN(numericId)) {
        return null;
    }
    return {
        ...identity,
        projectKey: projectKey.toUpperCase(),
        numericId
    };
}
/**
 * Extract identities from test case data
 * Called by reporter to populate raw identities before normalization
 */
export function extractIdentities(test) {
    const identities = [];
    // Extract from annotations
    if (test.annotations) {
        identities.push(...extractFromAnnotations(test.annotations));
    }
    // Extract from tags
    identities.push(...extractFromTags(test.tags));
    // Extract from title
    identities.push(...extractFromTitle(test.title));
    // Remove duplicates by ID
    const uniqueIdentities = identities.filter((identity, index, arr) => arr.findIndex(i => i.id === identity.id) === index);
    return uniqueIdentities;
}
/**
 * Extract identities from annotations
 * Priority 1: @jira WEBAPP-12345
 * Priority 2: { type: 'jira', description: 'WEBAPP-12345' }
 */
function extractFromAnnotations(annotations) {
    const identities = [];
    for (const [key, value] of Object.entries(annotations)) {
        // Priority 1: Direct system annotations like @jira WEBAPP-12345
        if (typeof value === 'string' && isValidSystem(key)) {
            const ids = extractIdsFromText(value);
            for (const id of ids) {
                identities.push({
                    system: key,
                    id,
                    source: 'annotation'
                });
            }
        }
        // Priority 2: Structured annotations like { type: 'jira', description: 'WEBAPP-12345' }
        if (key === 'type' && typeof value === 'string' && isValidSystem(value)) {
            // Look for description in the same annotation object
            const description = annotations.description;
            if (typeof description === 'string') {
                const ids = extractIdsFromText(description);
                for (const id of ids) {
                    identities.push({
                        system: value,
                        id,
                        source: 'annotation'
                    });
                }
            }
        }
    }
    return identities;
}
/**
 * Extract identities from tags
 * Pattern: @jira:WEBAPP-12345, @xray:BOX-77
 */
function extractFromTags(tags) {
    const identities = [];
    for (const tag of tags) {
        // Check for system prefix pattern
        const systemPrefixMatch = tag.match(/^@?(jira|xray|zephyr|testrail):(.+)$/i);
        if (systemPrefixMatch) {
            const [, system, value] = systemPrefixMatch;
            const ids = extractIdsFromText(value);
            for (const id of ids) {
                identities.push({
                    system: system.toLowerCase(),
                    id,
                    source: 'tag'
                });
            }
        }
    }
    return identities;
}
/**
 * Extract identities from title
 * Fallback: no system inference, defaults to 'custom'
 */
function extractFromTitle(title) {
    const identities = [];
    const ids = extractIdsFromText(title);
    for (const id of ids) {
        identities.push({
            system: 'custom',
            id,
            source: 'title'
        });
    }
    return identities;
}
/**
 * Extract all valid IDs from text using regex
 * Returns array of canonical IDs like ['WEBAPP-123', 'BOX-9']
 */
function extractIdsFromText(text) {
    const ids = [];
    let match;
    // Reset regex lastIndex
    ID_REGEX.lastIndex = 0;
    while ((match = ID_REGEX.exec(text)) !== null) {
        const [, projectKey, number] = match;
        const canonicalId = `${projectKey.toUpperCase()}-${number}`;
        ids.push(canonicalId);
    }
    return ids;
}
/**
 * Check if a string is a valid system identifier
 */
function isValidSystem(system) {
    return ['jira', 'xray', 'zephyr', 'testrail', 'custom'].includes(system.toLowerCase());
}
//# sourceMappingURL=identity.js.map