// lib/errors.ts — Friendly error messages for all Supabase DB errors

export function friendlyError(error: { message: string } | null | undefined): string {
  if (!error) return 'Something went wrong. Please try again.'
  const msg = error.message.toLowerCase()

  // RLS / permission errors
  if (msg.includes('row-level security') || msg.includes('permission denied'))
    return 'Permission denied. Make sure your admin account is set up in the Users table.'

  // Capacity / custom trigger errors
  if (msg.includes('full capacity') || msg.includes('max %'))
    return 'This batch is full (max 10 students).'

  // Marks validation trigger
  if (msg.includes('marks obtained') && msg.includes('cannot exceed'))
    return 'Marks entered exceed the maximum allowed for this question.'

  // Unique constraint (duplicate)
  if (msg.includes('duplicate key') || msg.includes('unique constraint') || msg.includes('already exists'))
    return 'This record already exists. Please check for duplicates.'

  // Foreign key (linked data)
  if (msg.includes('foreign key') || msg.includes('violates foreign'))
    return 'Cannot delete — this record is linked to other data.'

  // Not-null constraint
  if (msg.includes('null value') || msg.includes('not-null') || msg.includes('violates not-null'))
    return 'Please fill in all required fields before saving.'

  // Check constraint (e.g. grade between 1-12, capacity <= 10)
  if (msg.includes('check constraint') || msg.includes('violates check'))
    return 'One of the values entered is out of the allowed range.'

  // Auth errors
  if (msg.includes('invalid login') || msg.includes('invalid credentials'))
    return 'Incorrect email or password.'

  if (msg.includes('email not confirmed'))
    return 'Please verify your email before signing in.'

  if (msg.includes('jwt') || msg.includes('not authenticated') || msg.includes('anon'))
    return 'Your session has expired. Please sign in again.'

  // Network / timeout
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout'))
    return 'Network error. Please check your connection and try again.'

  // Fallback — still better than raw SQL
  return 'An error occurred. Please try again or contact support.'
}
