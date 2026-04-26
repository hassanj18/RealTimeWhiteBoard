"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildActionRoutes = buildActionRoutes;
const express_1 = require("express");
function buildActionRoutes(controller) {
    const router = (0, express_1.Router)();
    router.post("/", controller.create);
    router.get("/", controller.list);
    return router;
}
