import express from "express"

import { inspectAuth } from "../../middleware/inspect_auth.js";
const router = express.Router()
import  { bookInspection, getSellerInspections, checkPropertyBook }  from "../../controllers/inspect_property.js"
import { protect} from "../../middleware/auth.js";


router.post("/:propertyId", inspectAuth, bookInspection)
router.get("/existing/:propertyId", inspectAuth, checkPropertyBook)
router.get("/in", protect, getSellerInspections)
export default router