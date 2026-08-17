/**
 * A dead or misconfigured Supabase project surfaces as a bare "Failed to fetch"
 * TypeError, which tells the user nothing. Translate those into something
 * actionable and pass every other error through unchanged.
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return error.message.toLowerCase().includes('fetch');
  }

  // supabase-js wraps transport failures in its own error classes
  return error instanceof Error && error.name === 'AuthRetryableFetchError';
}

export function getErrorMessage(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Cannot reach Supabase. Check that VITE_SUPABASE_URL in .env points at a project that still exists.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Please try again.';
}
