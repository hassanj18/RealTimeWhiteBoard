"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoopKafkaProducer = void 0;
class NoopKafkaProducer {
    async publish(topic, event) {
        // Do nothing - for testing/development when Kafka is not available
        console.log(`NoopKafkaProducer: Would publish to topic "${topic}":`, event);
    }
}
exports.NoopKafkaProducer = NoopKafkaProducer;
