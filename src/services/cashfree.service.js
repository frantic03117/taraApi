const { Cashfree, CFEnvironment } = require("cashfree-pg");
const {
    CASHFREE_ENV,
    CASHFREE_APP_ID,
    CASHFREE_SECRET_KEY
} = require("../contants");

const cashfree = new Cashfree(
    CASHFREE_ENV === "production"
        ? CFEnvironment.PRODUCTION
        : CFEnvironment.SANDBOX,
    CASHFREE_APP_ID,
    CASHFREE_SECRET_KEY
);
exports.createCashfreeOrder = async ({
    order_id,
    amount,
    customer,
    return_url
}) => {
    try {
        const request = {
            order_id,
            order_amount: amount,
            order_currency: "INR",
            customer_details: {
                customer_id: customer.customer_id.toString(), // 🔥 FIX
                customer_name: customer.name,                 // 🔥 FIX
                customer_phone: customer.phone,
                customer_email: customer.email
            },
            order_meta: {
                return_url
            }
        };

        const response = await cashfree.PGCreateOrder(request);
        return response.data;
    } catch (error) {
        console.error(error.response?.data || error);
        throw new Error("Cashfree order creation failed");
    }
};
