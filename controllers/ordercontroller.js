import dotenv from "dotenv";
dotenv.config();
import Propert from "../model/Property.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/upload.js";
import jwt from 'jsonwebtoken'; 
import mongoose from 'mongoose'
import slugify from "slugify"
import puppeteer from "puppeteer"
import PropertyOrder from "../model/PropertyOrder.js";



export const OrderEvidenImageUpload = async (req, res) => {
  try {
    const { id, type } = req.params;
    console.log('reach1', id, type);
    
    /*---------------------------------------
    Validate upload type
    ---------------------------------------*/
    const allowedTypes = [
      "buyerPhoto",
      "propertyPhoto",
      "agreementPhoto"
    ];
    console.log('reach2');
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid evidence type."
      });
    }
    console.log('reach3');
    /*---------------------------------------
    Validate image
    ---------------------------------------*/
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image."
      });
    }
    console.log('reach4',id);
    console.log(req.user._id);
    
    /*---------------------------------------
    Only buyer can upload evidence
    ---------------------------------------*/
    const order = await PropertyOrder.findOne({
      _id: id,
      buyer: req.user._id
    });
    console.log('reach5');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found."
      });
    }
console.log('reach6');
    /*---------------------------------------
    Buyer must have paid
    ---------------------------------------*/
    if (
      ![
        "FUNDED",
        "PARTIALLY_FUNDED",
        "HELD"
      ].includes(order.escrowStatus)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Inspection evidence can only be uploaded after payment has been successfully received."
      });
    }
console.log('reach6');
    /*---------------------------------------
    Upload to Cloudinary
    ---------------------------------------*/
    const result = await uploadToCloudinary(req.file, type);
    console.log(result);
    console.log('reach7');
    const newImage = {
      url: result.secure_url,
      public_id: result.public_id,
      type
    };
console.log('reach8');
    /*---------------------------------------
    Only one buyer photo
    ---------------------------------------*/
    if (type === "buyerPhoto") {
      order.inspectionEvidence = order.inspectionEvidence.filter(
        img => img.type !== "buyerPhoto"
      );
    }
    console.log('reach9');
    /*---------------------------------------
    Only one agreement photo
    ---------------------------------------*/
    if (type === "agreementPhoto") {
      order.inspectionEvidence = order.inspectionEvidence.filter(
        img => img.type !== "agreementPhoto"
      );
    }
console.log('reach10');
    /*---------------------------------------
    Save new image
    ---------------------------------------*/
    order.inspectionEvidence.push(newImage);

    await order.save();
    console.log('reach11');
    /*---------------------------------------
    Return grouped data
    ---------------------------------------*/
    return res.status(200).json({
      success: true,
      message: "Inspection evidence uploaded successfully.",
      data: {
        buyerPhoto:
          order.inspectionEvidence.find(
            img => img.type === "buyerPhoto"
          ) || null,

        agreementPhoto:
          order.inspectionEvidence.find(
            img => img.type === "agreementPhoto"
          ) || null,

        propertyImages:
          order.inspectionEvidence.filter(
            img => img.type === "propertyPhoto"
          ),

        inspectionEvidence: order.inspectionEvidence
      }
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
      error: err.message
    });
  }
};

export const getOrderEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id,'fddddd');
    
    const order = await PropertyOrder.findOne({
      _id: id,
      buyer: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found."
      });
    }

    const inspectionEvidence = order.inspectionEvidence || [];

    const buyerPhoto =
      inspectionEvidence.find(
        img => img.type === "buyerPhoto"
      ) || null;

    const agreementPhoto =
      inspectionEvidence.find(
        img => img.type === "agreementPhoto"
      ) || null;

    const propertyImages =
      inspectionEvidence.filter(
        img => img.type === "propertyPhoto"
      );

    return res.status(200).json({
      success: true,
      data: {
        buyerPhoto,
        agreementPhoto,
        propertyImages,
        inspectionEvidence
      }
    });

  } catch (error) {
    console.error("ORDER EVIDENCE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error.",
      error: error.message
    });
  }
};

export const deleteOrderEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: imageId } = req.body;

    if (!imageId) {
      return res.status(400).json({
        success: false,
        message: "Image id is required."
      });
    }

    // Only the buyer can delete evidence
    const order = await PropertyOrder.findOne({
      _id: id,
      buyer: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found."
      });
    }

    const image = order.inspectionEvidence.id(imageId);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Evidence image not found."
      });
    }

    // Delete from Cloudinary
    if (image.public_id) {
      await deleteFromCloudinary(image.public_id);
    }

    // Remove from MongoDB
    image.deleteOne();

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Evidence removed successfully.",
      data: {
        buyerPhoto:
          order.inspectionEvidence.find(
            img => img.type === "buyerPhoto"
          ) || null,

        agreementPhoto:
          order.inspectionEvidence.find(
            img => img.type === "agreementPhoto"
          ) || null,

        propertyImages:
          order.inspectionEvidence.filter(
            img => img.type === "propertyPhoto"
          ),

        inspectionEvidence: order.inspectionEvidence
      }
    });

  } catch (error) {
    console.error("DELETE EVIDENCE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error.",
      error: error.message
    });
  }
};