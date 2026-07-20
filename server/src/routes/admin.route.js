import express from "express";
import {
  adminLogin,
  adminRegister,
  adminLogout,
  getUserById,
  getUsers,
  getRestaurants,
} from "../controllers/admin.controllers.js";
import authMiddleware from "../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/register", adminRegister);

router.post("/login", adminLogin);

router.post("/logout", adminLogout);

router.get("/users", authMiddleware, getUsers);

router.get("/restaurants", authMiddleware, getRestaurants);

router.get("/users/:id", authMiddleware, getUserById);

export default router;
