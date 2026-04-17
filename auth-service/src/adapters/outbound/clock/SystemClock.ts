import { Clock } from "../../../application/ports/Clock";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }

  addMs(date: Date, ms: number): Date {
    return new Date(date.getTime() + ms);
  }
}
