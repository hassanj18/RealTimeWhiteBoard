"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaProducerAdapter = void 0;
const kafkajs_1 = require("kafkajs");
class KafkaProducerAdapter {
    brokers;
    clientId;
    producer;
    connected = false;
    connectionPromise = null;
    constructor(brokers, clientId) {
        this.brokers = brokers;
        this.clientId = clientId;
        const kafka = new kafkajs_1.Kafka({ brokers, clientId });
        this.producer = kafka.producer();
    }
    async ensureConnected() {
        if (this.connected)
            return;
        if (!this.connectionPromise) {
            this.connectionPromise = this.doConnect();
        }
        try {
            await this.connectionPromise;
        }
        catch (error) {
            this.connectionPromise = null;
            throw error;
        }
    }
    async doConnect() {
        try {
            await this.producer.connect();
            this.connected = true;
            console.log("Kafka producer connected");
        }
        catch (error) {
            console.warn("Failed to connect to Kafka:", error);
            throw error;
        }
    }
    async disconnect() {
        if (!this.connected)
            return;
        await this.producer.disconnect();
        this.connected = false;
        this.connectionPromise = null;
    }
    async publish(topic, event) {
        try {
            await this.ensureConnected();
            const serialized = JSON.stringify(event);
            await this.producer.send({
                topic,
                messages: [{ value: serialized }],
            });
        }
        catch (error) {
            console.warn("Failed to publish to Kafka, message lost:", error);
            // Don't throw - just log the error so the service continues
        }
    }
}
exports.KafkaProducerAdapter = KafkaProducerAdapter;
