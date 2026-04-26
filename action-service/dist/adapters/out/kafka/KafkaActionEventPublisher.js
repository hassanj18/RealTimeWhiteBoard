"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaActionEventPublisher = void 0;
const kafkajs_1 = require("kafkajs");
class KafkaActionEventPublisher {
    clientId;
    topic;
    producer;
    constructor(brokers, clientId, topic) {
        this.clientId = clientId;
        this.topic = topic;
        const kafka = new kafkajs_1.Kafka({ brokers, clientId });
        this.producer = kafka.producer();
    }
    async connect() {
        await this.producer.connect();
    }
    async disconnect() {
        await this.producer.disconnect();
    }
    async publishActionCreated(action) {
        await this.producer.send({
            topic: this.topic,
            messages: [
                {
                    key: action.id,
                    value: JSON.stringify({
                        event: "ActionCreated",
                        data: {
                            id: action.id,
                            type: action.type,
                            payload: action.payload,
                            createdAt: action.createdAt.toISOString(),
                        },
                    }),
                },
            ],
        });
    }
}
exports.KafkaActionEventPublisher = KafkaActionEventPublisher;
