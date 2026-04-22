/**
 * Module-aware logger and error formatter.
 * Usage: const log = createLogger('Attendance')
 */
export function createLogger(module: string) {
    return {
        info: (msg: string, data?: any) => console.log(`[${module}] ${msg}`, data ?? ''),
        warn: (msg: string, data?: any) => console.warn(`[${module}] ${msg}`, data ?? ''),
        error: (msg: string, err?: any) => console.error(`[${module}] ${msg}`, err ?? ''),
    }
}

/** Translate Supabase/Postgres error codes into user-friendly messages */
export function friendlyError(error: any): string {
    if (!error) return 'An unexpected error occurred'
    const code = error.code || ''
    if (code === '23505') return 'This record already exists (duplicate)'
    if (code === '23503') return 'A related record was not found'
    if (code === '23514') return 'Data validation failed'
    if (code === '42501') return 'Permission denied'
    if (code === 'PGRST116') return 'Record not found'
    if (error.message?.includes('JWT')) return 'Session expired — please sign in again'
    if (error.message?.includes('fetch')) return 'Network error — check your connection'
    return error.message || 'Something went wrong'
}
