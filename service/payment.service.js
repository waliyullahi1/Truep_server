// services/payment.service.js

import Payment from "../model/payments.js";
import Propert from "../model/Property.js";
import PropertyOrder from "../model/PropertyOrder.js";
import FlutterwaveService from "./flutterwave.service.js";
import PaystackService from "./paystack.service.js";

import mongoose from "mongoose";
import WalletService from "./WalletService.js";

function generateTransactionRef(orderNumber) {
    const random = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

    return `${orderNumber}-${Date.now()}-${random}`;
}


function calculatePaystackFee(amount) {
    amount = Number(amount);

    let fee = amount * 0.015;

    if (amount >= 2500) {
        fee += 100;
    }

    if (fee > 2000) {
        fee = 2000;
    }

    return Math.round(fee);
}

class PaymentService {


    static async createOrderPayment({ buyer, propertyId, totalPlot, amount }) {

        // Find property
        const property = await Propert.findById(propertyId).populate("userId");

        if (!property) {
            throw new Error("Property not found.");
        }
        console.log(property._id, buyer._id);

        // Existing order
        let order = await PropertyOrder.findOne({
            property: property._id,
            buyer: buyer._id
        });
        console.log(order, 'fff');


        // Buyer payment (Frontend sends Naira)
        const amountToPayKobo = Math.round(Number(amount) * 100);
        console.log(amountToPayKobo);

        let totalAmountKobo = 0;
        let pricePerPlotKobo = null;

        if (!order) {

            if (property.type === "land") {

                if (!totalPlot || totalPlot < 1) {
                    throw new Error("Invalid number of plots.");
                }

                if (totalPlot > property.landDetails.quantity) {
                    throw new Error("Selected plots exceed available plots.");
                }

                pricePerPlotKobo = Math.round(
                    Number(property.pricing.price) * 100
                );

                totalAmountKobo = pricePerPlotKobo * Number(totalPlot);

            } else {

                totalAmountKobo = Math.round(
                    Number(property.pricing.price) * 100
                );

            }

        } else {

            totalAmountKobo = order.totalAmount;
            pricePerPlotKobo = order.pricePerPlot;

        }

        // Prevent over-payment
        if (amountToPayKobo > totalAmountKobo) {
            throw new Error("Payment amount exceeds outstanding balance.");
        }

        const txRef = generateTransactionRef(
            order?.orderNumber || `ORD-${Date.now()}`
        );

        // Initialize Paystack (expects Kobo)
        const response = await PaystackService.initializeTransaction({

            reference: txRef,

            email: buyer.email,

            amount: amountToPayKobo,

            currency: "NGN",

            callback_url:
                `${process.env.FRONTEND_BASE_URL}property/payment/${property.slug}`,

            metadata: {
                title: "Property Purchase",
                description: property.title,
                logo: process.env.APP_LOGO
            }

        });

        const session = await mongoose.startSession();

        try {

            session.startTransaction();

            if (!order) {

                const orders = await PropertyOrder.create([{

                    orderNumber:
                        `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,

                    property: property._id,

                    buyer: buyer._id,

                    seller: property.userId._id,

                    totalPlot: property.type === "land"
                        ? totalPlot
                        : null,

                    pricePerPlot: pricePerPlotKobo,

                    totalAmount: totalAmountKobo,

                    escrowAmount: 0,

                    escrowStatus: "NOT_FUNDED",

                    orderStatus: "PENDING"

                }], { session });

                order = orders[0];

            }

            const payments = await Payment.create([{

                txRef,

                payer: buyer._id,

                receiver: property.userId._id,

                property: property._id,

                order: order._id,

                amount: amountToPayKobo,

                currency: "NGN",

                payment_link: response.data.authorization_url,

                purpose:
                    amountToPayKobo >= totalAmountKobo
                        ? "PROPERTY_BALANCE"
                        : "PROPERTY_DEPOSIT",

                status: "PENDING",

                metadata: {
                    checkoutUrl: response.data.authorization_url
                }

            }], { session });

            await session.commitTransaction();

            return {
                otherDetails: response,
                payment: payments[0],
                order,
                checkoutUrl: response.data.authorization_url
            };

        } catch (err) {

            await session.abortTransaction();
            throw err;

        } finally {

            session.endSession();

        }

    }


    static async verifyOrderPayment(txRef) {
        const session = await mongoose.startSession();

        try {
            await session.startTransaction();

            /*--------------------------------------------------
            Find Payment
            --------------------------------------------------*/
            const payment = await Payment.findOne({ txRef }).session(session);

            if (!payment) {
                throw new Error("Payment not found.");
            }

            // Already verified
            if (payment.status === "SUCCESS") {
                await session.commitTransaction();
                return payment;
            }

            /*--------------------------------------------------
            Verify with Paystack
            --------------------------------------------------*/
            const result = await PaystackService.verifyTransaction(txRef);

            const transaction = result.data;

            if (!transaction || transaction.status !== "success") {
                throw new Error("Payment was not successful.");
            }

            if (transaction.currency !== payment.currency) {
                throw new Error("Currency mismatch.");
            }

            if (transaction.amount < payment.amount) {
                throw new Error("Incorrect payment amount.");
            }

            /*--------------------------------------------------
            Find Order
            --------------------------------------------------*/
            const order = await PropertyOrder.findById(payment.order).session(session);

            if (!order) {
                throw new Error("Order not found.");
            }

            /*--------------------------------------------------
            Calculate Amounts
            --------------------------------------------------*/
            const paidAmount = transaction.amount;
            const gatewayFee = transaction.fees || 0;
            const creditAmount = paidAmount - gatewayFee;

            // Don't allow escrow to exceed total amount
            const remainingBefore = order.totalAmount - order.escrowAmount;

            const escrowCredit = Math.min(creditAmount, remainingBefore);

            /*--------------------------------------------------
            Update Payment
            --------------------------------------------------*/
            payment.status = "SUCCESS";
            payment.paymentStatus = "PAID";
            payment.TransactionId = transaction.id;
            payment.gatewayResponse = transaction.gateway_response;
            payment.channel = transaction.channel;
            payment.authorizationCode =
                transaction.authorization?.authorization_code || null;

            payment.paidAmount = paidAmount;
            payment.gatewayFee = gatewayFee;
            payment.creditAmount = creditAmount;
            payment.paidAt = transaction.paid_at || new Date();

            await payment.save({ session });

            /*--------------------------------------------------
            Credit Platform Wallet
            --------------------------------------------------*/
          const walletresult =  await WalletService.creditPlatformWallet({
                payment,
                order,
                amount: creditAmount,
                transaction,
                session
            });
            
            /*--------------------------------------------------
            Update Order Escrow
            --------------------------------------------------*/
            order.escrowAmount += escrowCredit;

            order.remainingAmount = Math.max(
                order.totalAmount - order.escrowAmount,
                0
            );
 
            if (order.remainingAmount === 0) {
                order.escrowStatus = "FUNDED";
                order.orderStatus = "PAID";
            } else {
                order.escrowStatus = "PARTIALLY_FUNDED";
                order.orderStatus = "PENDING";
            }

            await order.save({ session });
            console.log(walletresult, 'walletresult');
            console.log(order, "orders");

             console.log(payment, 'payment');
         
            /*--------------------------------------------------
            Commit
            --------------------------------------------------*/
            await session.commitTransaction();

            return payment;

        } catch (error) {

            await session.abortTransaction();
            throw error;

        } finally {

            await session.endSession();

        }
    }

}

export default PaymentService;