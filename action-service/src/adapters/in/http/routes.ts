import { Router } from "express";
import { ActionController } from "./ActionController";

export function buildActionRoutes(controller: ActionController) {
  const router = Router();

  router.post("/", controller.create);
  router.get("/", controller.list);

  return router;
}
