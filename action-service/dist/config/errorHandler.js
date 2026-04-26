"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const AppError_1 = require("../shared/errors/AppError");
const http_1 = require("../shared/utils/http");
function errorHandler(err, _req, res, _next) {
    if (err instanceof AppError_1.AppError) {
        return res.status(err.status).json((0, http_1.fail)(err.code, err.message));
    }
    console.error(err);
    return res.status(500).json((0, http_1.fail)("INTERNAL_ERROR", "Unexpected error"));
}
