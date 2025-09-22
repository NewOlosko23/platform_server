// routes/portfolioRoutes.js
import express from "express";
import { getPortfolio, getPortfolioSummary, getPortfolioHistory } from "../controllers/portfolioController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authenticate, getPortfolio);
router.get("/summary", authenticate, getPortfolioSummary);
router.get("/history", authenticate, getPortfolioHistory);

export default router;
