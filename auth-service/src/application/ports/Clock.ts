export interface Clock {
  now(): Date;
  addMs(date: Date, ms: number): Date;
}
