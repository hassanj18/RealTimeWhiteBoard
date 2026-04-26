"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    code;
    status;
    constructor(code, message, status) {
        super(message);
        this.code = code;
        this.status = status;
    }
}
exports.AppError = AppError;
