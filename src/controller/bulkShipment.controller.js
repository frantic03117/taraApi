const XLSX = require('xlsx');
const fs = require('fs');
const axios = require('axios');
const Order = require('../models/Order');
const { getShiprocketToken } = require('../services/shiprocket.service');

exports.bulkShipmentUpload = async (req, res) => {
    try {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rows = XLSX.utils.sheet_to_json(sheet);

        const token = await getShiprocketToken();
        const report = [];

        for (const row of rows) {
            try {
                const order = await Order.findOne({ order_id: row.order_id })
                    .populate('address cart_ids');

                if (!order) {
                    report.push({
                        order_id: row.order_id,
                        status: 'FAILED',
                        reason: 'Order not found'
                    });
                    continue;
                }

                // Create Shipment Payload
                const payload = {
                    order_id: order.order_id,
                    order_date: new Date(order.createdAt).toISOString().split('T')[0],
                    pickup_location: row.pickup_location || 'Primary',

                    billing_customer_name: order.first_name,
                    billing_last_name: order.last_name,
                    billing_address: order.address.address_line,
                    billing_city: order.address.city,
                    billing_pincode: order.address.pincode,
                    billing_state: order.address.state,
                    billing_country: 'India',
                    billing_email: order.email,
                    billing_phone: order.mobile,

                    shipping_is_billing: true,

                    order_items: order.cart_ids.map(item => ({
                        name: item.product_name,
                        sku: item._id,
                        units: item.quantity,
                        selling_price: item.price
                    })),

                    payment_method: order.payment_method === 'COD' ? 'COD' : 'Prepaid',
                    sub_total: order.subtotal,

                    length: row.length,
                    breadth: row.breadth,
                    height: row.height,
                    weight: row.weight
                };

                // 1️⃣ Create Shipment
                const shipmentResp = await axios.post(
                    'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc',
                    payload,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const shipment_id = shipmentResp.data.shipment_id;
                const courier_id = shipmentResp.data.courier_company_id;

                // 2️⃣ Generate AWB
                const awbResp = await axios.post(
                    'https://apiv2.shiprocket.in/v1/external/courier/assign/awb',
                    { shipment_id, courier_id },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                // 3️⃣ Pickup Request
                await axios.post(
                    'https://apiv2.shiprocket.in/v1/external/courier/generate/pickup',
                    { shipment_id: [shipment_id] },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                // Update Order
                await Order.findByIdAndUpdate(order._id, {
                    tracking_id: awbResp.data.awb_code,
                    courier_name: awbResp.data.courier_name,
                    order_status: 'SHIPPED',
                    shipped_at: new Date()
                });

                report.push({
                    order_id: row.order_id,
                    status: 'SUCCESS',
                    awb: awbResp.data.awb_code
                });

            } catch (err) {
                report.push({
                    order_id: row.order_id,
                    status: 'FAILED',
                    reason: err?.response?.data?.message || 'Shiprocket error'
                });
            }
        }

        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            report
        });

    } catch (error) {
        res.status(500).json({ success: false, error });
    }
};
