"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAction = void 0;
const AppError_1 = require("../../shared/errors/AppError");
class CreateAction {
    actions;
    publisher;
    constructor(actions, publisher) {
        this.actions = actions;
        this.publisher = publisher;
    }
    async execute(cmd) {
        const type = cmd.type.trim();
        if (!type) {
            throw new AppError_1.AppError("VALIDATION_ERROR", "type is required", 400);
        }
        const action = {
            id: crypto.randomUUID(),
            type,
            payload: cmd.payload ?? {},
            createdAt: new Date(),
        };
        await this.actions.create(action);
        await this.publisher.publishActionCreated(action);
        return action;
    }
}
exports.CreateAction = CreateAction;
