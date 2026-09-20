import { Router } from "express";

import {
  generateKit,
  getKit,
  getKits,
   updateKit,
} from "../controllers/kitController";

import {
  regenerateKitSection,
} from "../controllers/kitController";

import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.use(requireAuth);

router.post("/generate", generateKit);
router.get("/", getKits);
router.get("/:id", getKit);
router.patch("/:id", updateKit);
router.post(
  "/:id/regenerate",
  regenerateKitSection
);

export default router;