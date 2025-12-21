const axios = require("axios");
const { SHIPROCKET_ID, SHIPROCKET_PASSWORD } = require("../contants");

let shiprocketToken = null;
let tokenExpiry = null;

const shiprocketLogin = async () => {
    const resp = await axios.post(
        "https://apiv2.shiprocket.in/v1/external/auth/login",
        {
            email: SHIPROCKET_ID,
            password: SHIPROCKET_PASSWORD
        }
    );

    shiprocketToken = resp.data.token;
    tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000; // 9 days

    return shiprocketToken;
};

const getShiprocketToken = async () => {
    if (!shiprocketToken || Date.now() > tokenExpiry) {
        await shiprocketLogin();
    }
    return shiprocketToken;
};

module.exports = {
    getShiprocketToken
};
