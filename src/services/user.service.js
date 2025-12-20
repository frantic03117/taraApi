const User = require("../models/Users");
const Counter = require("../models/Counter");

/**
 * Register guest user if not exists
 */
exports.registerGuestUser = async ({
    first_name,
    last_name,
    email,
    mobile,
    country_code = "+91"
}) => {
    // 1️⃣ Check existing user
    let user = await User.findOne({
        $or: [
            email ? { email } : null,
            mobile ? { mobile } : null
        ].filter(Boolean),
        is_deleted: false
    });

    if (user) return user;

    // 2️⃣ Get next request_id (atomic)
    const counter = await Counter.findOneAndUpdate(
        { key: "user_request_id" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    // 3️⃣ Create new user
    user = await User.create({
        request_id: counter.seq,
        first_name,
        last_name,
        email,
        mobile,
        country_code,
        role: "User",
        is_verified: false
    });

    return user;
};
