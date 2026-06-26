"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOARD_INFO_TOPIC = exports.BOARD_ACTIONS_TOPIC = void 0;
exports.topicForEventType = topicForEventType;
const env_1 = require("../config/env");
exports.BOARD_ACTIONS_TOPIC = env_1.env.KAFKA_BOARD_ACTIONS_TOPIC;
exports.BOARD_INFO_TOPIC = env_1.env.KAFKA_BOARD_INFO_TOPIC;
function topicForEventType(eventType) {
    if (eventType === "BOARD_EVENT") {
        return exports.BOARD_ACTIONS_TOPIC;
    }
    return exports.BOARD_INFO_TOPIC;
}
