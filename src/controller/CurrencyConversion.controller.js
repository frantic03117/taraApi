const ConversionRateModel = require("../models/ConversionRate.model");
const { fetchCurrencies } = require("../services/convertsion.service");

exports.saveConversionRate = async (req, res) => {
    try {
        const { currency } = req.body;

        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

        // Get latest updated record
        const latestRate = await ConversionRateModel
            .findOne({})
            .sort({ updatedAt: -1 });

        // Decide if we need to fetch
        const shouldFetch =
            !latestRate || latestRate.updatedAt < twelveHoursAgo;

        if (shouldFetch) {
            const rates = await fetchCurrencies();
            const bulkOps = rates.map((item) => ({
                updateOne: {
                    filter: { currency: item.currency },
                    update: {
                        $set: {
                            rate: item.rate,
                            updatedAt: new Date()
                        }
                    },
                    upsert: true
                }
            }));

            await ConversionRateModel.bulkWrite(bulkOps);
        }

        // Always serve from DB
        const rate = await ConversionRateModel.findOne({ currency });

        return res.json({
            success: 1,
            data: rate
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: 0,
            message: error.message
        });
    }
};
