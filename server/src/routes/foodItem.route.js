import { Router } from "express";
const router = Router();
import authMiddleware from "../middlewares/auth.middleware.js";
import {
  createFoodItem,
  getAllFoodItems,
  updateFoodInfo,
  getFoodItemsByCategory,
  deleteFoodItem,
  getPublicFoodItems,
  getRestaurantFoods,
} from "../controllers/foodItem.controllers.js";

router.post("/newFoodItem", authMiddleware, createFoodItem);

router.get("/AllFoodItems", authMiddleware, getAllFoodItems);

router.get("/public", getPublicFoodItems);

router.get("/category/:category", authMiddleware, getFoodItemsByCategory);

router.get("/my-food", authMiddleware, getRestaurantFoods);

router.patch("/:id", authMiddleware, updateFoodInfo);

router.delete("/:id", authMiddleware, deleteFoodItem);

export default router;
