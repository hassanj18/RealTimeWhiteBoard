import { Request, Response } from "express";
import { z } from "zod";
import { CreateAction } from "../../../core/usecases/CreateAction";
import { ListActions } from "../../../core/usecases/ListActions";
import { ok } from "../../../shared/utils/http";

const CreateActionSchema = z.object({
  type: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
});

export class ActionController {
  constructor(
    private readonly createAction: CreateAction,
    private readonly listActions: ListActions
  ) {}

  create = async (req: Request, res: Response) => {
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

    return res.status(201).json(ok({ action }));
  };

  list = async (req: Request, res: Response) => {
    const limit = Number(req.query.limit);
    const actions = await this.listActions.execute(limit);
    return res.status(200).json(ok({ actions }));
  };
}
