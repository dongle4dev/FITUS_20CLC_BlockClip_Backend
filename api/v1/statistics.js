const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const TokenService = require("../services/token");
const tokenServiceInstance = new TokenService();
const userService = require("../services/user");
let userServiceInstance = new userService();
let constants = require("../../config/constants");
const helper = require("../utils/helper");
const upload = require("../utils/upload");
const validate = require("../utils/helper");
const verifyToken = require("../middlewares/verify-token");
const jwt = require("jsonwebtoken");
const auth = require("../utils/auth");
const config = require("../../config/config");
let requestUtil = require("../utils/request-utils");
const MarketOrderService = require("../services/market-order");
let marketOrderServiceInstance = new MarketOrderService();
const packageService = require("../services/package");
let packageServiceInstance = new packageService();
const collectionService = require("../services/collection");
let collectionServiceInstance = new collectionService();

router.get("/user", verifyToken, async (req, res) => {
  try {
    const type = requestUtil.getKeyword(req.query, "type");
    const from = requestUtil.getKeyword(req.query, "from");
    const to = requestUtil.getKeyword(req.query, "to");
  
    if (!from) {
      return res
        .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
        .json({ message: constants.MESSAGES.INVALID_REQUEST });
    }

    let data = await userServiceInstance.getUsersByTime(type, from, to);
    if (data) {
      return res
        .status(constants.RESPONSE_STATUS_CODES.OK)
        .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: data });
    }
  } catch {
    return res
      .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
  
  }
});

router.get("/token", verifyToken, async (req, res) => {
  try {
    const type = requestUtil.getKeyword(req.query, "type");
    const from = requestUtil.getKeyword(req.query, "from");
    const to = requestUtil.getKeyword(req.query, "to");
  
    if (!from) {
      return res
        .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
        .json({ message: constants.MESSAGES.INVALID_REQUEST });
    }

    let data = await tokenServiceInstance.getTokensByTime(type, from, to);
    if (data) {
      return res
        .status(constants.RESPONSE_STATUS_CODES.OK)
        .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: data });
    }
  } catch {
    return res
      .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

router.get("/revenue", verifyToken, async (req, res) => {
  try {
    const type = requestUtil.getKeyword(req.query, "type");
    const from = requestUtil.getKeyword(req.query, "from");
    const to = requestUtil.getKeyword(req.query, "to");
    const payment = requestUtil.getKeyword(req.query, "payment");
  
    if (!from) {
      return res
        .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
        .json({ message: constants.MESSAGES.INVALID_REQUEST });
    }
    let btc_price = await helper.getRate("Bitcoin");
    let eth_price = await helper.getRate("Ethereum");
    
    let priceRate = 1;
    
    if (payment === constants.PAYMENT_TYPE.BTC) {
      priceRate = await parseFloat(btc_price)/parseFloat(eth_price);
    } else if (payment === constants.PAYMENT_TYPE.ETH) {
      priceRate = await parseFloat(eth_price)/parseFloat(btc_price);
    }
    
    const packageRevenue = await packageServiceInstance.getRevenueByTime(type, from, to, payment, priceRate);
    const orderRevenue = await marketOrderServiceInstance.getRevenueByTime(type, from, to, payment, priceRate);

    return res
      .status(constants.RESPONSE_STATUS_CODES.OK)
      .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: { packageRevenue, orderRevenue } });
  } catch {
    return res
      .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

router.get("/newSubscriber", verifyToken, async (req, res) => {
  try {
    const type = requestUtil.getKeyword(req.query, "type");
    const from = requestUtil.getKeyword(req.query, "from");
    const to = requestUtil.getKeyword(req.query, "to");
  
    if (!from) {
      return res
        .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
        .json({ message: constants.MESSAGES.INVALID_REQUEST });
    }

    let data = await packageServiceInstance.getSubscribersByTime(type, from, to);
    if (data) {
      return res
        .status(constants.RESPONSE_STATUS_CODES.OK)
        .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: data });
    }
  } catch (err) {
    console.log(err);
    return res
      .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

module.exports = router;