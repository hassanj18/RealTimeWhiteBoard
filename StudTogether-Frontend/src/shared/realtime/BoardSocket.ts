export interface BoardSocket {
  emit(eventName: string, payload: unknown): void;
  on(eventName: string, handler: (...args: any[]) => void): void;
  off(eventName: string, handler?: (...args: any[]) => void): void;
  disconnect?: () => void;
  connected?: boolean;
}
