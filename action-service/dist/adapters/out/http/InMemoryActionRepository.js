"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryActionRepository = void 0;
class InMemoryActionRepository {
    items = [];
    async create(action) {
        this.items.unshift(action);
    }
    async list(limit) {
        return this.items.slice(0, limit);
    }
}
exports.InMemoryActionRepository = InMemoryActionRepository;
