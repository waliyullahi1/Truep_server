import dotenv from "dotenv";
dotenv.config();
import Propert from "../model/Property.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/upload.js";
import jwt from 'jsonwebtoken'; 
import mongoose from 'mongoose'
import slugify from "slugify"


/* =====================================================
   UPDATE / CREATE PROPERTY WITH AUTO SLUG
===================================================== */
export const updateproperty = async (req, res) => {
  try {
    const id = req.params.id
    const { details } = req.body

    /* ================= CHECK BODY ================= */
    if (!details || Object.keys(details).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Details are required"
      })
    }

    /* ================= REQUIRED ================= */
    const { title, category, type, purpose,   } = details

    const requiredFields = { title, category, type, purpose }

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        return res.status(400).json({
          success: false,
          message: `${key.charAt(0).toUpperCase() + key.slice(1)} is required`
        })
      }
    }

    /* =====================================================
       CREATE UNIQUE SLUG FROM TITLE
       Example:
       3 Bedroom Duplex In Lagos
       =>
       3-bedroom-duplex-in-lagos
    ===================================================== */
    let baseSlug = slugify(title, {
      lower: true,
      strict: true,
      trim: true
    })

    let finalSlug = baseSlug

    let counter = 1

    while (
      await Propert.findOne({
        slug: finalSlug,
        ...(mongoose.Types.ObjectId.isValid(id)
          ? { _id: { $ne: id } }
          : {})
      })
    ) {
      finalSlug = `${baseSlug}-${counter}`
      counter++
    }

    details.slug = finalSlug

    /* ================= FIX GEOJSON ================= */
    if (details.location?.geometry) {
      const geo = details.location.geometry

      const isEmptyCoords =
        !geo.coordinates ||
        (Array.isArray(geo.coordinates) &&
          geo.coordinates.length === 0)

      const invalidPoint =
        geo.type === "Point" &&
        (!Array.isArray(geo.coordinates) ||
          geo.coordinates.length !== 2)

      const invalidPolygon =
        geo.type === "Polygon" &&
        (!Array.isArray(geo.coordinates) ||
          geo.coordinates.length === 0)

      if (isEmptyCoords || invalidPoint || invalidPolygon) {
        delete details.location.geometry
      }
    }

    /* ================= CLEAN DATA ================= */
    const {
      status,
      _id,
      media,
      ownership,
      documents,
      ...others
    } = details

    let property

    const isValidId = mongoose.Types.ObjectId.isValid(id)

    /* ================= UPDATE ================= */
    if (isValidId) {
      property = await Propert.findOneAndUpdate(
        {
          _id: id,
          userId: req.user._id
        },
        {
          $set: others
        },
        {
          new: true,
          runValidators: true
        }
      )

      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found"
        })
      }

      return res.status(200).json({
        success: true,
        message: "Property updated successfully",
        data: property
      })
    }

    /* ================= CREATE ================= */
    property = await Propert.create({
      userId: req.user._id,
      ...others
    })

    return res.status(201).json({
      success: true,
      message: "Property created successfully",
      data: property
    })

  } catch (error) {
    console.error("PROPERTY ERROR:", error)

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    })
  }
}



export const updatePropertyStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    /* ================= VALIDATE ID ================= */
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property id'
      })
    }

    /* ================= VALIDATE STATUS ================= */
    const allowedStatus = [
      'draft',
      'approved',
      'sold',
      'rented',
      'off_market'
    ]

    if (!status || !allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      })
    }

    /* ================= FIND PROPERTY (OWNER ONLY) ================= */
    const property = await Propert.findOne({
      _id: id,
      userId: req.user._id
    })

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found or you are not the owner'
      })
    }

    /* ================= TRANSITION RULES ================= */
    const allowedTransitions = {
      draft: ['approved'],
      approved: ['sold', 'rented', 'off_market', 'draft'],
      off_market: ['approved'],
      sold: [],
      rented: [],
       suspended: []
    }

    const currentStatus = property.status

    if (!allowedTransitions[currentStatus].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from "${currentStatus}" to "${status}"`
      })
    }

    /* ================= UPDATE ================= */
    property.status = status
    await property.save()

    return res.status(200).json({
      success: true,
      message: 'Property status updated successfully',
      data: property
    })

  } catch (error) {
    console.error('UPDATE PROPERTY STATUS ERROR:', error)

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    })
  }
}

export const getPropertyById = async (req, res) => {
  try {
    const id = req.params.id;
      const isValidId = mongoose.Types.ObjectId.isValid(id)
    let property
    if (!isValidId) {
      
       if(!property){
        // it is slogan pass here
          property = await Propert.findOne({ slug: id }).populate("userId");
        }
        console.log(property);
        

    } else{
       property = await Propert.findById(id).populate("userId");
    }

    // 1️⃣ Find property first
    

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    let isOwner = false;

    // 2️⃣ Safely check JWT (optional, route is public)
    const token = req.cookies?.jwt;

    if (token) {
      try {
       console.log();
       
        const decoded = jwt.verify(token,  process.env.REFRESH_TOKEN_SECRETY,);
        console.log(decoded, property.userId._id.toString(), 'property.userId._id.toString()');
        
        // Convert to string to avoid ObjectId vs string issues
        if (decoded.id.toString() === property.userId._id.toString()) {
          isOwner = true;
          console.log("User is the owner of this property");
        }
      } catch (err) {
        // Invalid/expired token should NOT break this route
        console.log("JWT invalid or expired");
      }
    }

    

    // 3️⃣ Return property + ownership info
    return res.status(200).json({
      success: true,
      isOwner,
      data: property,
    });

  } catch (error) {
    console.error("PROPERTY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};








export const PropertyupdateImage = async (req, res) => {
  try {
    const { id, type } = req.params;

    const property = await Propert.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Ensure structure
    if (!property.media) property.media = { files: [] };
    if (!property.media.files) property.media.files = [];
      console.log( 'gggggg');
        console.log( 'gggggg');
    // Upload to cloudinary
    const result = await uploadToCloudinary(req.file, type);
    console.log(result, 'gggggg');
    
    const newFile = {
      url: result.secure_url,
      public_id: result.public_id,
      type
    };

    // Save new image
    property.media.files.push(newFile);
    await property.save();

    // Group files by type
    const images = property.media.files.filter(f => f.type === "image");
    const survey = property.media.files.filter(f => f.type === "survey");
    const titleDocs = property.media.files.filter(f => f.type === "titleDocs");

    res.status(200).json({
      success: true,
      data: {
        images,
        survey,
        titleDocs
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


export const getPropertyImages = async (req, res) => {
  try {
    const id = req.params.id;

    const property = await Propert.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // safe fallback (VERY IMPORTANT)
    const images = property.media.files.filter(f => f.type === "image");
    const survey = property.media.files.filter(f => f.type === "survey");
    const titleDocs = property.media.files.filter(f => f.type === "titleDocs");
    
    

    return res.status(200).json({
      success: true,
      data: {
        images,
        survey,
        titleDocs
      }
    });

  } catch (error) {
    console.error("PROPERTY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const getPropertyByUser = async (req, res) => {
  try {
    const property = await Propert.find({
      userId: req.user._id
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }
    return res.status(200).json({
      success: true,
      data: property
    });

  } catch (error) {
    console.error("PROPERTY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};




export const deletePropertyImages = async (req, res) => {
  try {
    const id = req.params.id;
    console.log(id);

    // Make sure to use 'userId' instead of 'user'
    const property = await Propert.findOne({ _id: id, userId: req.user._id });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }
    console.log('fffff', req.body.id);

    if (!req.body.id) return res.status(400).json({ message: "not not found", })


    const image = property.media.images.id(req.body.id);
    console.log("sdfdf", image);
    if (!image) return res.status(400).json({ message: "not not found", })
    if (image.public_id) {
      await deleteFromCloudinary(image.public_id)
    }



    image.deleteOne()

    await property.save()
    return res.status(200).json({
      success: true,
      data: property.media.images,
    });

  } catch (error) {
    console.error("PROPERTY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


export const deleteProperty = async (req, res) => {
  try {
    const id = req.params.id;

    // 1️⃣ Find property that belongs to this user
    const property = await Propert.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }


        if (property.media?.files?.length) {
      for (const img of property.media.files) {
        console.log(img);
          if (img.public_id) {
            await deleteFromCloudinary(img.public_id)
          }
        
      }
    }

    // 3️⃣ Delete property from database
     await Propert.deleteOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: "Property and images deleted successfully",
    });

  } catch (error) {
    console.error("DELETE PROPERTY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const deletePropertyImage = async (req, res) => {
  try {
    const { id, type } = req.body
    const propertyId = req.params.id
    console.log(id, type, propertyId);
    if (!id || !type) {
      return res.status(400).json({
        success: false,
        message: "Image id and type are required"
      })
    }
    console.log(id, type);


    const property = await Propert.findOne({
      _id: propertyId,
      userId: req.user._id // ✅ SECURITY
    })

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found"
      })
    }

    const media = property.media || {}
    console.log();

    // validate type
    if (!["image", "survey", "titleDocs"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type"
      })
    }

    const list = media[type] || []
    console.log('rechea there');

    // find image
    const image = property.media.files.id(id);
    console.log(image, 'imAGE');
    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image not found"
      })
    }

    /* ================= DELETE FROM CLOUDINARY ================= */
    if (image.public_id) {
      await deleteFromCloudinary(image.public_id)
    }
    image.deleteOne()
   
    await property.save()
    const images = property.media.files.filter(f => f.type === "image");
    const survey = property.media.files.filter(f => f.type === "survey");
    const titleDocs = property.media.files.filter(f => f.type === "titleDocs");

    return res.status(200).json({
      success: true,
      message: "Deleted successfully",
      data:{ images, survey, titleDocs }
    })

  } catch (error) {
    console.error("DELETE IMAGE ERROR:", error)

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    })
  }
}



/* =====================================================
   UPDATE / PUBLIC ROUTE
===================================================== */

export const getAllProperty = async (req, res) => {
  try {

    let {
      search,
      category,
      location,
      purpose,
      state,
      city,
      minPrice,
      maxPrice,
      minRooms,
      maxRooms,
      type,
      page = 1,
      limit = 10,
      sort = "random"
    } = req.query

    page = Number(page)
    limit = Number(limit)

    const query = {}
    const orConditions = []

    /* =========================
       SEARCH
    ========================= */

    if (search) {
      orConditions.push(
        { title: { $regex: search, $options: "i" } },
        { "location.address": { $regex: search, $options: "i" } },
        { "location.city": { $regex: search, $options: "i" } },
        { "location.state": { $regex: search, $options: "i" } },
        { "location.lga": { $regex: search, $options: "i" } }
      )
    }

    /* =========================
       LOCATION
    ========================= */

    if (state) {
      query["location.state"] = new RegExp(`^${state}$`, "i")
    }

    if (city) {
      query["location.city"] = new RegExp(`^${city}$`, "i")
    }

    if (location && !state && !city) {
      orConditions.push(
        { "location.address": { $regex: location, $options: "i" } },
        { "location.city": { $regex: location, $options: "i" } },
        { "location.state": { $regex: location, $options: "i" } },
        { "location.lga": { $regex: location, $options: "i" } }
      )
    }

    /* =========================
       TYPE
    ========================= */

    if (type) {
      query.type = type.toLowerCase()
    }

    /* =========================
       PURPOSE
    ========================= */

    if (purpose) {
      query.purpose = new RegExp(`^${purpose}$`, "i")
    }

    /* =========================
       CATEGORY
    ========================= */

    if (category && category !== "All") {
      query.category = new RegExp(`^${category}$`, "i")
    }

    /* =========================
       PRICE
    ========================= */

    if (minPrice || maxPrice) {

      query["pricing.price"] = {}

      if (minPrice) {
        query["pricing.price"].$gte = Number(minPrice)
      }

      if (maxPrice) {
        query["pricing.price"].$lte = Number(maxPrice)
      }
    }

    /* =========================
       BEDROOMS
    ========================= */

    if (minRooms || maxRooms) {

      const valueQuery = {}

      if (minRooms) {
        valueQuery.$gte = Number(minRooms)
      }

      if (maxRooms) {
        valueQuery.$lte = Number(maxRooms)
      }

      query.features = {
        $elemMatch: {
          key: "bedroom",
          value: valueQuery
        }
      }
    }

    /* =========================
       APPLY OR
    ========================= */

    if (orConditions.length) {
      query.$or = orConditions
    }

    /* =========================
       PAGINATION
    ========================= */

    const skip = (page - 1) * limit

    /* =========================
       SORT OPTIONS
    ========================= */

    const sortMap = {
      newest: { createdAt: -1 },

      oldest: { createdAt: 1 },

      price_asc: {
        "pricing.price": 1
      },

      price_desc: {
        "pricing.price": -1
      },

      // persistent random order
      random: {
        randomOrder: 1
      }
    }

    const sortOption = sortMap[sort] || {
      randomOrder: 1
    }

    /* =========================
       EXECUTE
    ========================= */

    const properties = await Propert.find({
      status: "approved",
      ...query
    })
      .sort(sortOption)
      .skip(skip)
      .limit(limit)

    /* =========================
       TOTAL
    ========================= */

    const total = await Propert.countDocuments({
      status: "approved",
      ...query
    })

    /* =========================
       RESPONSE
    ========================= */

    return res.status(200).json({
      success: true,
      results: properties.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: properties
    })

  } catch (error) {

    console.error("PROPERTY ERROR:", error)

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    })
  }
}
export const getAllPropertyss = async (req, res) => {
  try {
    let {
      search,
      category,
      location,
      purpose,
      state,
      city,
      minPrice,
      maxPrice,
      minRooms,
      maxRooms,
      type,
      page = 1,
      limit = 10,
      sort = "newest"
    } = req.query

    page = Number(page)
    limit = Number(limit)

    console.log(search, "search")
    console.log(category, "category")
    console.log(location, "location")
    console.log(state, "state")
    console.log(city, "city")
    console.log(type, "type")
    console.log(purpose, "purpose")

    const query = {}
    const orConditions = []

    /* =========================
       🔍 SEARCH
    ========================= */

    if (search) {
      orConditions.push(
        { title: { $regex: search, $options: "i" } },
        { "location.address": { $regex: search, $options: "i" } },
        { "location.city": { $regex: search, $options: "i" } },
        { "location.state": { $regex: search, $options: "i" } },
        { "location.lga": { $regex: search, $options: "i" } }
      )
    }

    /* =========================
       📍 LOCATION
    ========================= */

    if (state) {
      query["location.state"] = new RegExp(`^${state}$`, "i")
    }

    if (city) {
      query["location.city"] = new RegExp(`^${city}$`, "i")
    }

    // fallback location
    if (location && !state && !city) {
      orConditions.push(
        { "location.address": { $regex: location, $options: "i" } },
        { "location.city": { $regex: location, $options: "i" } },
        { "location.state": { $regex: location, $options: "i" } },
        { "location.lga": { $regex: location, $options: "i" } }
      )
    }

    /* =========================
       🏠 TYPE
    ========================= */

    if (type) {
      query.type = type.toLowerCase()
    }

    /* =========================
       🎯 PURPOSE
    ========================= */

    if (purpose) {
      query.purpose = new RegExp(`^${purpose}$`, "i")
    }

    /* =========================
       🏷 CATEGORY
    ========================= */

    if (category && category !== "All") {
      query.category = new RegExp(`^${category}$`, "i")
    }

    /* =========================
       💰 PRICE
    ========================= */

    if (minPrice || maxPrice) {
      query["pricing.price"] = {}

      if (minPrice) {
        query["pricing.price"].$gte = Number(minPrice)
      }

      if (maxPrice) {
        query["pricing.price"].$lte = Number(maxPrice)
      }
    }

    /* =========================
       🛏 ROOMS
    ========================= */

    if (minRooms || maxRooms) {
      const valueQuery = {}

      if (minRooms) {
        valueQuery.$gte = Number(minRooms)
      }

      if (maxRooms) {
        valueQuery.$lte = Number(maxRooms)
      }

      query.features = {
        $elemMatch: {
          key: "bedroom",
          value: valueQuery
        }
      }
    }

    /* =========================
       🔥 APPLY OR CONDITIONS
    ========================= */

    if (orConditions.length) {
      query.$or = orConditions
    }

    /* =========================
       📄 PAGINATION
    ========================= */

    const skip = (page - 1) * limit

    /* =========================
       🔃 SORTING
    ========================= */

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      price_asc: { "pricing.price": 1 },
      price_desc: { "pricing.price": -1 }
    }

    const sortOption = sortMap[sort] || {
      createdAt: -1
    }

    /* =========================
       🚀 EXECUTE
    ========================= */

    let properties = []

    // RANDOM RESULTS EVERY FETCH
    if (sort === "random") {

      properties = await Propert.aggregate([
        {
          $match: {
            status: "approved",
            ...query
          }
        },

        // random documents every request
        {
          $sample: {
            size: limit
          }
        }
      ])

    } else {

      // NORMAL SORTING
      properties = await Propert.find({
        status: "approved",
        ...query
      })
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
    }

    /* =========================
       📊 TOTAL
    ========================= */

    const total = await Propert.countDocuments({
      status: "approved",
      ...query
    })

    console.log(total)

    /* =========================
       ✅ RESPONSE
    ========================= */

    return res.status(200).json({
      success: true,
      results: properties.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: properties
    })

  } catch (error) {
    console.error("PROPERTY ERROR:", error)

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    })
  }
}
export const getAPropertys = async (req, res) => {
  try {
    let {
      search,
      category,
      location,
      purpose,
      state,
      city,
      minPrice,
      maxPrice,
      type,
      page = 1,
      limit = 12,
      sort = "newest",
      status
    } = req.query

    page = Number(page)
    limit = Number(limit)

    const query = {}

    /* =================================
       SEARCH
    ================================= */

    if (search?.trim()) {
      query.$text = {
        $search: search.trim()
      }
    }

    /* =================================
       FILTERS
    ================================= */

    if (type) {
      query.type = type.toLowerCase()
    }

    if (purpose) {
      query.purpose = purpose.toLowerCase()
    }

    if (category && category !== "All") {
      query.category = category.toLowerCase()
    }

    if (state) {
      query["location.state"] = state
    }

    if (city) {
      query["location.city"] = city
    }

    if (status) {
      query.status = status
    }

    /* =================================
       LOCATION FALLBACK
    ================================= */

    if (location && !state && !city) {
      query.$or = [
        { "location.address": new RegExp(location, "i") },
        { "location.city": new RegExp(location, "i") },
        { "location.state": new RegExp(location, "i") }
      ]
    }

    /* =================================
       PRICE
    ================================= */

    if (minPrice || maxPrice) {
      query["pricing.price"] = {}

      if (minPrice) {
        query["pricing.price"].$gte = Number(minPrice)
      }

      if (maxPrice) {
        query["pricing.price"].$lte = Number(maxPrice)
      }
    }

    /* =================================
       SORT
    ================================= */

    let sortOption = {}

    switch (sort) {
      case "price_asc":
        sortOption = { "pricing.price": 1 }
        break

      case "price_desc":
        sortOption = { "pricing.price": -1 }
        break

      default:
        sortOption = { createdAt: -1 }
    }

    /* =================================
       PAGINATION
    ================================= */

    const skip = (page - 1) * limit

    /* =================================
       EXECUTE
    ================================= */

    const [properties, total] = await Promise.all([

      Property.find(query)
        .select("-__v")
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),

      Property.countDocuments(query)

    ])

    return res.status(200).json({
      success: true,

      results: properties.length,

      total,

      page,

      pages: Math.ceil(total / limit),

      data: properties
    })

  } catch (error) {
    console.error("PROPERTY ERROR:", error)

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    })
  }
}