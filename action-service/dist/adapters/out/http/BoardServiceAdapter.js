"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoardServiceAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
class BoardServiceAdapter {
    boardServiceBaseUrl;
    constructor(boardServiceBaseUrl) {
        this.boardServiceBaseUrl = boardServiceBaseUrl;
    }
    async checkAccess(userId, boardId, accessToken) {
        console.log(`[BoardServiceAdapter] Checking access for user ${userId} to board ${boardId}`);
        try {
            const url = `${this.boardServiceBaseUrl}/board/${boardId}/access`;
            console.log(`[BoardServiceAdapter] Making GET request to: ${url}?userId=${userId}`);
            const headers = {};
            if (accessToken) {
                headers['Authorization'] = `Bearer ${accessToken}`;
                console.log(`[BoardServiceAdapter] Adding Authorization header with JWT token`);
            }
            const response = await axios_1.default.get(url, {
                params: { userId },
                headers,
                timeout: 5000,
            });
            console.log(`[BoardServiceAdapter] Response status: ${response.status}`);
            console.log(`[BoardServiceAdapter] Response data:`, response.data);
            // Check if user has 'view' or 'edit' access
            const accessArray = response.data?.access || [];
            console.log(`[BoardServiceAdapter] Raw access array:`, accessArray);
            console.log(`[BoardServiceAdapter] Access array type: ${typeof accessArray}`);
            console.log(`[BoardServiceAdapter] Access array length: ${accessArray.length}`);
            // Debug each element
            accessArray.forEach((item, index) => {
                console.log(`[BoardServiceAdapter] Access[${index}]: "${item}" (length: ${item.length})`);
                console.log(`[BoardServiceAdapter] Access[${index}] trimmed: "${item.trim()}"`);
            });
            const hasView = accessArray.some((item) => item.trim() === 'view');
            const hasEdit = accessArray.some((item) => item.trim() === 'edit');
            const hasAccess = hasView || hasEdit;
            const userName = response.data?.userName;
            console.log(`[BoardServiceAdapter] Has view: ${hasView}, Has edit: ${hasEdit}`);
            console.log(`[BoardServiceAdapter] Access granted: ${hasAccess}`);
            console.log(`[BoardServiceAdapter] User name: ${userName}`);
            return { hasAccess, userName };
        }
        catch (err) {
            console.log(`[BoardServiceAdapter] Request failed:`, {
                status: err.response?.status,
                statusText: err.response?.statusText,
                message: err.message
            });
            if (err.response?.status === 404 || err.response?.status === 403) {
                console.log(`[BoardServiceAdapter] Access denied (HTTP ${err.response?.status})`);
                return { hasAccess: false };
            }
            console.error("BoardServiceAdapter.checkAccess error:", err);
            throw err;
        }
    }
}
exports.BoardServiceAdapter = BoardServiceAdapter;
