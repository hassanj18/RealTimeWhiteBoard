"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaActionEventPublisherAdapter = void 0;
class KafkaActionEventPublisherAdapter {
    kafkaProducer;
    constructor(kafkaProducer) {
        this.kafkaProducer = kafkaProducer;
    }
    async publishActionCreated(action) {
        await this.kafkaProducer.publish("actions", {
            type: "ActionCreated",
            payload: {
                id: action.id,
                type: action.type,
                payload: action.payload,
                createdAt: action.createdAt.toISOString(),
            },
        });
    }
}
exports.KafkaActionEventPublisherAdapter = KafkaActionEventPublisherAdapter;
