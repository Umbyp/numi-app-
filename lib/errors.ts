/** Supabase/PostgREST rejections are plain objects with a `.message`, not `instanceof Error` — String(e) on those gives "[object Object]". */
export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return String(e);
}
