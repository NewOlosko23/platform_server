// routes/portfolioRoutes.js
import express from "express";
import { getPortfolio, getPortfolioSummary } from "../controllers/portfolioController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authenticate, getPortfolio);
router.get("/summary", authenticate, getPortfolioSummary);

export default router;
