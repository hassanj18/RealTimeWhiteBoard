import { env } from "../config/env";

export const BOARD_ACTIONS_TOPIC = env.KAFKA_BOARD_ACTIONS_TOPIC;
export const BOARD_INFO_TOPIC = env.KAFKA_BOARD_INFO_TOPIC;

export function topicForEventType(eventType: string): string {
  if (eventType === "BOARD_EVENT") {
    return BOARD_ACTIONS_TOPIC;
  }
  return BOARD_INFO_TOPIC;
}
