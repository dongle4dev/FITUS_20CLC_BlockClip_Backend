const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const messageService = require("../services/message");
let messageServiceInstance = new messageService();
const chatService = require("../services/chat");
let chatServiceInstance = new chatService();
const verifyToken = require("../middlewares/verify-token");
let requestUtil = require("../utils/request-utils");
let helper = require("../utils/helper");
let constants = require("../../config/constants");
let config = require("../../config/config");
const { getReceiverSocketId, io } = require("../../socket/socket.js");


/**
 *  create message
 */

router.post(
  "/",
  [
    check("chatID", "A chat ID is required").exists(),
    check("senderID", "A sender ID is required").exists(),
    check("content", "A content is required").exists(),
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

      let isChatExisted = await chatServiceInstance.getChatByID({ id: req.body.chatID });
      if (!isChatExisted) {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: "Chat is not existed",
        });
      }

      let receiverID = isChatExisted.firstUser === req.body.senderID ? isChatExisted.secondUser : isChatExisted.firstUser;

      let message = await messageServiceInstance.sendMessage(req.body);

      if (message) {
        // helper.notify({
        //   userId: req.userId,
        //   message:
        //     "You placed a " +
        //     type +
        //     " sell message on " +
        //     category.name +
        //     " token",
        //   message_id: messageAdd.id,
        // });
        // SOCKET IO FUNCTIONALITY WILL GO HERE
        const receiverSocketId = getReceiverSocketId(receiverID);
        
        if (receiverSocketId) {
          // io.to(<socket_id>).emit() used to send events to specific client
          io.to(receiverSocketId).emit("newMessage", message);
        }

        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: message });
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

/** get message of user */
router.get("/",
  verifyToken,
  async (req, res) => {
    try {
      let limit = requestUtil.getLimit(req.query);
      let offset = requestUtil.getOffset(req.query);
      let orderBy = requestUtil.getSortBy(req.query, "+id");
      let chatID = requestUtil.getKeyword(req.query, "chatID");

      let isChatExisted = await chatServiceInstance.getChatByID({ id: chatID });
      if (!isChatExisted) {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: "Chat is not existed",
        });
      }

      let messages = await messageServiceInstance.getMessages({
        chatID, limit, offset, orderBy
      });

      if (messages) {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: constants.RESPONSE_STATUS.SUCCESS,
          data: {
            messages: messages.messages,
            count: messages.count
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
