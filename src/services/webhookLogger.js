const fs = require("fs");
const path = require("path");

const logDir = path.join(__dirname, "../logs");

// ensure logs folder exists
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

exports.logCashfreeWebhook = (data) => {
    const logFile = path.join(
        logDir,
        `cashfree-${new Date().toISOString().split("T")[0]}.log`
    );

    const logEntry = `
==============================
TIME: ${new Date().toISOString()}
PAYLOAD:
${JSON.stringify(data, null, 2)}
==============================

`;

    fs.appendFile(logFile, logEntry, (err) => {
        if (err) console.error("Webhook log error:", err);
    });
};
