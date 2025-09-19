// controllers/portfolioController.js
import Portfolio from "../models/Portfolio.js";
import User from "../models/User.js";

export const getPortfolio = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const holdings = await Portfolio.find({ userId: user._id });
    res.json({ balance: user.balance, holdings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
