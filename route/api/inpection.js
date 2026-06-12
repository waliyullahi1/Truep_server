import express from "express"

import { inspectAuth } from "../../middleware/inspect_auth.js";
const router = express.Router()
import  { bookInspection, checkPropertyBook }  from "../../controllers/inspect_property.js"



router.post("/:propertyId", inspectAuth, bookInspection)
router.get("/existing/:propertyId", inspectAuth, checkPropertyBook)
export default router