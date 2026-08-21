/**
 * Shared secret used by the office bridge (agent-sync) and bridge-health checks.
 * Accepts several env var names so local scripts and Vercel stay in sync.
 */
export function resolveBiometricSyncSecret() {
    return (
        process.env.BIOMETRIC_SYNC_SECRET
        || process.env.SYNC_SECRET
        || process.env.CRON_SECRET
        || 'sync-all-records-2026'
    );
}

export function verifyBiometricSyncSecret(provided) {
    const expected = resolveBiometricSyncSecret();
    return Boolean(provided && expected && provided === expected);
}
