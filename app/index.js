const express = require('express')
const app = express();
const https = require('https');
const fs = require('fs');
const path = require('path');
const options = {
    key: fs.readFileSync('./ssl/private.pem'),
    cert: fs.readFileSync('./ssl/certificate.pem')
}
const server = https.createServer(options, app);
module.exports = { app, server }