"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoopActionEventPublisher = void 0;
class NoopActionEventPublisher {
    async publishActionCreated(_action) {
        return;
    }
}
exports.NoopActionEventPublisher = NoopActionEventPublisher;
