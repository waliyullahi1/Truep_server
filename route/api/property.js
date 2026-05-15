import express from "express";
const router = express.Router()
import {  updateproperty, getAllProperty,updatePropertyStatus,  deleteProperty, getPropertyByUser, getPropertyById, deletePropertyImage, getPropertyImages, PropertyupdateImage } from "../../controllers/property_controller.js";
import { protect} from "../../middleware/auth.js";
import uploadAvatar from "../../middleware/upload.js"
// router.post("/upload-avatar", protect,  uploadAvatar.single("avatar"), updateproperty);


router.get("/", protect, getPropertyByUser);
router.get("/all",   getAllProperty);

router.post("/:id", protect, updateproperty);
router.patch('/:id/status', protect, updatePropertyStatus)


router.delete("/:id", protect, deleteProperty);
router.get("/:id",   getPropertyById);



router.get("/images/:id", protect,  getPropertyImages);
router.delete("/image/:id", protect,  deletePropertyImage);
router.post("/upload-image/:id/:type", protect, uploadAvatar.single("image"), PropertyupdateImage)
export default router;
