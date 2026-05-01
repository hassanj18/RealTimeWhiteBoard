"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaConsumerAdapter = void 0;
const kafkajs_1 = require("kafkajs");
class KafkaConsumerAdapter {
    brokers;
    groupId;
    clientId;
    consumer;
    connected = false;
    messageHandler = null;
    constructor(brokers, groupId, clientId) {
        this.brokers = brokers;
        this.groupId = groupId;
        this.clientId = clientId;
        const kafka = new kafkajs_1.Kafka({ brokers, clientId });
        this.consumer = kafka.consumer({ groupId });
    }
    async connect() {
        if (this.connected)
            return;
        try {
            await this.consumer.connect();
            this.connected = true;
            console.log("[KafkaConsumer] Connected to Kafka");
        }
        catch (error) {
            console.error("[KafkaConsumer] Failed to connect:", error);
            throw error;
        }
    }
    async subscribe(topic) {
        if (!this.connected) {
            throw new Error("Consumer must be connected before subscribing");
        }
        try {
            await this.consumer.subscribe({ topic, fromBeginning: false });
            console.log(`[KafkaConsumer] Subscribed to topic: ${topic}`);
        }
        catch (error) {
            console.error(`[KafkaConsumer] Failed to subscribe to ${topic}:`, error);
            throw error;
        }
    }
    async start() {
        if (!this.connected) {
            throw new Error("Consumer must be connected and subscribed before starting");
        }
        try {
            // Start consuming messages
            await this.consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    if (!message.value || !this.messageHandler)
                        return;
                    try {
                        const parsed = JSON.parse(message.value.toString());
                        console.log(`[KafkaConsumer] Received event from ${topic}:`, parsed);
                        await this.messageHandler(parsed);
                    }
                    catch (error) {
                        console.error(`[KafkaConsumer] Failed to process message:`, error);
                    }
                },
            });
            console.log("[KafkaConsumer] Started consuming messages");
        }
        catch (error) {
            console.error("[KafkaConsumer] Failed to start consuming:", error);
            throw error;
        }
    }
    onMessage(handler) {
        this.messageHandler = handler;
    }
    async disconnect() {
        if (!this.connected)
            return;
        try {
            await this.consumer.disconnect();
            this.connected = false;
            console.log("[KafkaConsumer] Disconnected from Kafka");
        }
        catch (error) {
            console.error("[KafkaConsumer] Failed to disconnect:", error);
        }
    }
}
exports.KafkaConsumerAdapter = KafkaConsumerAdapter;
