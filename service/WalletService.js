import Wallet from "../model/Wallet.js";
import Ledger from "../model/Ledger.js";


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

    const wallet = await Wallet.findOne({
        owner: userId,
        ownerType: "USER",
        status: "ACTIVE"
    }).session(session);

    if (!wallet) {
        throw new Error("User wallet not found.");
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

}

export default WalletService;