import { ESCROW_RULES } from "./OrderStatusRules.js";

class OrderStatusService {

    /*-------------------------------------------------------
    Determine who is performing the action
    -------------------------------------------------------*/
    static getActor(order, user) {

        try {

            if (user.roles === "Admin") {
                return "admin";
            }
            if (order.buyer.equals(user._id)) {
                return "buyer";
            }

            if (order.seller.equals(user._id)) {
                return "seller";
            }

            if (user.roles === "Admin") {
                return "admin";
            }

            return null;
        } catch (error) {
            throw new Error(error);
        }
    }

    /*-------------------------------------------------------
    Change Escrow Status
    -------------------------------------------------------*/
    static async changeStatus({ order, action, user, reason, session }) {
        try {

            console.log(reason,'reasondd');
            
            /*------------------------------------
            Current Escrow State
            ------------------------------------*/

            const state = ESCROW_RULES[order.escrowStatus];

            if (!state) {
                throw new Error(
                    `Unknown escrow status '${order.escrowStatus}'.`
                );
            }
           

            /*------------------------------------
            Action Rule
            ------------------------------------*/

            const rule = state.actions[action];
          
            if (!rule) {
                throw new Error(
                    `Action '${action}' is not allowed while escrow is '${order.escrowStatus}'.`
                );
            }

            /*------------------------------------
            Determine Actor
            ------------------------------------*/

            const actor = this.getActor(order, user, reason);
            console.log(actor, "actor");

            if (!actor) {
                throw new Error(
                    "You are not part of this order."
                );
            }

            /*------------------------------------
            Permission
            ------------------------------------*/

            if (!rule.roles.includes(actor)) {
                throw new Error(
                    `${actor} cannot perform '${action}'.`
                );
            }

            /*------------------------------------
            Validation
            ------------------------------------*/

            if (typeof rule.validate === "function") {

                await rule.validate({ order });
                console.log('validate other suvive', 'ffff');

            }

            /*------------------------------------
            Change Escrow Status
            ------------------------------------*/

            const nextStatus =
                typeof rule.to === "function"
                    ? rule.to({ order })
                    : rule.to;

            order.escrowStatus = nextStatus;

            /*------------------------------------
            Execute Business Logic
            ------------------------------------*/

            if (typeof rule.execute === "function") {

                await rule.execute({
                    reason,
                    order,
                    user,
                    actor,
                    session

                });
                console.log(' execute', 'ffff');
            }

            /*------------------------------------
            Save Changes
            ------------------------------------*/

            await order.save({ session });

            console.log(order);
            
            return order;
        } catch (error) {

            throw new Error(error);


        }
    }

}

export default OrderStatusService;