const jwt = require("jsonwebtoken");

const { SECRET_KEY } = require("../contants");
const Users = require("../models/Users");

require("dotenv").config();

/**
 * Middleware for verifying JWT and (optionally) user roles.
 * @param {...string} allowedRoles - roles that can access this route.
 */
function Auth(...allowedRoles) {
    return async (req, res, next) => {
        const authorization = req.headers.authorization;

        if (!authorization) {
            return res.status(401).json({ success: 0, message: "No Authorization Header" });
        }

        try {
            // Expect "Bearer <token>"
            const token = authorization.startsWith("Bearer ")
                ? authorization.split("Bearer ")[1]
                : null;

            if (!token) {
                return res.status(401).json({ success: 0, message: "Invalid Token Format" });
            }

            // Decode & verify token
            const decoded = jwt.verify(token, SECRET_KEY);
            const ruser = decoded.user;
            console.log("Decoded User from Token:", ruser);
            const user = await Users.findById(ruser._id);

            if (!user) {
                return res.status(404).json({ success: 0, message: "User not found" });
            }

            if (user.is_deleted) {
                return res.status(403).json({ success: 0, message: "User account deleted" });
            }

            const normalizedUserRole = (user.role || "").toLowerCase();
            const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());

            // ✅ If specific roles are required
            if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(normalizedUserRole)) {
                return res.status(403).json({
                    success: 0,
                    message: `Access denied. Role "${user.role}" not permitted.`,
                });
            }


            req.user = user;
            next();
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                return res.status(401).json({ success: 0, message: "Session expired" });
            }
            if (error instanceof jwt.JsonWebTokenError) {
                return res.status(401).json({ success: 0, message: "Invalid token" });
            }

            return res.status(500).json({
                success: 0,
                message: "Internal server error",
                error: error.message,
            });
        }
    };
}

module.exports = { Auth };
