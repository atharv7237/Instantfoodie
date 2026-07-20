import { Router } from "express";
import {
  userLogin,
  userLogout,
  userRegister,
  restaurantLogin,
} from "../controllers/auth.controllers.js";

const router = Router();

router.post("/register", userRegister);

router.post("/login", userLogin);

router.post("/logout", userLogout);

router.post("/restaurant/login", restaurantLogin);

router.post("/restaurant/logout", userLogout);

export default router;
