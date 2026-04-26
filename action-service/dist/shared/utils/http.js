"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = ok;
exports.fail = fail;
function ok(data) {
    return { status: "success", data };
}
function fail(code, message) {
    return { status: "error", error: { code, message } };
}
