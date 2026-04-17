import { Router } from "express";
import { addCreature, getCreatures, deleteCreature } from "../controllers/CreatureController";
import { authMiddleware } from "../middleware/authMiddleware";
import { TokenService } from "../../../../application/ports/TokenService";
import { asyncHandler } from "../middleware/asyncHandler";

export function buildCreatureRoutes(tokenService: TokenService) {
  const router = Router();

  router.use(authMiddleware(tokenService));

  router.post("/add", asyncHandler(addCreature));
  router.get("/list", asyncHandler(getCreatures));
  router.delete("/:id", asyncHandler(deleteCreature));
  return router;
}
