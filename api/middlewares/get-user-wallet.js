const jwt = require("jsonwebtoken");
const userService = require("../services/user");
let userServiceInstance = new userService();
let config = require("../../config/config");
let constants = require("../../config/constants");

async function getUserWallet(req, res) {
    var accessToken = req.headers["x-access-token"] || req.headers.authorization && req.headers.authorization.split(' ')[1];
  
    if (!accessToken) {
      return res
      .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
      .json({ message: "This NFT is not available." });
    }
    let userWallet;
    jwt.verify(accessToken, config.secret, async (err, decoded) => {
      if (err) {
        return res
        .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
        .json({ message: "This NFT is not available." });
      }
      if (!decoded.username) {
        let user = await userServiceInstance.getUser(decoded);
        if (!user) {
          return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "This NFT is not available." });
        }
        userWallet = decoded.userWallet;
      }
    })
  
    return userWallet;
  }
  
  module.exports = getUserWallet;