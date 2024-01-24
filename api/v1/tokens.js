const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const TokenService = require("../services/token");
const tokenServiceInstance = new TokenService();
const userService = require("../services/user");
let userServiceInstance = new userService();
const collectionService = require("../services/collection");
let collectionServiceInstance = new collectionService();
let constants = require("../../config/constants");
const helper = require("../utils/helper");
const upload = require("../utils/upload");
let requestUtil = require("../utils/request-utils");
const validate = require("../utils/helper");


/**
 * Token routes
 */

/**
 *  Gets all the token details
 */

router.get("/", async (req, res) => {
  try {
    let limit = requestUtil.getLimit(req.query);
    let offset = requestUtil.getOffset(req.query);
    let orderBy = requestUtil.getSortBy(req.query, "+id");
    let title = requestUtil.getKeyword(req.query, "search");
    let creator = requestUtil.getKeyword(req.query, "creator");
    let owner = requestUtil.getKeyword(req.query, "owner");
    let collectionID = requestUtil.getKeyword(req.query, "collectionID");

    if (creator !== "") {
      if (!validate.isValidEthereumAddress(creator)) {
        return res
        .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
        .json({ message: 'creator address is not valid' });
      }
    }
    if (owner !== "") {
      if (!validate.isValidEthereumAddress(owner)) {
        return res
        .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
        .json({ message: 'owner address is not valid' });
      }
    }


    let foundOwner = await userServiceInstance.getUser({ owner });
    let foundCreator = await userServiceInstance.getUser({ creator });

    if (!foundOwner || !foundCreator) {
      return res.status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST).json({
        message: 'creator address or owner address does not exist',
      });
    }

    let tokens = await tokenServiceInstance.getTokens({
      limit, offset, orderBy, title, creator, owner, collectionID
    });

    return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
      message: constants.RESPONSE_STATUS.SUCCESS,
      data: {
        tokens: tokens.tokens,
        count: tokens.count
      }
    });
  } catch (err) {
    console.log(err);
    return res
      .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

/**
 *  Adds a new token 
 */

router.post(
  "/",
  check("creator", "A valid creator is required").exists().isEthereumAddress(),
  check("owner", "A valid owner is required").exists().isEthereumAddress(),
  check("title", "A valid title is required").exists(),
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let creator = await userServiceInstance.getUser({
        wallet: req.body.creator,
      });
      let owner = await userServiceInstance.getUser({
        wallet: req.body.owner,
      });

      if (!creator || !owner) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
      }

      
      let token = await tokenServiceInstance.createToken(req.body);
      if (token) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: token });
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: constants.RESPONSE_STATUS.FAILURE });
      }
    } catch (err) {
      console.log(err);
      return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
);

/**
 *  Post video of NFT Token
 *  @param video type: file
 */

router.post(
  "/source",
  upload.single("source"),
  async (req, res) => {
    try {
      let source = await tokenServiceInstance.uploadVideoToIPFS(`public/${req.file.filename}`);

      if (source) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: source });
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: constants.RESPONSE_STATUS.FAILURE });
      }
    } catch (err) {
      console.log(err);
      return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
);

/**
 *  Gets single collection detail by collectionID
 *  @param collectionID type: string
 */

router.get(
  "/:tokenID",
  [check("tokenID", "A valid tokenID is required").exists()],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let token = await tokenServiceInstance.getTokenByTokenID(req.params);
      if (token) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: token });
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.NOT_FOUND)
          .json({ message: constants.RESPONSE_STATUS.NOT_FOUND });
      }
    } catch (err) {
      console.log(err);
      return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
);


/**
 *  Updates an existing NFT token by id
 */

router.put(
  "/:id",
  [check("id", "A valid id is required").exists()],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let params = { ...req.params, ...req.body };

      if (!params.id) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
      }

      let tokenExists = await tokenServiceInstance.getTokenByID(params);

      if (tokenExists.length === 0) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "token doesnt exist" });
      }

      let token = await tokenServiceInstance.updateToken(
        params
      );
      if (token) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: "token updated successfully", data: token });
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "token update failed" });
      }
    } catch (err) {
      console.log(err);
      return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
);
module.exports = router;
