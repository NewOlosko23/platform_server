// routes/adminRoutes.js
import express from "express";
import { getAllUsers, getUserTrades, banUser } from "../controllers/adminController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/users", authenticate, authorizeRoles("admin"), getAllUsers);
router.get("/users/:userId/trades", authenticate, authorizeRoles("admin"), getUserTrades);
router.delete("/users/:userId", authenticate, authorizeRoles("admin"), banUser);

export default router;
