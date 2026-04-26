"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authMiddleware(accessSecret) {
    return (req, res, next) => {
        try {
            let token = null;
            if (req.headers.authorization) {
                token = req.headers.authorization.split(" ")[1] ?? null;
            }
            if (!token && req.cookies && req.cookies.accessToken) {
                token = req.cookies.accessToken;
            }
            if (!token) {
                return res.status(401).json({ message: "No token provided" });
            }
            const decoded = jsonwebtoken_1.default.verify(token, accessSecret);
            if (decoded.type !== "access") {
                return res.status(401).json({ message: "Invalid token type" });
            }
            const userInfo = {
                userId: decoded.sub,
                email: decoded.email,
                name: decoded.name,
            };
            req.user = userInfo;
            next();
        }
        catch (err) {
            return res.status(401).json({
                message: "Invalid or expired token",
                error: err?.message,
            });
        }
    };
}
