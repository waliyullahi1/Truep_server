import express from "express";
const router = express.Router()
import { updateAvater, getpropertybyUser, getAllAgents, getAgent, getAvatar, sendSMS,  getuser, updateProfile } from "../../controllers/profile.js";
import { protect} from "../../middleware/auth.js";
import uploadAvatar from "../../middleware/upload.js"


router.post("/upload-avatar", protect,  uploadAvatar.single("avatar"), updateAvater);
router.get("/avatar", protect, getAvatar);
router.post("/update", protect, updateProfile)
router.get("/me", protect, getuser)
router.get("/agents", getAllAgents)
router.get("/property", protect, getpropertybyUser)
router.post("/sendsms", protect, sendSMS)


router.get("/agents/:id", getAgent)
export default router;


