const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const FriendService = require("../services/friend");
let friendServiceInstance = new FriendService();
const verifyToken = require("../middlewares/verify-token");
let requestUtil = require("../utils/request-utils");
let helper = require("../utils/helper");
let constants = require("../../config/constants");
let config = require("../../config/config");


/**
 *  add friend
 */

router.post(
  "/",
  [
    check("from", "A requester is required").exists(),
    check("to", "A recipient is required").exists(),
    check("chainID", "A chain id is required").exists(),
    check("status", "A status is required").exists(),
  ],
  verifyToken,
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let {
        chainID, from, to, status
      } = req.body;

      let validRequest = await friendServiceInstance.checkValidRequest({
        from, to, chainID
      });

      if (validRequest.status === 0) {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: ["Request is pending"],
        });
      } else if (validRequest.status === 1) {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: ["They are friends"],
        });
      }

      let friend = await friendServiceInstance.addFriend({
        chainID, from, to, status
      });

      if (friend) {
        // helper.notify({
        //   userId: req.userId,
        //   message:
        //     "You placed a " +
        //     type +
        //     " sell friend on " +
        //     category.name +
        //     " token",
        //   friend_id: friendAdd.id,
        // });
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: friend });
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

/** update request */
router.patch("/",
  [
    check("from", "A requester is required").exists(),
    check("to", "A recipient is required").exists(),
    check("chainID", "A chain id is required").exists(),
    check("status", "A status is required").exists(),
  ],
  verifyToken,
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      };

      let friendExists = friendServiceInstance.getRequest(req.body);

      if (friendExists.length === 0) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "friend doesnt exists" });
      }

      let friend = await friendServiceInstance.updateRequest(
        req.body
      );
      if (friend) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: "friends updated successfully", data: friend });
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "friends update failed" });
      }
    } catch (err) {
      console.log(err);
      return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
);

/** get friends */
router.get("/myFriends",
  verifyToken,
  async (req, res) => {
    try {
      let limit = requestUtil.getLimit(req.query);
      let offset = requestUtil.getOffset(req.query);
      let orderBy = requestUtil.getSortBy(req.query, "+id");
      let wallet = req.userWallet;

      let users = await friendServiceInstance.getListOfMyFriends({
        wallet, limit, offset, orderBy
      });

      if (users) {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: constants.RESPONSE_STATUS.SUCCESS,
          data: {
            users: users.users,
            count: users.count
          },
        });
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

/** get friend's tokens */
router.get("/tokens",
  verifyToken,
  async (req, res) => {
    try {
      let limit = requestUtil.getLimit(req.query);
      let offset = requestUtil.getOffset(req.query);
      let orderBy = requestUtil.getSortBy(req.query, "+id");
      let wallet = req.userWallet;

      let tokens = await friendServiceInstance.getTokensOfFriends({
        wallet, limit, offset, orderBy
      });

      if (tokens) {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: constants.RESPONSE_STATUS.SUCCESS,
          data: {
            tokens: tokens.tokens,
            count: tokens.count
          },
        });
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

/** get request */
router.get("/",
  async (req, res) => {
    try {
      let limit = requestUtil.getLimit(req.query);
      let offset = requestUtil.getOffset(req.query);
      let orderBy = requestUtil.getSortBy(req.query, "+id");
      let from = requestUtil.getKeyword(req.query, "from");
      let to = requestUtil.getKeyword(req.query, "to");
      let chainID = requestUtil.getKeyword(req.query, "chainID");
      let status = requestUtil.getKeyword(req.query, "status");


      let requests = await friendServiceInstance.getRequests({
        from, to, chainID, status, limit, offset, orderBy
      });

      if (requests) {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: constants.RESPONSE_STATUS.SUCCESS,
          data: {
            request: requests.request,
            count: requests.count
          },
        });
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


module.exports = router;
