import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from '../logger'

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('default WARN level: suppresses debug and info, passes warn and error', () => {
    vi.stubEnv('VITE_LOG_LEVEL', 'WARN')
    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    logger.error('e')

    expect(console.debug).not.toHaveBeenCalled()
    expect(console.info).not.toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalledWith('[RAGO]', 'w')
    expect(console.error).toHaveBeenCalledWith('[RAGO]', 'e')
  })

  it('DEBUG level: passes all methods', () => {
    vi.stubEnv('VITE_LOG_LEVEL', 'DEBUG')
    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    logger.error('e')

    expect(console.debug).toHaveBeenCalledWith('[RAGO]', 'd')
    expect(console.info).toHaveBeenCalledWith('[RAGO]', 'i')
    expect(console.warn).toHaveBeenCalledWith('[RAGO]', 'w')
    expect(console.error).toHaveBeenCalledWith('[RAGO]', 'e')
  })

  it('INFO level: suppresses debug, passes info and above', () => {
    vi.stubEnv('VITE_LOG_LEVEL', 'INFO')
    logger.debug('d')
    logger.info('i')
    logger.warn('w')

    expect(console.debug).not.toHaveBeenCalled()
    expect(console.info).toHaveBeenCalledWith('[RAGO]', 'i')
    expect(console.warn).toHaveBeenCalledWith('[RAGO]', 'w')
  })

  it('ERROR level: only passes error', () => {
    vi.stubEnv('VITE_LOG_LEVEL', 'ERROR')
    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    logger.error('e')

    expect(console.debug).not.toHaveBeenCalled()
    expect(console.info).not.toHaveBeenCalled()
    expect(console.warn).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith('[RAGO]', 'e')
  })

  it('SILENT level: suppresses everything', () => {
    vi.stubEnv('VITE_LOG_LEVEL', 'SILENT')
    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    logger.error('e')

    expect(console.debug).not.toHaveBeenCalled()
    expect(console.info).not.toHaveBeenCalled()
    expect(console.warn).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })

  it('unknown level falls back to WARN', () => {
    vi.stubEnv('VITE_LOG_LEVEL', 'VERBOSE')
    logger.debug('d')
    logger.info('i')
    logger.warn('w')

    expect(console.debug).not.toHaveBeenCalled()
    expect(console.info).not.toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalledWith('[RAGO]', 'w')
  })

  it('level matching is case-insensitive', () => {
    vi.stubEnv('VITE_LOG_LEVEL', 'debug')
    logger.debug('d')
    expect(console.debug).toHaveBeenCalledWith('[RAGO]', 'd')
  })

  it('passes multiple arguments', () => {
    vi.stubEnv('VITE_LOG_LEVEL', 'DEBUG')
    logger.warn('msg', { key: 'value' }, 42)
    expect(console.warn).toHaveBeenCalledWith('[RAGO]', 'msg', { key: 'value' }, 42)
  })
})
