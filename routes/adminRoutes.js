// routes/adminRoutes.js
import express from "express";
import { 
  getAllUsers, 
  getUserDetails,
  getUserTrades, 
  updateUser,
  banUser,
  getPlatformStats,
  getSystemHealth
} from "../controllers/adminController.js";
import { 
  getSystemSettings,
  updateSystemSettings,
  getActivityLogs,
  getUserActivitySummary
} from "../controllers/adminControllerAdditional.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Platform Statistics
router.get("/stats", authenticate, authorizeRoles("admin"), getPlatformStats);
router.get("/system-health", authenticate, authorizeRoles("admin"), getSystemHealth);

// System Settings
router.get("/settings", authenticate, authorizeRoles("admin"), getSystemSettings);
router.put("/settings", authenticate, authorizeRoles("admin"), updateSystemSettings);

// Activity Monitoring
router.get("/activity", authenticate, authorizeRoles("admin"), getActivityLogs);
router.get("/users/:userId/activity", authenticate, authorizeRoles("admin"), getUserActivitySummary);

// User Management
router.get("/users", authenticate, authorizeRoles("admin"), getAllUsers);
router.get("/users/:userId", authenticate, authorizeRoles("admin"), getUserDetails);
router.get("/users/:userId/trades", authenticate, authorizeRoles("admin"), getUserTrades);
router.put("/users/:userId", authenticate, authorizeRoles("admin"), updateUser);
router.patch("/users/:userId/ban", authenticate, authorizeRoles("admin"), banUser);

export default router;
