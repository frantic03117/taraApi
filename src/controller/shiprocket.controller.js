const axios = require("axios");
const { getShiprocketToken } = require("../services/shiprocket.service");
const Order = require("../models/Order");

exports.createShipment = async (req, res) => {
    try {
        const token = await getShiprocketToken();

        const shiprocketResp = await axios.post(
            "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
            req.body,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        // Save tracking info in DB
        await Order.findOneAndUpdate(
            { order_id: req.body.order_id },
            {
                shipping_request: req.body,
                shipping_response: shiprocketResp.data,
                shipment_id: shiprocketResp.data.shipment_id,
                courier_name: shiprocketResp.data.courier_name,
                order_status: "SHIPPED",
                shipped_at: new Date()
            }
        );

        res.json({
            success: true,
            data: shiprocketResp.data
        });

    } catch (error) {
        console.error(error?.response?.data || error);
        res.status(500).json({
            success: false,
            message: "Shiprocket order creation failed",
            error: error?.response?.data
        });
    }
};
exports.generateAWB = async (req, res) => {
    try {
        const { shipment_id, courier_id, order_id } = req.body;

        const token = await getShiprocketToken();

        const resp = await axios.post(
            "https://apiv2.shiprocket.in/v1/external/courier/assign/awb",
            {
                shipment_id,
                courier_id
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        // Save AWB in order
        await Order.findOneAndUpdate(
            { order_id },
            {
                tracking_id: resp.data.awb_code,
                courier_name: resp.data.courier_name,
                order_status: "SHIPPED"
            }
        );

        res.json({
            success: true,
            data: resp.data
        });

    } catch (error) {
        console.error(error?.response?.data || error);
        res.status(500).json({
            success: false,
            message: "AWB generation failed",
            error: error?.response?.data
        });
    }
};

exports.requestPickup = async (req, res) => {
    try {
        const { shipment_id, order_id } = req.body;

        const token = await getShiprocketToken();

        const resp = await axios.post(
            "https://apiv2.shiprocket.in/v1/external/courier/generate/pickup",
            {
                shipment_id: [shipment_id]
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        await Order.findOneAndUpdate(
            { order_id },
            {
                order_status: "SHIPPED",
                shipped_at: new Date()
            }
        );

        res.json({
            success: true,
            data: resp.data
        });

    } catch (error) {
        console.error(error?.response?.data || error);
        res.status(500).json({
            success: false,
            message: "Pickup request failed",
            error: error?.response?.data
        });
    }
};
exports.trackShipment = async (req, res) => {
    try {
        const { shipment_id } = req.params;
        const token = await getShiprocketToken();

        const resp = await axios.get(
            `https://apiv2.shiprocket.in/v1/external/courier/track/shipment/${shipment_id}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        res.json({
            success: true,
            data: resp.data
        });

    } catch (error) {
        console.error(error?.response?.data || error);
        res.status(500).json({
            success: false,
            message: "Tracking failed",
            error: error?.response?.data
        });
    }
};
exports.cancelShipment = async (req, res) => {
    try {
        const { shipment_id, order_id, reason } = req.body;
        const token = await getShiprocketToken();

        const resp = await axios.post(
            "https://apiv2.shiprocket.in/v1/external/orders/cancel",
            {
                ids: [shipment_id]
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        await Order.findOneAndUpdate(
            { order_id },
            {
                order_status: "CANCELLED",
                cancelled_at: new Date(),
                cancel_reason: reason
            }
        );

        res.json({
            success: true,
            data: resp.data
        });

    } catch (error) {
        console.error(error?.response?.data || error);
        res.status(500).json({
            success: false,
            message: "Shipment cancellation failed",
            error: error?.response?.data
        });
    }
};

exports.getBestCourier = async (req, res) => {
    try {
        const {
            pickup_pincode,
            delivery_pincode,
            weight,
            cod
        } = req.query;

        // ───────── Validation ─────────
        if (!pickup_pincode || !delivery_pincode || !weight) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameters"
            });
        }

        const token = await getShiprocketToken();
        console.log(token);
        const resp = await axios.get(
            "https://apiv2.shiprocket.in/v1/external/courier/serviceability",
            {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                params: {
                    pickup_postcode: pickup_pincode,
                    delivery_postcode: delivery_pincode,
                    weight: Number(weight),
                    cod: cod === 'true' || cod === 1 ? 1 : 0
                }
            }
        );

        const couriers =
            resp?.data?.data?.available_courier_companies || [];

        if (!couriers.length) {
            return res.status(404).json({
                success: false,
                message: "No courier available for this route"
            });
        }

        // ───────── Filter bad couriers ─────────
        const filtered = couriers.filter(c =>
            c.rate > 0 &&
            c.estimated_delivery_days &&
            c.rating >= 3
        );

        if (!filtered.length) {
            return res.status(404).json({
                success: false,
                message: "No reliable courier found"
            });
        }

        // ───────── Best courier logic ─────────
        const bestCourier = filtered.sort((a, b) => {
            // 1️⃣ Faster delivery first
            if (a.estimated_delivery_days !== b.estimated_delivery_days) {
                return a.estimated_delivery_days - b.estimated_delivery_days;
            }
            // 2️⃣ Cheaper if same ETA
            return a.rate - b.rate;
        })[0];

        return res.json({
            success: true,
            data: filtered
        });

    } catch (error) {
        console.error("Shiprocket best courier error:", error?.response?.data || error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch best courier"
        });
    }
};


exports.bulkLabelDownload = async (req, res) => {
    try {
        const { order_ids } = req.body;
        const token = await getShiprocketToken();

        // fetch shipment_ids from orders
        const orders = await Order.find({
            order_id: { $in: order_ids },
            tracking_id: { $ne: null }
        });

        if (!orders.length) {
            return res.status(400).json({
                success: false,
                message: 'No valid shipments found'
            });
        }

        const shipmentIds = orders.map(o => o.tracking_id);

        const resp = await axios.post(
            'https://apiv2.shiprocket.in/v1/external/courier/generate/label',
            { shipment_id: shipmentIds },
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        res.json({
            success: true,
            label_url: resp.data.label_url,
            count: shipmentIds.length
        });

    } catch (error) {
        console.error(error?.response?.data || error);
        res.status(500).json({
            success: false,
            message: 'Bulk label generation failed'
        });
    }
};


