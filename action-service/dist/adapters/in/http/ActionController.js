"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionController = void 0;
const zod_1 = require("zod");
const http_1 = require("../../../shared/utils/http");
const CreateActionSchema = zod_1.z.object({
    type: zod_1.z.string().min(1),
    payload: zod_1.z.record(zod_1.z.unknown()).default({}),
});
class ActionController {
    createAction;
    listActions;
    constructor(createAction, listActions) {
        this.createAction = createAction;
        this.listActions = listActions;
    }
    create = async (req, res) => {
        const parsed = CreateActionSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                status: "error",
                error: { code: "VALIDATION_ERROR", message: "Invalid request" },
            });
        }
        const action = await this.createAction.execute({
            type: parsed.data.type,
            payload: parsed.data.payload,
        });
        return res.status(201).json((0, http_1.ok)({ action }));
    };
    list = async (req, res) => {
        const limit = Number(req.query.limit);
        const actions = await this.listActions.execute(limit);
        return res.status(200).json((0, http_1.ok)({ actions }));
    };
}
exports.ActionController = ActionController;
