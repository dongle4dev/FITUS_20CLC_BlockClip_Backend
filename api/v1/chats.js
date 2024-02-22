const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const chatService = require("../services/chat");
let chatServiceInstance = new chatService();
const verifyToken = require("../middlewares/verify-token");
let requestUtil = require("../utils/request-utils");
let helper = require("../utils/helper");
let constants = require("../../config/constants");
let config = require("../../config/config");


/**
 *  create chat
 */

router.post(
  "/",
  [
    check("firstUser", "A first user is required").exists(),
    check("secondUser", "A second user is required").exists(),
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

      let isChatExisted = await chatServiceInstance.isChatExisted(req.body);

      if (isChatExisted) {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: ["Chat is already existed"],
        });
      }

      let chat = await chatServiceInstance.createChat(req.body);

      if (chat) {
        // helper.notify({
        //   userId: req.userId,
        //   message:
        //     "You placed a " +
        //     type +
        //     " sell chat on " +
        //     category.name +
        //     " token",
        //   chat_id: chatAdd.id,
        // });
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: chat });
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
 *  get chat by user
 */

router.get(
  "/recipient/:recipient",
  verifyToken,
  [check("recipient", "A recipient id is required").exists()],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }
      console.log(req.userWallet)

      let chat = await chatServiceInstance.getChatByUser({
        firstUser: req.userWallet, secondUser: req.params.recipient
      });

      return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
        message: constants.RESPONSE_STATUS.SUCCESS,
        data: chat ? chat : {}
      });
    } catch (err) {
      console.log(err);
      return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
    }
  });

/**
 *  get chat by chatID
 */

router.get(
  "/:chatID",
  verifyToken,
  [check("chatID", "A valid id is required").exists()],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      if (!helper.isValidMongodbID(req.params.chatID)) {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: 'Chat ID is not valid',
        });
      }

      let chat = await chatServiceInstance.getChatByID({
        id: req.params.chatID
      });

      return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
        message: constants.RESPONSE_STATUS.SUCCESS,
        data: chat ? chat : {}
      });
    } catch (err) {
      console.log(err);
      return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
    }
  });


/** get chat of user */
router.get("/",
  verifyToken,
  async (req, res) => {
    try {
      let limit = requestUtil.getLimit(req.query);
      let offset = requestUtil.getOffset(req.query);
      let orderBy = requestUtil.getSortBy(req.query, "+id");
      let user = requestUtil.getKeyword(req.query, "user") || req.userWallet;
      let username = requestUtil.getKeyword(req.query, "username");
      let lastMessage = requestUtil.getKeyword(req.query, "lastMessage");

      // let user = requestUtil.getKeyword(req.query, "user");


      let chats = await chatServiceInstance.getChats({
        user, username, lastMessage, limit, offset, orderBy
      });

      if (chats) {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: constants.RESPONSE_STATUS.SUCCESS,
          data: {
            chats: chats.chat,
            count: chats.count
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
