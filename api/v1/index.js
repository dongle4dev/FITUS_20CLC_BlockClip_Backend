const express = require("express");
const router = express.Router();
const users = require("./users");

/**
 * Routes
 */
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
});
router.use("/users", users);

module.exports = router;
