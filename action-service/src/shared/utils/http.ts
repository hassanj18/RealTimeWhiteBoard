export function ok<T>(data: T) {
  return { status: "success", data } as const;
}

export function fail(code: string, message: string) {
  return { status: "error", error: { code, message } } as const;
}
