import express from "express";
const router = express.Router()
import {  verifyBankAccount, getBanks } from "../../controllers/payout.js";
import { protect} from "../../middleware/auth.js";
import uploadAvatar from "../../middleware/upload.js"


router.get("/banks",  getBanks);
router.post("/banks/verify", verifyBankAccount);

export default router;