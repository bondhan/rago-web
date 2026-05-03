const LEVELS: Record<string, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4,
}

// Read at call time so vi.stubEnv works in tests without module reloading.
function threshold(): number {
  const raw = (import.meta.env.VITE_LOG_LEVEL ?? 'WARN').toUpperCase()
  return LEVELS[raw] ?? LEVELS.WARN
}

export const logger = {
  debug: (...args: unknown[]) => { if (threshold() <= LEVELS.DEBUG) console.debug('[RAGO]', ...args) },
  info:  (...args: unknown[]) => { if (threshold() <= LEVELS.INFO)  console.info('[RAGO]',  ...args) },
  warn:  (...args: unknown[]) => { if (threshold() <= LEVELS.WARN)  console.warn('[RAGO]',  ...args) },
  error: (...args: unknown[]) => { if (threshold() <= LEVELS.ERROR) console.error('[RAGO]', ...args) },
}
