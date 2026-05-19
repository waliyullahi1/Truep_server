import Usertp from "../model/Users.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/upload.js";
import  Others from "../model/Others.js";
import axios from "axios";
import mongoose from 'mongoose';
import Propert from "../model/Property.js";
export const updateAvater = async (req, res) => {
  try {

    const user = await Usertp.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    if (user.avatar_public_id) {
       await deleteFromCloudinary(user.avatar_public_id);
    }
  
    
    const result = await uploadToCloudinary(req.file,'avatars');
       user.avatar = result.secure_url;
    user.avatar_public_id = result.public_id;
    // console.log(user.avatar);
    await user.save();

    res.status(200).json({
      success: true,
      avatar: result.secure_url
    });

  } catch (error) {

    // console.error(error);

    res.status(500).json({ message: "Server error" });

  }
};

export const getusers = async (req, res) => {
  try {
    const  id  = req.user._id

    /* =====================================================
       VALIDATE ID
    ===================================================== */

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    /* =====================================================
       AGGREGATION
    ===================================================== */

    const agent = await Usertp.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
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
          from: "propert", // check collection name
          localField: "_id",
          foreignField: "userId",
          as: "properties",
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
         REMOVE UNWANTED FIELDS
      ===================================================== */

      {
        $project: {
          password: 0,
          walletBalance: 0,
          refreshToken: 0,
          emailVerificationToken: 0,
          emailVerified: 0,
          resetPasswordExpires: 0,
          resetPasswordToken: 0,

          __v: 0,

          other: 0,

          nin: 0,
          certificates: 0,
        },
      },
    ])

    /* =====================================================
       NOT FOUND
    ===================================================== */

    if (!agent.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    /* =====================================================
       RESPONSE
    ===================================================== */
    
    res.status(200).json({
      success: true,
      data: agent[0],
    })

  } catch (error) {
    // console.log(error)

    res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
}
export const getAvatar = async (req, res) => {
  try {

    const user = await Usertp.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      avatar: user.avatar
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({ message: "Server error" });

  }
};
export const updateProfile = async (req, res) => {

  try {

    const userId = req.user._id
    const { details } = req.body

    /* =========================================
       VALIDATION
    ========================================= */

    if (!details || typeof details !== 'object') {

      return res.status(400).json({
        success: false,
        message: 'Invalid profile data'
      })
    }
    // if(req.user.roles !== "Admin") {
    //   if (details.roles === 'Admin') {

    //   return res.status(400).json({
    //     success: false,
    //     message: 'Invalid profile data'
    //   })
    // }
    // }
    

    /* =========================================
       REMOVE IMMUTABLE FIELDS
    ========================================= */

    const {
      _id,
      __v,
      createdAt,
      updatedAt,
      ...safeDetails
    } = details

    /* =========================================
       ALLOWED USER FIELDS
    ========================================= */

    const allowedUserFields = [
      'firstName',
      'middleName',
      'lastName',
      'roles',
      'location',
      'phone',
      'avatar',
      'yearOfExperience',
      'address',
      'whatsapp_no',
    ]

    const userUpdate = {}

    for (const key of allowedUserFields) {

      if (safeDetails[key] !== undefined) {
        userUpdate[key] = safeDetails[key]
      }
    }

    /* =========================================
       UPDATE USER
    ========================================= */

    const newdata =
      await Usertp.findByIdAndUpdate(
        userId,
        {
          $set: userUpdate
        },
        {
          new: true,
          runValidators: true
        }
      )

 

    /* =========================================
       UPDATE OTHERS
    ========================================= */

    await Others.updateOne(
      { userId },
      {
        $set: {
          ...safeDetails,
          userId
        }
      },
      {
        upsert: true
      }
    )


    /* =========================================
       RESPONSE
    ========================================= */

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: newdata
    })

  } catch (error) {
    console.log(error);
    
  

    return res.status(500).json({
      success: false,
      message: 'Server error'
    })
  }
}

export const getuser = async (req, res) => {
  try {
    const user = await Usertp.findById(req.user._id).select("-password");
    const other = await Others.findOne({ userId: req.user._id }).select("-_id -location -userId -createdAt -updatedAt -__v");
   

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({
      success: true,
       data: {
    ...user.toObject(),
    ...(other ? other.toObject() : {})
 
  }
      
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

export const getpropertybyUser = async (req, res) => {
  try {
    
      
    const property = await Propert.find({ userId: req.user._id });
    
    if (!property) {
      return res.status(404).json({ message: "User as not  property" });
    }
    res.status(200).json({
      success: true,
       data: property
  
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}


export const sendSMS = async ( req, res) => {


const sendOtp = async () => {
  try {
    const res = await axios.post(
      "https://api.ng.termii.com/api/sms/otp/send",
      {
        api_key: "TLochWgTtxoKXlPhPwuvtJbVprHXYtLnOLeNlSRpuFDPkwspyKzgXFlfdOmklR",
        message_type: "NUMERIC",
        to: "2348166988715",
        from: "Abanise", // can still be anything here
        channel: "generic",
        pin_attempts: 3,
        pin_time_to_live: 5,
        pin_length: 6,
        pin_placeholder: "< 1234 >",
        message_text: "Your OTP is < 1234 >",
        pin_type: "NUMERIC"
      }
    )
    
    
    // console.log(res.data)
  } catch (err) {
    console.log(err.response?.data || err.message)
  }
}


}

export const getAllAgents = async (req, res) => {
  try {
    const agents = await Propert.aggregate([
      
      /* 1️⃣ GROUP PROPERTIES */
      {
        $group: {
          _id: "$userId",
          totalProperties: { $sum: 1 }
        }
      },

      /* 2️⃣ USER JOIN */
      {
        $lookup: {
          from: "usertps",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },

      /* 3️⃣ OTHERS JOIN */
      {
        $lookup: {
          from: "others",
          localField: "_id",
          foreignField: "userId",
          as: "other"
        }
      },
      {
        $unwind: {
          path: "$other",
          preserveNullAndEmptyArrays: true
        }
      },

      /* 4️⃣ CLEAN DATA FOR FRONTEND */
      {
        $project: {
          _id: 0,
          userId: "$_id",
          totalProperties: 1,

          /* ✅ SAFE NAME */
          name: {
            $ifNull: [
              "$other.name",
              { $concat: ["$user.firstName", " ", "$user.lastName"] }
            ]
          },

          firstName: "$user.firstName",
          lastName: "$user.lastName",

          email: "$user.email",
          phone: "$user.phone",
          avatar: "$user.avatar",
          role: "$user.roles",
          whatsapp_no: { $ifNull: ["$user.whatsapp_no", ""] },
          /* ✅ SAFE LOCATION */
          location: {
            country: { $ifNull: ["$user.location.country", "Nigeria"] },
            state: { $ifNull: ["$user.location.state", ""] },
            city: { $ifNull: ["$user.location.city", ""] },
            address: { $ifNull: ["$user.location.address", ""] }
          },

          /* ✅ SAFE OTHERS DATA */
          about: { $ifNull: ["$other.about", ""] },
            social_media: { $ifNull: ["$other.social_media", ""] },
          
          skills: {
            $ifNull: ["$other.skills", []]
          },

          workExperience: {
            $ifNull: ["$other.workExperience", []]
          },

          languages: {
            $ifNull: ["$other.languages", []]
          }
        }
      },

      /* 5️⃣ SORT */
      {
        $sort: { totalProperties: -1 }
      }

    ])

    res.status(200).json({
      success: true,
      count: agents.length,
      data: agents
    })

  } catch (error) {
    // console.error("GET AGENTS ERROR:", error)
    res.status(500).json({ message: "Server error" })
  }
}



export const getAgent = async (req, res) => {
  try {
    const { id } = req.params;

    const isValidId = mongoose.Types.ObjectId.isValid(id);

    if (!isValidId) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const agent = await Usertp.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },

      // 🔗 Join Others
      {
        $lookup: {
          from: "others", // collection name (must be lowercase plural in MongoDB)
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

      // 🔗 Join Properties
      {
        $lookup: {
          from: "properts", // ⚠️ check your actual collection name
          localField: "_id",
          foreignField: "userId",
          as: "properties",
        },
      },

      // 🧹 Remove sensitive fields
      {
        $project: {
          password: 0,
          walletBalance: 0,
          refreshToken: 0,
          emailVerificationToken: 0,
          emailVerified: 0,
          resetPasswordExpires: 0,
          resetPasswordToken: 0,

          "other._id": 0,
          "other.userId": 0,
          "other.createdAt": 0,
          "other.updatedAt": 0,
          "other.__v": 0,
          "other.nin": 0,
          "other.certificates": 0,
        },
      },

      // 🧩 Merge user + other
      {
        $addFields: {
          merged: {
            $mergeObjects: ["$$ROOT", "$other"],
          },
        },
      },

      {
        $replaceRoot: {
          newRoot: "$merged",
        },
      },
    ]);

    if (!agent.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: agent[0],
    });

  } catch (error) {
    // console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
