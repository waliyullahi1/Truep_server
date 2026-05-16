import Usertp from "../model/Users.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/upload.js";
import  Others from "../model/Others.js";
import axios from "axios";
import mongoose from 'mongoose';
import Propert from "../model/Property.js";

export const getallusers = async (req, res) => {
  try {

    /* =====================================================
       QUERY PARAMS
    ===================================================== */

    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10
    const skip = (page - 1) * limit

    const search = req.query.search || ""
    const role = req.query.role || ""
    const verified = req.query.verified

    /* =====================================================
       FILTER
    ===================================================== */

    const matchFilter = {}

    // SEARCH BY NAME OR EMAIL
    if (search) {
      matchFilter.$or = [
        {
          fullname: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
      ]
    }

    // FILTER ROLE
    if (role) {
      matchFilter.role = role
    }

    // FILTER VERIFIED USERS
    if (verified === "true") {
      matchFilter.emailVerified = true
    }

    if (verified === "false") {
      matchFilter.emailVerified = false
    }

    /* =====================================================
       AGGREGATION
    ===================================================== */

    const users = await Usertp.aggregate([

      /* =====================================================
         MATCH FILTERS
      ===================================================== */

      {
        $match: matchFilter,
      },

      /* =====================================================
         JOIN OTHERS
      ===================================================== */

      {
        $lookup: {
          from: "others",
          localField: "_id",
          foreignField: "userId",
          as: "other",
        },
      },

      {
        $unwind: {
          path: "$other",
          preserveNullAndEmptyArrays: true,
        },
      },

      /* =====================================================
         JOIN PROPERTIES
      ===================================================== */

      {
        $lookup: {
          from: "propert",
          localField: "_id",
          foreignField: "userId",
          as: "properties",
        },
      },

      /* =====================================================
         PROPERTY COUNT
      ===================================================== */

      {
        $addFields: {
          totalProperties: {
            $size: "$properties",
          },
        },
      },

      /* =====================================================
         MERGE USER + OTHER
      ===================================================== */

      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$$ROOT",
              "$other",
            ],
          },
        },
      },

      /* =====================================================
         REMOVE SENSITIVE FIELDS
      ===================================================== */

      {
        $project: {
          password: 0,
          walletBalance: 0,
          refreshToken: 0,
          emailVerificationToken: 0,
          resetPasswordExpires: 0,
          resetPasswordToken: 0,
          __v: 0,
          other: 0,
          nin: 0,
          certificates: 0,
        },
      },

      /* =====================================================
         SORT
      ===================================================== */

      {
        $sort: {
          createdAt: -1,
        },
      },

      /* =====================================================
         PAGINATION
      ===================================================== */

      {
        $skip: skip,
      },

      {
        $limit: limit,
      },

    ])

    /* =====================================================
       TOTAL USERS
    ===================================================== */

    const totalUsers = await Usertp.countDocuments(matchFilter)

    /* =====================================================
       RESPONSE
    ===================================================== */

    res.status(200).json({
      success: true,

      pagination: {
        totalUsers,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        limit,
      },

      data: users,
    })

  } catch (error) {

    console.log(error)

    res.status(500).json({
      success: false,
      message: "Server error",
    })

  }
}

export const adminDashboardStats = async (req, res) => {
  try {

    /* =====================================================
       TOTAL USERS
    ===================================================== */

    const totalUsers = await Usertp.countDocuments()

    /* =====================================================
       TOTAL VERIFIED USERS
    ===================================================== */

    const totalVerifiedUsers = await Usertp.countDocuments({
      emailVerified: true,
    })

    /* =====================================================
       TOTAL UNVERIFIED USERS
    ===================================================== */

    const totalUnverifiedUsers = await Usertp.countDocuments({
      emailVerified: false,
    })

    /* =====================================================
       TOTAL AGENTS
    ===================================================== */

    const totalAgents = await Usertp.countDocuments({
      role: "agent",
    })

    /* =====================================================
       TOTAL LANDLORDS
    ===================================================== */

    const totalLandlords = await Usertp.countDocuments({
      role: "landlord",
    })

    /* =====================================================
       TOTAL PROPERTY OWNERS
    ===================================================== */

    const totalPropertyOwners = await Usertp.countDocuments({
      role: "property-owner",
    })

    /* =====================================================
       TOTAL ADMINS
    ===================================================== */

    const totalAdmins = await Usertp.countDocuments({
      role: "admin",
    })

    /* =====================================================
       TOTAL PROPERTIES
    ===================================================== */

    const totalProperties = await Property.countDocuments()

    /* =====================================================
       TOTAL ACTIVE PROPERTIES
    ===================================================== */

    const totalActiveProperties = await Property.countDocuments({
      status: "active",
    })

    /* =====================================================
       TOTAL SOLD PROPERTIES
    ===================================================== */

    const totalSoldProperties = await Property.countDocuments({
      status: "sold",
    })

    /* =====================================================
       TOTAL PENDING PROPERTIES
    ===================================================== */

    const totalPendingProperties = await Property.countDocuments({
      status: "pending",
    })

    /* =====================================================
       TOTAL FEATURED PROPERTIES
    ===================================================== */

    const totalFeaturedProperties = await Property.countDocuments({
      featured: true,
    })

    /* =====================================================
       TOTAL USERS WITH PROPERTIES
    ===================================================== */

    const usersWithProperties = await Property.distinct("userId")

    /* =====================================================
       USERS REGISTERED TODAY
    ===================================================== */

    const today = new Date()

    today.setHours(0, 0, 0, 0)

    const usersToday = await Usertp.countDocuments({
      createdAt: {
        $gte: today,
      },
    })

    /* =====================================================
       PROPERTIES POSTED TODAY
    ===================================================== */

    const propertiesToday = await Property.countDocuments({
      createdAt: {
        $gte: today,
      },
    })

    /* =====================================================
       RESPONSE
    ===================================================== */

    res.status(200).json({
      success: true,

      data: {

        users: {
          totalUsers,
          totalVerifiedUsers,
          totalUnverifiedUsers,
          usersToday,
        },

        roles: {
          totalAgents,
          totalLandlords,
          totalPropertyOwners,
          totalAdmins,
        },

        properties: {
          totalProperties,
          totalActiveProperties,
          totalSoldProperties,
          totalPendingProperties,
          totalFeaturedProperties,
          propertiesToday,
          usersWithProperties: usersWithProperties.length,
        },

      },

    })

  } catch (error) {

    console.log(error)

    res.status(500).json({
      success: false,
      message: "Server error",
    })

  }
}