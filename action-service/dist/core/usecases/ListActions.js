"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListActions = void 0;
class ListActions {
    actions;
    constructor(actions) {
        this.actions = actions;
    }
    async execute(limit) {
        const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;
        return this.actions.list(safeLimit);
    }
}
exports.ListActions = ListActions;
