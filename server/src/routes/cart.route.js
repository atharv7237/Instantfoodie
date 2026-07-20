import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../controllers/cart.controllers.js";

const router = express.Router();

router.post("/", authMiddleware, addToCart);

router.get("/", authMiddleware, getCart);

router.patch("/:cartId", authMiddleware, updateCartItem);

router.delete("/:cartId", authMiddleware, removeCartItem);

router.delete("/", authMiddleware, clearCart);

export default router;
