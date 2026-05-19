import express from "express"
import {adminDashboardStats, updatePropertyStatus,  getAdminProperties, getallusers} from "../../controllers/admin.js"
import { protect} from "../../middleware/auth.js";
const router = express.Router()


router.get("/dashboard", adminDashboardStats)
router.get("/users",  getallusers)
router.get("/properties",  getAdminProperties)



router.patch( "/property/status/:propertyId", updatePropertyStatus)
export default router


