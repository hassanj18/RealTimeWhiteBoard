"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoopActionEventPublisherAdapter = void 0;
class NoopActionEventPublisherAdapter {
    async publishActionCreated(action) {
        // Do nothing - for testing/development when Kafka is not available
        console.log(`NoopActionEventPublisher: Would publish ActionCreated for action ${action.id}`);
    }
}
exports.NoopActionEventPublisherAdapter = NoopActionEventPublisherAdapter;
