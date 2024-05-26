const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
let constants = require("../../config/constants");
const helper = require("../utils/helper");
const upload = require("../utils/upload");
const validate = require("../utils/helper");
const verifyToken = require("../middlewares/verify-token");
const jwt = require("jsonwebtoken");
const auth = require("../utils/auth");
const config = require("../../config/config");
let requestUtil = require("../utils/request-utils");
const ReportService = require("../services/report");
const reportServiceInstance = new ReportService();
const TokenService = require("../services/token");
const tokenServiceInstance = new TokenService();

router.post("/", verifyToken, async (req, res) => {
  try {
    const wallet = req.userWallet;
    const { owner, tokenID, description, status } = req.body;

    if (owner !== "") {
      if (!validate.isValidEthereumAddress(owner)) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "owner address is not valid" });
      }
    }

    if (!tokenID) {
      return res
        .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
        .json({ message: "tokenID is required" });
    } 

    let tokenExists = await tokenServiceInstance.getTokenByTokenID({tokenID});

    if (!tokenExists) {
      return res
        .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
        .json({ message: "token doesnt exist" });
    }

    const report = await reportServiceInstance.createReport({
      wallet,
      owner,
      tokenID,
      description,
      status,
    });

    if (report) {
      return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
        message: constants.RESPONSE_STATUS.SUCCESS,
        data: report,
      });
    }
  } catch (err) {
    return res
      .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

router.get("/", verifyToken, async (req, res) => {
  try {
    let limit = requestUtil.getLimit(req.query);
    let offset = requestUtil.getOffset(req.query);
    let orderBy = requestUtil.getSortBy(req.query, "+id");

    const reports = await reportServiceInstance.getReports({
      limit,
      offset,
      orderBy,
    });

    if (reports) {
      return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
        message: constants.RESPONSE_STATUS.SUCCESS,
        data: reports,
      });
    }
  } catch (err) {
    return res
      .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

router.patch("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return res
        .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
        .json({ message: constants.MESSAGES.INVALID_REQUEST });
    }

    const reportExists = await reportServiceInstance.getReportByID({ id });

    if (!reportExists) {
      return res
        .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
        .json({ message: "report doesnt exist" });
    }

    if (status > 2 || status < 0) {
      return res
        .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
        .json({ message: "status is invalid" });
    }

    const report = await reportServiceInstance.updateReport({
      id,
      status,
    });

    if (report) {
      return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
        message: constants.RESPONSE_STATUS.SUCCESS,
        data: report,
      });
    }
  } catch (err) {
    return res
      .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

module.exports = router;
