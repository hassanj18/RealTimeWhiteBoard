import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { asyncHandler } from "../middleware/asyncHandler";

export function buildAuthRoutes(controller: AuthController) {
  const router = Router();

  router.post("/signup", asyncHandler(controller.signup));
  router.post("/login", asyncHandler(controller.loginHandler));
  router.post("/logout", asyncHandler(controller.logoutHandler));
  router.get("/verify", asyncHandler(controller.verifyHandler));
  router.post("/refresh", asyncHandler(controller.refreshHandler));

  return router;
}
