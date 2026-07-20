import { Router } from "express";
import {
  getProfile,
  updateProfile,
  getrestaurants,
  getFoodItemsByRestaurant,
} from "../controllers/user.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/profile", authMiddleware, getProfile);

router.put("/profile", authMiddleware, updateProfile);

router.get("/restaurants", getrestaurants);

router.get("/restaurants/:restaurantId/fooditems", getFoodItemsByRestaurant);

export default router;
