import express from "express";
import {
  addFavourite,
  getFavourites,
  removeFavourite,
  removeAllFavourites,
} from "../controllers/favourite.controllers.js";
import isAuthenticated from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/:foodItemId", isAuthenticated, addFavourite);

router.get("/", isAuthenticated, getFavourites);

router.delete("/:foodItemId", isAuthenticated, removeFavourite);

router.delete("/", isAuthenticated, removeAllFavourites);

export default router;
