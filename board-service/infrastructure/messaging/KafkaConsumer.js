const { Kafka } = require('kafkajs');

class KafkaConsumer {
    constructor(brokers, clientId, groupId) {
        this.kafka = new Kafka({
            brokers: brokers.split(','),
            clientId: clientId,
        });
        this.consumer = this.kafka.consumer({ groupId: groupId });
        this.handlers = new Map();
    }

    async connect() {
        try {
            await this.consumer.connect();
            console.log('[KafkaConsumer] Connected to Kafka');
        } catch (error) {
            console.error('[KafkaConsumer] Failed to connect:', error);
            // Don't throw - allow service to start even if Kafka is unavailable
        }
    }

    async disconnect() {
        try {
            await this.consumer.disconnect();
            console.log('[KafkaConsumer] Disconnected from Kafka');
        } catch (error) {
            console.error('[KafkaConsumer] Error disconnecting:', error);
        }
    }

    async subscribe(topics) {
        try {
            for (const topic of topics) {
                await this.consumer.subscribe({ topic, fromBeginning: false });
                console.log(`[KafkaConsumer] Subscribed to topic: ${topic}`);
            }
        } catch (error) {
            console.error('[KafkaConsumer] Failed to subscribe:', error);
        }
    }

    registerHandler(eventType, handler) {
        this.handlers.set(eventType, handler);
        console.log(`[KafkaConsumer] Registered handler for event type: ${eventType}`);
    }

    async startConsuming() {
        try {
            await this.consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const event = JSON.parse(message.value.toString());
                        console.log(`[KafkaConsumer] Received event from ${topic}:`, event);

                        const handler = this.handlers.get(event.type);
                        if (handler) {
                            await handler(event.payload);
                            console.log(`[KafkaConsumer] Event ${event.type} processed successfully`);
                        } else {
                            console.warn(`[KafkaConsumer] No handler registered for event type: ${event.type}`);
                        }
                    } catch (error) {
                        console.error('[KafkaConsumer] Error processing message:', error);
                    }
                },
            });
            console.log('[KafkaConsumer] Started consuming messages');
        } catch (error) {
            console.error('[KafkaConsumer] Failed to start consuming:', error);
        }
    }
}

module.exports = KafkaConsumer;
