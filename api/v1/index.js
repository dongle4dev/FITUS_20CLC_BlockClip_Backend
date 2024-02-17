const express = require("express");
const router = express.Router();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const users = require("./users");
const collections = require("./collections");
const orders = require("./market-orders");
const tokens = require("./tokens");
const friends = require("./friends");
const chats = require("./chats");
const messages = require("./messages");
const path = require("path");

/**
 * Routes
 */
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
});

router.use('/api-docs', swaggerUi.serve);
router.get('/api-docs', swaggerUi.setup(swaggerDocument));
router.use("/users", users);
router.use("/collections", collections);
router.use("/tokens", tokens);
router.use("/orders", orders);
router.use("/friends", friends);
router.use("/chats", chats);
router.use("/messages", messages);

module.exports = router;
