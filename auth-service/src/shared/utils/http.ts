export function ok<T>(data: T) {
  return { success: true as const, data };
}

export function fail(code: string, message: string) {
  return { success: false as const, error: { code, message } };
}
