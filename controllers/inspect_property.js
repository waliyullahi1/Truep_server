import Inspection from "../model/Inspection.js";
import Property from "../model/Property.js";
import Usertp from "../model/Users.js";
import {renderOtpTemplateHtmlBeforeInspection} from "../template/verifyEmail.js";
import {inspectionRequestTemplate} from "../template/inspection_template.js";
import { bravo_sendEmail } from "../service/bravoemail.js";
export const bookInspection = async (req, res) => {
  try {
    const { propertyId } = req.params;

    const {
      inspectionDate,
      inspectionTime,
      message,
      fullName,
      email,
      phone
    } = req.body;

    /* ==========================
       PROPERTY
    ========================== */

    const property = await Property.findById(propertyId);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found"
      });
    }

    if (property.status === "sold") {
      return res.status(400).json({
        success: false,
        message: "Property already sold"
      });
    }

    /* ==========================
       LOGGED IN USER
    ========================== */

    if (req.user) {
      console.log(req.user);
      
      const existingInspection =
        await Inspection.findOne({
          property: propertyId,
          buyer: req.user._id,
          status: {
            $in: ["pending", "approved"]
          }
        });

      if (existingInspection) {
        return res.status(400).json({
          success: false,
          message: "Inspection already booked"
        });
      }
      console.log(property);
      
      const inspection =
        await Inspection.create({
          property: property._id,
          seller: property.userId,
          buyer: req.user._id,
          phone: phone || req.user.phone,
          inspectionDate,
          inspectionTime,
          message
        });

      return res.status(201).json({
        success: true,
        message: "Inspection booked successfully",
        inspection
      });
    }

    /* ==========================
       GUEST USER
    ========================== */

    if (
      !fullName ||
      !email ||
      !phone ||
      !inspectionDate ||
      !inspectionTime
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields are needed"
      });
    }

    const [firstName, ...lastNameParts] =
      fullName.trim().split(" ");

    const lastName =
      lastNameParts.join(" ") || "";

    let user;

    const existingUser =
      await Usertp.findOne({ email });

    if (existingUser) {
 console.log( ' user  fund');
      if (existingUser.emailVerified) {
         console.log( ' login no fund');
        return res.status(400).json({
          success: false,
          message:
            "Email already associated with an account. Please login to book inspection."
        });
      }
     const otp = Math.floor(100000 + Math.random() * 900000).toString();


      const existingInspection =  await Inspection.findOne({
        property: propertyId,
        buyer: existingUser._id,
        status: {
          $in: ["pending"]
        }
      });

      if ( existingInspection) {
       existingInspection.propertyId = property._id;
        existingInspection.seller = property.userId;
         existingInspection.phone =  phone;
         await existingInspection.save();
        console.log( 'property is already booked,   edit it to current property ');

      }
      if (!existingInspection) {
         await Inspection.create({
        property: property._id,
        seller: property.userId,
        buyer: existingUser._id,
        phone,
        inspectionDate,
        inspectionTime,
        message
      });

      console.log( 'user as no verify and we create new inpection for her for her');
      
      }
       console.log( 'send message to email');
      existingUser.emailVerificationToken = otp;
      await existingUser.save();
      console.log( existingUser.emailVerificationToken, 'send message to email');
      
      console.log( 'send message to email');
      
      const emailRes = await bravo_sendEmail({
        to: existingUser.email,
        subject: "Abanise Email Verification Code",
        html: renderOtpTemplateHtmlBeforeInspection({
          name: `${existingUser.firstName} ${existingUser.lastName}`,
          otp,
          expiryMinutes: 15
        })
      })

      return res.status(403).json({
        success: false,
        message: "Verify Your Email to Complete Inspection Booking. Verification code sent to email."
      });

   

    } else {
     
      
     const  newuser = await Usertp.create({
        firstName,
        lastName,
        email,
        phone
      });

    }

const otp = Math.floor(100000 + Math.random() * 900000).toString();
      newuser.emailVerificationToken = otp;
      await newuser.save();
      console.log( newuser.emailVerificationToken, 'send message to email');
       const emailRes = await bravo_sendEmail({
        to: newuser.email,
        subject: "Abanise Email Verification Code",
        html: renderOtpTemplateHtmlBeforeInspection({
          name: `${newuser.firstName} ${newuser.lastName}`,
          otp,
          expiryMinutes: 15
        })
      })
   

    const inspection =
      await Inspection.create({
        property: property._id,
        seller: property.userId,
        buyer: user._id,
        inspectionDate,
        inspectionTime,
        message
      });

    return res.status(201).json({
      success: true,
      message: "Verified  code as sent to your emaill befor Inspection booked successfully",
      inspection
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

export const checkPropertyBook =  async (req, res) => {
  try {
    const { propertyId } = req.params;
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false, message: " Property Not FUnd"
      });
    }
    console.log(req.user);
    
    const existingInspection = await Inspection.findOne({
      property: propertyId,
      buyer: req.user._id,
      status: {
        $in: ["pending", "approved"]
      }
    });
    if (existingInspection) {
    
      
      return res.status(200).json({
        success: true,
        message: "Property is already booked.",
        IsBooked: true
      });
    } else {
      return res.status(200).json({
        success: true,
        message: "Property is available for booking.",
        isBooked: false
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
