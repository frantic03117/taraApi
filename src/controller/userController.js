const Users = require("../models/Users");
const OtpModel = require('../models/Otp');
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../contants");
exports.send_otp = async (req, res) => {
    try {
        const mobile = req.body.mobile;
        const country_code = req.body.country_code;
        if (!mobile) {
            return res.json({ success: 0, errors: "Mobile is invalid", data: null })
        }
        if (!country_code) {
            return res.json({ success: 0, errors: "country code is invalid", data: null })
        }
        const checkmobile = await Users.findOne({ country_code: country_code, mobile: mobile });

        if (checkmobile) {
            if (['Admin'].includes(checkmobile.role)) {
                return res.json({
                    errors: [{ 'message': 'Otp login  available to Users only' }],
                    success: 0,
                    checkmobile,
                    data: [],
                    message: 'Otp login  available to Users only'
                })
            }
            if (checkmobile?.is_deleted) {
                return res.status(404).json({ success: 0, data: null, message: 'User Account deleted' });
            }
        }
        const otp = ['8888888888', '9999999999'].includes(mobile.toString()) ? '8888' : Math.floor(1000 + Math.random() * 9000);
        await OtpModel.deleteMany({ country_code: country_code, mobile: mobile });
        const item = await OtpModel.create({ country_code: country_code, mobile: mobile, otp: otp });
        // send_otp_mobile(mobile, otp)
        return res.json({
            errors: [],
            success: 1,
            user: checkmobile,
            data: otp,
            message: "Otp Send to Your Mobile Sucessfully."
        });
    } catch (err) {
        return res.json({
            errors: [{ 'message': err.message }],
            success: 0,
            data: [],
            message: err.message
        })
    }
}
exports.verify_otp = async (req, res) => {
    try {
        const { country_code, mobile, otp } = req.body;
        const fields = ['mobile', 'otp', 'country_code'];
        const emptyFields = fields.filter(field => !req.body[field]);
        if (emptyFields.length > 0) {
            return res.json({ success: 0, errors: 'The following fields are required:', fields: emptyFields });
        }
        const item = await OtpModel.findOne({ country_code, mobile: mobile, otp: otp, is_verified: false });
        if (item) {
            await OtpModel.updateOne({ country_code, mobile: mobile }, { $set: { is_verified: true } });
            let token = "";
            const userExists = await Users.findOne({ country_code, mobile: mobile });
            if (userExists) {
                if (userExists?.is_deleted) {
                    return res.json({ data: [], success: 0, message: 'Account deleted' })
                }
                const tokenuser = {
                    _id: userExists._id,
                }
                token = jwt.sign({ user: tokenuser }, SECRET_KEY, { expiresIn: "30 days" });

                await Users.findOneAndUpdate({ _id: userExists._id }, { $set: { jwt_token: token } });

            }
            return res.json({
                data: token,
                verification_id: item._id,
                is_exists: userExists ? true : false,
                success: 1,
                errors: [],
                message: userExists ? "Login Successfully" : "Otp Verified successfully"
            })
        } else {
            return res.json({
                data: null,
                is_exists: false,
                success: 0,
                errors: [{ message: "Invalid Otp" }],
                message: "Invalid otp"
            })
        }
    } catch (err) {
        return res.json({
            errors: [{ 'message': err.message }],
            success: 0,
            data: [],
            message: err.message
        })
    }
}
exports.update_profile = async (req, res) => {
    try {
        const id = req.params.id ?? req.user._id;
        const data = {
            ...req.body
        }
        if (req.files?.profile_image) {
            data['profile_image'] = req.files.profile_image[0].path
        }
        const userdata = await Users.findOneAndUpdate({ _id: id }, { $set: data }, { new: true });
        return res.json({
            data: userdata,
            success: 1,
            errors: [],
            message: "User created successfully"
        });

    } catch (err) {
        return res.json({
            errors: [{ 'message': err.message }],
            success: 0,
            data: [],
            message: err.message
        })
    }
}
exports.user_list = async (req, res) => {
    try {
        // const data = {
        //     first_name: "Admin",
        //     last_name: "Tara",
        //     email: "admin@tara.com",
        //     country_code: "+91",
        //     mobile: 9090909090,
        //     role: "Admin",
        //     password: "Admin@2025#",
        //     is_verified: true
        // }
        const user = await Users.findOneAndUpdate(
            { email: data.email },    // search by unique email
            { $set: data },           // update these fields
            { new: true, upsert: true } // create if not exists
        );
        const fdata = {
            role: { $nin: ["Admin", "Employee"] },
            is_deleted: false
        };

        const {
            type,
            keyword,
            exportdata,
            status,
            id,
            url,
            longitude,
            latitude,
            maxDistance = 5000,
            page = 1,
            perPage = 10,
            sort = "updatedAt",
            order,
            name,
            email,
            mobile,
            createdFrom,
            createdTo,

        } = req.query;

        if (longitude && latitude) {
            fdata["coordinates"] = {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(longitude), parseFloat(latitude)],
                    },
                    $maxDistance: parseInt(maxDistance),
                },
            };
        }

        const skip = (page - 1) * perPage;

        if (type) {
            fdata["role"] = { $regex: type, $options: "i" };
        }

        if (id) {
            fdata["_id"] = new mongoose.Types.ObjectId(id);
        }

        if (url) {
            fdata["slug"] = url;
        }

        if (req.user) {
            if (req.user.role == "User") {
                fdata["_id"] = req.user._id;
            }
        }

        if (keyword) {
            fdata["$or"] = [
                { first_name: { $regex: keyword, $options: "i" } },
                { last_name: { $regex: keyword, $options: "i" } },
                { email: { $regex: keyword, $options: "i" } },
                { mobile: { $regex: keyword, $options: "i" } },
            ];
            if (type?.toLowerCase() == "user") {
                delete fdata.clinic;
            }
        }

        // 🔹 Extra filters from Drawer
        if (name) {
            fdata["first_name"] = { $regex: name, $options: "i" };
        }
        if (email) {
            fdata["email"] = { $regex: email, $options: "i" };
        }
        if (mobile) {
            fdata["mobile"] = { $regex: mobile, $options: "i" };
        }
        if (createdFrom || createdTo) {
            fdata["createdAt"] = {};
            if (createdFrom) {
                fdata["createdAt"]["$gte"] = new Date(createdFrom);
            }
            if (createdTo) {
                fdata["createdAt"]["$lte"] = new Date(createdTo);
            }
        }
        const resp = await Users.aggregate([
            { $match: fdata },
            { $sort: { created_at: -1 } },
            { $skip: skip },
            { $limit: parseInt(perPage) },
        ]);

        const totaldocs = await Users.countDocuments(fdata);
        const totalPage = Math.ceil(totaldocs / perPage);
        const pagination = {
            page: parseInt(page),
            perPage: parseInt(perPage),
            totalPages: totalPage,
            totalDocs: totaldocs,
        };

        return res.json({
            success: 1,
            message: "list of users",
            data: (req.user && req.user.role == "User") ? resp[0] : resp,
            pagination,
            fdata,
        });
    } catch (err) {
        return res.json({
            errors: [{ message: err.message }],
            success: 0,
            data: [],
            message: err.message,
        });
    }
};
exports.store_profile = async (req, res) => {
    try {
        const requiredFields = ['country_code', 'mobile', 'first_name'];
        const emptyFields = requiredFields.filter(field => !req.body[field]);
        if (emptyFields.length > 0) {
            return res.json({
                success: 0,
                message: 'The following fields are required: ' + emptyFields.join(', '),
                fields: emptyFields
            });
        }
        const { first_name, email, country_code, mobile, role = "User" } = req.body;
        const isOtpVerified = await OtpModel.findOne({ country_code, mobile, is_verified: true });
        if (!isOtpVerified) {
            return res.json({
                errors: [{ message: "Mobile Number is not verified" }],
                success: 0,
                data: [],
                message: "Mobile Number is not verified. Please verify first."
            });
        }
        const isMobileExists = await Users.findOne({ country_code, mobile });
        if (isMobileExists) {
            return res.json({
                errors: [{ message: "Mobile is already in use" }],
                success: 0,
                data: [],
                message: "Mobile is already in use"
            });
        }

        const lastRequest = await Users.findOne({ role }).sort({ request_id: -1 });
        const new_request_id = lastRequest ? lastRequest.request_id + 1 : 1;
        const prefix = role === "User" ? 'USER' : 'LETSMOVE';
        const data = {
            ...req.body,

            request_id: new_request_id,
            custom_request_id: prefix + String(new_request_id).padStart(10, '0'),
            first_name,
            country_code,
            mobile,
            role,
            mode: req.body.mode ? JSON.parse(req.body.mode) : null
        };


        if (email) {
            data['email'] = email.toLowerCase();
        }

        // Handle file uploads
        if (req.files) {
            const fileFields = [
                'profile_image', 'registration_certificate', 'graduation_certificate',
                'post_graduation_certificate', 'mci_certificate', 'aadhaar_front',
                'aadhaar_back', 'pan_image'
            ];
            fileFields.forEach(field => {
                if (req.files[field]) data[field] = req.files[field][0].path;
            });
        }
        const resp = await Users.create(data);
        const token = jwt.sign({ user: { _id: resp._id } }, SECRET_KEY, { expiresIn: "1d" });
        return res.json({ success: 1, token, message: "User created successfully", data: resp });
    } catch (err) {
        return res.json({
            errors: [{ message: err.message }],
            success: 0,
            data: [],
            message: err.message
        });
    }
};
exports.admin_login = async (req, res) => {
    try {
        const fields = ['password', 'email'];
        const emptyFields = fields.filter(field => !req.body[field]);
        if (emptyFields.length > 0) {
            return res.json({ success: 0, message: 'The following fields are required:' + emptyFields.join(','), fields: emptyFields });
        }
        const { email, password } = req.body;
        const fdata = {
            email: email,
            password: password,
        }
        const userfind = await Users.findOne(fdata);
        if (!userfind) {
            return res.json({ success: 0, message: "Invalid credentials", data: null });
        }
        const tokenuser = {
            _id: userfind._id,
        }
        const token = userfind ? jwt.sign({ user: tokenuser }, SECRET_KEY) : ""
        return res.json({ success: 1, message: 'Login successfully', data: token });
    } catch (err) {
        return res.json({ success: 0, message: err.message });
    }
}
exports.my_profile = async (req, res) => {
    const user_id = req.user._id;
    const userfind = await Users.findOne({ _id: user_id });
    return res.json({ data: userfind, success: 1, message: "Profile" })
}
exports.delete_user = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: 0, message: "User ID is required" });
        }

        // Find the user first
        const user = await Users.findById(id);
        if (!user) {
            return res.status(404).json({ success: 0, message: "User not found" });
        }

        // Soft delete: move email & mobile to deleted_user and mark is_deleted
        const resp = await Users.findByIdAndUpdate(
            id,
            {
                $set: {
                    is_deleted: true,

                    email: "deleted_".user?.email,   // remove original fields
                    mobile: "deleted_".user?.mobile
                }
            },
            { new: true }
        );

        return res.json({
            success: 1,
            message: "User deleted successfully",
            data: resp
        });
    } catch (err) {
        return res.status(500).json({ success: 0, message: err.message });
    }
};