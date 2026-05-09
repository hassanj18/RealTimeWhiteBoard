const { Kafka } = require('kafkajs');

class KafkaProducer {
    constructor(brokers, clientId) {
        this.kafka = new Kafka({
            brokers: brokers.split(','),
            clientId: clientId,
        });
        this.producer = this.kafka.producer();
        this.connected = false;
        this.connectionPromise = null;
    }

    async ensureConnected() {
        if (this.connected) return;

        if (!this.connectionPromise) {
            this.connectionPromise = this.doConnect();
        }

        try {
            await this.connectionPromise;
        } catch (error) {
            this.connectionPromise = null;
            throw error;
        }
    }

    async doConnect() {
        try {
            await this.producer.connect();
            this.connected = true;
            console.log('[KafkaProducer] Connected to Kafka');
        } catch (error) {
            console.warn('[KafkaProducer] Failed to connect to Kafka:', error);
            throw error;
        }
    }

    async disconnect() {
        if (!this.connected) return;
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
            console.log(`[KafkaProducer] Published event to ${topic}:`, event);
        } catch (error) {
            console.warn('[KafkaProducer] Failed to publish to Kafka, message lost:', error);
            // Don't throw - just log the error so the service continues
        }
    }
}

module.exports = KafkaProducer;