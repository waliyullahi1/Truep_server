// services/payment.service.js
import PaymentService from "../service/payment.service.js";
import Payment from "../model/payments.js";
import Propert from "../model/Property.js";
export const createOrderPayment = async (req, res) => {

    try {
        console.log('pamentc1');

        const result = await PaymentService.createOrderPayment({
            totalPlot: req.body.totalPlot,
            buyer: req.user,
            propertyId: req.body.propertyId,
            amount: req.body.amount

        });
        console.log(" payment initialized successful");
        return res.status(200).json({

            success: true,

            message: "Payment initialized successfully.",

            data: result

        });

    } catch (err) {
        console.log(err);

        return res.status(400).json({

            success: false,

            message: err.message

        });

    }

};



// import Wallet from "../model/Wallet.js";

//  async function initializePlatformWallet() {

//     const wallet = await Wallet.findOne({
//         ownerType: "PLATFORM"
//     });

//     if (wallet) {
//         console.log("Platform wallet already exists.");
//         return wallet;
//     }

//     const newWallet = await Wallet.create({
//         ownerType: "PLATFORM",
//         owner: null,
//         balance: 0,
//         currency: "NGN",
//         status: "ACTIVE"
//     });

//     console.log("Platform wallet created.");

//     return newWallet;
// }


export const verifyOrder = async (req, res) => {

    try {
        const ref = req.body.ref;


        const result = await PaymentService.verifyOrderPayment(ref);

        return res.status(200).json({

            success: true,

            message: "Payment initialized successfully.",

            data: result

        });

    } catch (err) {
        console.log(err);

        return res.status(400).json({

            success: false,

            message: err.message

        });

    }

};

export const getTransactionbyProperty = async (req, res) => {
  try {
    console.log('getTransactionbyProperty');
    const { slug } = req.params;

    console.log(slug,'slug');
    

    // Find all payments for this property
    const transactions = await Payment.find({
      property: slug
    })
      .populate("payer", "firstName lastName phone")
      .populate("receiver", "firstName lastName email")
      .populate("property", "title location")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Property transactions fetched successfully.",
      data: transactions
    });
    
    
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch property transactions."
    });
  }
};