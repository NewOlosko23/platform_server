// routes/portfolioRoutes.js
import express from "express";
import { getPortfolio } from "../controllers/portfolioController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authenticate, getPortfolio);

export default router;
