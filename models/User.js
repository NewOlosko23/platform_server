import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },

  // Roles: user (default), admin
  role: { type: String, enum: ["user", "admin"], default: "user" },

  // Finance
  balance: { type: Number, default: 100000 },

  // Localization
  region: { type: String, default: "US" },
  currency: { type: String, default: "USD" },

  // Admin management
  isBanned: { type: Boolean, default: false },
  bannedAt: { type: Date, default: null },
  banReason: { type: String, default: null },

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("User", UserSchema);
