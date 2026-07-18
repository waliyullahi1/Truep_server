import Wallet from "../model/Wallet.js";
import Ledger from "../model/Ledger.js";
import Usertp from '../model/Users.js'


// await WalletService.creditUserWallet({
//     userId: user._id,
//     payment,
//     amount: 50000,
//     category: "WALLET_FUNDING",
//     reference: payment.txRef,
//     description: "Wallet funded via Paystack",
//     session
// });

// await WalletService.creditUserWallet({
//     userId: buyer._id,
//     refund,
//     amount: refund.amount,
//     category: "ESCROW_REFUND",
//     reference: refund.reference,
//     description: "Refund for cancelled order",
//     session
// });

// await WalletService.debitUserWallet({
//     userId: buyer._id,
//     order,
//     amount: order.totalAmount,
//     category: "PROPERTY_PAYMENT",
//     reference: order.orderNumber,
//     description: "Property payment",
//     session
// });
class WalletService {

    /**
     * Credit Platform Wallet
     */
    static async creditPlatformWallet({
        payment,
        order,
        amount,
        transaction,
        session
    }) {

        /*------------------------------------
        Find Platform Wallet
        ------------------------------------*/
        const wallet = await Wallet.findOne({
            ownerType: "PLATFORM",
            status: "ACTIVE"
        }).session(session);

        if (!wallet) {
            throw new Error("Platform wallet not found.");
        }

        /*------------------------------------
        Credit Wallet
        ------------------------------------*/
        const balanceBefore = wallet.balance;

        wallet.credit(amount);

        await wallet.save({ session });

        /*------------------------------------
        Create Ledger
        ------------------------------------*/
        await Ledger.create(
            [{
                wallet: wallet._id,

                payment: payment._id,

                order: order._id,

                type: "CREDIT",

                category: "ESCROW_DEPOSIT",

                amount,

                currency: payment.currency,

                balanceBefore,

                balanceAfter: wallet.balance,

                reference: payment.txRef,

                description: `Escrow funding for Order ${order._id}`,

                status: "COMPLETED",

                metadata: {
                    gateway: "PAYSTACK",
                    transactionId: transaction.id,
                    paidAmount: transaction.amount,
                    gatewayFee: transaction.fees,
                    channel: transaction.channel,
                    customerEmail: transaction.customer?.email
                }
            }],
            { session }
        );

        return wallet;
    }

    /**
 * Debit Platform Wallet
 */
    static async debitPlatformWallet({
        payment = null,
        order = null,
        refund = null,
        amount,
        category,
        reference,
        description,
        metadata = {},
        session
    }) {

        /*------------------------------------
        Find Platform Wallet
        ------------------------------------*/
        const wallet = await Wallet.findOne({
            ownerType: "PLATFORM",
            status: "ACTIVE"
        }).session(session);

        if (!wallet) {
            throw new Error("Platform wallet not found.");
        }

        if (wallet.balance < amount) {
            throw new Error("Insufficient platform wallet balance.");
        }

        /*------------------------------------
        Debit Wallet
        ------------------------------------*/
        const balanceBefore = wallet.balance;

        wallet.debit(amount);

        await wallet.save({ session });

        /*------------------------------------
        Create Ledger
        ------------------------------------*/
        await Ledger.create(
            [{
                wallet: wallet._id,

                payment: payment?._id || null,

                order: order?._id || null,

                refund: refund?._id || null,

                type: "DEBIT",

                category,

                amount,

                currency: wallet.currency,

                balanceBefore,

                balanceAfter: wallet.balance,

                reference,

                description,

                status: "COMPLETED",

                metadata
            }],
            { session }
        );

        return wallet;
    }


    /**
     * Credit User Wallet
     */
    static async creditUserWallet({
        userId,
        payment = null,
        order = null,
        refund = null,
        amount,
        category,
        reference,
        description,
        metadata = {},
        session
    }) {

        let wallet = await Wallet.findOne({
            owner: userId,
            ownerType: "USER",
            status: "ACTIVE"
        }).session(session);

        if (!wallet) {

            const user = await Usertp.findById(userId).session(session);

            if (!user) {
                throw new Error("User not found.");
            }

            wallet = await Wallet.create([{
                owner: user._id,
                ownerType: "USER",
                currency: "NGN",
                balance: 0,
                status: "ACTIVE"
            }], { session });

            wallet = wallet[0]; // create() with session returns an array
        }

        const balanceBefore = wallet.balance;

        wallet.credit(amount);

        await wallet.save({ session });

        await Ledger.create([{
            wallet: wallet._id,

            payment: payment?._id || null,

            order: order?._id || null,

            refund: refund?._id || null,

            type: "CREDIT",

            category,

            amount,

            currency: wallet.currency,

            balanceBefore,

            balanceAfter: wallet.balance,

            reference,

            description,

            status: "COMPLETED",

            metadata
        }], { session });

        return wallet;
    }

    /**
     * Debit User Wallet
     */
    static async debitUserWallet({
        userId,
        payment = null,
        order = null,
        refund = null,
        amount,
        category,
        reference,
        description,
        metadata = {},
        session
    }) {

        const wallet = await Wallet.findOne({
            owner: userId,
            ownerType: "USER",
            status: "ACTIVE"
        }).session(session);

        if (!wallet) {
            throw new Error("User wallet not found.");
        }

        if (wallet.balance < amount) {
            throw new Error("Insufficient wallet balance.");
        }

        const balanceBefore = wallet.balance;

        wallet.debit(amount);

        await wallet.save({ session });

        await Ledger.create([{
            wallet: wallet._id,

            payment: payment?._id || null,

            order: order?._id || null,

            refund: refund?._id || null,

            type: "DEBIT",

            category,

            amount,

            currency: wallet.currency,

            balanceBefore,

            balanceAfter: wallet.balance,

            reference,

            description,

            status: "COMPLETED",

            metadata
        }], { session });

        return wallet;
    }

    static async getWalletDashboard(userId) {

        const wallet = await Wallet.findOne({
            owner: userId,
            ownerType: "USER"
        });

        if (!wallet) {
            throw new Error("Wallet not found");
        }

        const summary = await Ledger.aggregate([

            {
                $match: {
                    wallet: wallet._id,
                    status: "COMPLETED"
                }
            },

            {
                $group: {

                    _id: null,

                    totalCredit: {
                        $sum: {
                            $cond: [
                                { $eq: ["$type", "CREDIT"] },
                                "$amount",
                                0
                            ]
                        }
                    },

                    totalWithdrawal: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$type", "DEBIT"] },
                                        { $eq: ["$category", "PAYOUT_REQUEST"] }
                                    ]
                                },
                                "$amount",
                                0
                            ]
                        }
                    },

                    totalEscrow: {
                        $sum: {
                            $cond: [
                                {
                                    $eq: [
                                        "$category",
                                        "ESCROW_DEPOSIT"
                                    ]
                                },
                                "$amount",
                                0
                            ]
                        }
                    },

                    totalRefund: {
                        $sum: {
                            $cond: [
                                {
                                    $eq: [
                                        "$category",
                                        "ESCROW_REFUND"
                                    ]
                                },
                                "$amount",
                                0
                            ]
                        }
                    }

                }
            }

        ]);

        const transactions = await Ledger.find({
            wallet: wallet._id
        })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate("payment")
            .populate({
                    path: "order",
                    populate: {
                        path: "property",
                        select: "title slug type purpose pricing media.images"
                    }
                });
            

        return {

            wallet,

            summary: summary[0] || {
                totalCredit: 0,
                totalWithdrawal: 0,
                totalEscrow: 0,
                totalRefund: 0
            },

            transactions

        };

    };

}

export default WalletService;