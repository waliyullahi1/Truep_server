import express from "express";
const router = express.Router()
import {  getTransactions } from "../../controllers/transaction.js";
import { protect} from "../../middleware/auth.js";
import uploadAvatar from "../../middleware/upload.js"
// router.post("/upload-avatar", protect,  uploadAvatar.single("avatar"), updateproperty);


router.get("/", protect, getTransactions);

export default router;