import axios from "axios";


/**
 * Get Paystack Transaction Fee
 */


class PaystackService {

    constructor() {

        this.http = axios.create({

            baseURL: "https://api.paystack.co",

            timeout: 30000,

            headers: {

                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,

                "Content-Type": "application/json"

            }

        });

    }

    /*
    |--------------------------------------------------------------------------
    | Initialize Transaction
    |--------------------------------------------------------------------------
    */

    /**
 * Get Paystack Transaction Fee
 */
    calculatePaystackFee(amount) {
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

    async initializeTransaction({

        email,

        amount,

        reference,

        callback_url,

        currency = "NGN",

        metadata = {}

    }) {

        try {

            // Original amount (Naira)
            const originalAmount = Number(amount);

            // Get Paystack fee
            const paystackFee = this.calculatePaystackFee(originalAmount);

            // Buyer pays this
            const totalWithCharges = originalAmount + paystackFee;

            const { data } = await this.http.post(
                "/transaction/initialize",
                {
                    email,

                    amount: totalWithCharges ,

                    reference,

                    callback_url,

                    currency,
                    metadata: {
                        ...metadata,

                        originalAmount,
                        paystackFee,
                        totalWithCharges
                    }
                }
            );

            return {
                ...data,
                paymentSummary: {
                    originalAmount,
                    paystackFee: paystackFee,
                    totalWithCharges
                }
            };

        } catch (error) {

            console.error(
                "Paystack Initialize Error:",
                error.response?.data || error.message
            );

            throw new Error(
                error.response?.data?.message ||
                "Unable to initialize transaction."
            );

        }

    }

    /*
    |--------------------------------------------------------------------------
    | Verify Transaction
    |--------------------------------------------------------------------------
    */

    async verifyTransaction(reference) {

        try {

            const { data } = await this.http.get(

                `/transaction/verify/${reference}`

            );

            return data;

        } catch (error) {

            console.error(
                "Paystack Verify Error:",
                error.response?.data || error.message
            );

            throw new Error(
                error.response?.data?.message ||
                "Unable to verify transaction."
            );

        }

    }

}

export default new PaystackService();