// controllers/adminController.js
import User from "../models/User.js";
import Trade from "../models/Trade.js";

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUserTrades = async (req, res) => {
  try {
    const { userId } = req.params;
    const trades = await Trade.find({ userId });
    res.json(trades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const banUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndDelete(userId);
    res.json({ message: "User banned successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
