import express from "express";
const router = express.Router()
import {  verifyBankAccount, createPayout,  getBanks } from "../../controllers/payout.js";
import { saveAccount, updateBankAccountStatus,  getAllBankAccounts, getBankAndKycForVerify,  getBankAccount } from "../../controllers/bankdetails.js";
import { protect} from "../../middleware/auth.js";
import uploadAvatar from "../../middleware/upload.js"
 




router.get("/banks",  getBanks);
router.post("/create", createPayout);
router.post("/save-bank-account", protect, saveAccount);
router.get("/bank-details", protect, getBankAccount);
router.post("/banks/verify", verifyBankAccount);



//admiin SIde

router.get("/get-accounts", getAllBankAccounts)
router.get("/bank-account/:userId", getBankAndKycForVerify)
router.patch("/bank-account/:id/status", updateBankAccountStatus);
export default router;