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
        const shipmentDetails = await axios.get(
            `https://apiv2.shiprocket.in/v1/external/shipments/${shipment_id}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (shipmentDetails.data.awb) {
            return res.status(400).json({
                data: shipmentDetails.data,
                success: false,
                message: "Shipment cannot be reassigned"
            });
        }

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
        const awbresponse = resp.data;
        if (awbresponse.awb_assign_status == 1) {
            // Save AWB in order
            await Order.findOneAndUpdate(
                { order_id },
                {
                    courier: resp.data,
                    tracking_id: resp.data.awb_code,
                    courier_name: resp.data.courier_name,
                }
            );

            res.json({
                success: true,
                data: resp.data
            });
        } else {
            res.json({
                success: false,
                data: resp.data
            });
        }


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
        const { shipment_id, reason } = req.body;
        const token = await getShiprocketToken();

        // Step 1: Verify shipment exists
        const showResp = await axios.get(
            `https://apiv2.shiprocket.in/v1/external/orders/show/${shipment_id}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!showResp.data || !showResp.data.id) {
            return res.status(400).json({
                success: false,
                message: "Shipment does not exist in Shiprocket"
            });
        }

        // Step 2: Cancel
        const cancelResp = await axios.post(
            "https://apiv2.shiprocket.in/v1/external/orders/cancel",
            { ids: [Number(shipment_id)] },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        // Step 3: Update local DB
        await Order.findOneAndUpdate(
            { shipment_id },
            {
                order_status: "CANCELLED",
                cancelled_at: new Date(),
                cancel_reason: reason
            }
        );

        res.json({ success: true, data: cancelResp.data });
    } catch (error) {
        console.error(error?.response?.data || error);
        res.status(500).json({
            success: false,
            message: "Shipment cancellation failed",
            error: error?.response?.data
        });
    }
};

exports.safeCancelOrder = async (req, res) => {
    try {
        const { order_id, reason } = req.body;

        // 1️⃣ Fetch order from your DB
        const order = await Order.findOne({ order_id });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // 2️⃣ Check if shipment_id exists
        if (!order.shipping_response.shipment_id) {
            // Shipment not created yet → mark as cancelled internally
            order.order_status = "CANCELLED";
            order.cancelled_at = new Date();
            order.cancel_reason = reason || "Cancelled before shipment creation";
            await order.save();

            return res.json({
                success: true,
                message: "Order cancelled internally. No shipment existed in Shiprocket.",
                data: order
            });
        }

        // 3️⃣ If shipment exists, check status in Shiprocket
        const token = await getShiprocketToken();
        let shipResp;
        try {
            shipResp = await axios.get(
                `https://apiv2.shiprocket.in/v1/external/orders/show/${order.shipment_id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (err) {
            // Shipment not found in Shiprocket
            order.order_status = "CANCELLED";
            order.cancelled_at = new Date();
            order.cancel_reason = reason || "Shipment not found in Shiprocket";
            await order.save();

            return res.json({
                success: true,
                message: "Order cancelled internally. Shipment does not exist in Shiprocket.",
                data: order
            });
        }
        shipResp = await axios.get(
            `https://apiv2.shiprocket.in/v1/external/orders/show/${order.shipping_response.shipment_id}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        // 4️⃣ Check shipment status
        const status = shipResp.data.status || shipResp.data.shipment_status;
        if (status && ["Created", "Pending"].includes(status)) {
            // ✅ Can cancel
            const cancelResp = await axios.post(
                "https://apiv2.shiprocket.in/v1/external/orders/cancel",
                { ids: [order.shipping_response.shipment_id] },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            order.order_status = "CANCELLED";
            order.cancelled_at = new Date();
            order.cancel_reason = reason || "Cancelled via Shiprocket API";
            await order.save();

            return res.json({
                success: true,
                message: "Order cancelled successfully via Shiprocket",
                data: cancelResp.data
            });
        } else {
            // ❌ Courier assigned or shipment in transit → cannot cancel via Shiprocket
            order.order_status = "CANCELLED_PENDING";
            order.cancelled_at = new Date();
            order.cancel_reason = reason || "Cannot cancel after courier assignment";
            await order.save();

            return res.json({
                success: false,
                message:
                    "Order marked as cancelled internally. Cannot cancel via Shiprocket (courier assigned or in transit).",
                data: order
            });
        }
    } catch (error) {
        console.error(error?.response?.data || error);
        return res.status(500).json({
            success: false,
            message: "Cancellation failed",
            error: error?.response?.data || error.message
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
            shipment_id: { $ne: null }
        }).select('shipment_id').lean()

        if (!orders.length) {
            return res.status(400).json({
                success: false,
                message: 'No valid shipments found'
            });
        }

        const shipmentIds = orders.map(o => o.shipment_id);

        const resp = await axios.post(
            'https://apiv2.shiprocket.in/v1/external/courier/generate/label',
            { shipment_id: shipmentIds },
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        const updated = await Order.updateMany(
            { order_id: { $in: order_ids } },
            { $set: { label_url: resp.data } }
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


