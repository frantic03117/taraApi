const fetchCurrencies = async () => {
    try {
        const response = await fetch(
            "https://api.freecurrencyapi.com/v1/latest?apikey=" +
            process.env.CURRENCY_API_KEY
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        return Object.entries(data.data).map(
            ([currency, rate]) => ({
                currency,
                rate,
            })
        );
    } catch (err) {
        console.error("Currency API failed", err);
        throw err;
    }
};

module.exports = {
    fetchCurrencies,
};
