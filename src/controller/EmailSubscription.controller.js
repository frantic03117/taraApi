const EmailSubscription = require("../models/EmailSubscription");

exports.createSubscription = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email address"
            });
        }

        const existing = await EmailSubscription.findOne({ email });
        if (existing) {
            if (existing.isActive) {
                return res.status(409).json({
                    success: false,
                    message: "Email already subscribed"
                });
            } else {
                await EmailSubscription.findOneAndUpdate({ _id: existing._id }, { $set: { isActive: true } });
            }
        }

        await Subscription.create({ email });

        return res.status(201).json({
            success: true,
            message: "Subscribed successfully"
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.listSubscriptions = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            isActive,
            search,
            sortBy = "createdAt",
            order = "desc"
        } = req.query;

        // Build filter object
        const filter = {};

        if (isActive !== undefined) {
            filter.isActive = isActive === "true";
        }

        if (search) {
            filter.email = { $regex: search, $options: "i" };
        }

        // Pagination calculations
        const skip = (Number(page) - 1) * Number(limit);

        // Query
        const [subscriptions, total] = await Promise.all([
            EmailSubscription.find(filter)
                .sort({ [sortBy]: order === "asc" ? 1 : -1 })
                .skip(skip)
                .limit(Number(limit)),
            EmailSubscription.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            data: subscriptions,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
