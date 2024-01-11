const jwt = require("jsonwebtoken");
const userService = require("../services/user");
let userServiceInstance = new userService();
let config = require("../../config/config");
let constants = require("../../config/constants");

async function verifyToken(req, res, next) {
  try {
    var token = req.headers["x-access-token"] || req.headers.authorization && req.headers.authorization.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: constants.MESSAGES.UNAUTHORIZED });
    }

    jwt.verify(token, config.secret, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: constants.MESSAGES.UNAUTHORIZED });
      }
      if (!decoded.username) {
        let user = await userServiceInstance.getUser(decoded);
        if (!user) {
          return res
            .status(401)
            .json({ message: constants.MESSAGES.UNAUTHORIZED });
        }
        req.userWallet = decoded.userWallet;
      }

      next();
    });
  }
  catch (err) {
    next(err);
  }
}

module.exports = verifyToken;
