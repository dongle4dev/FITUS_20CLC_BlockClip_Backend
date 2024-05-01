const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const notificationService = require("../services/notification.js");
let notificationServiceInstance = new notificationService();
const chatService = require("../services/chat.js");
let chatServiceInstance = new chatService();
const verifyToken = require("../middlewares/verify-token.js");
let requestUtil = require("../utils/request-utils.js");
let helper = require("../utils/helper.js");
let constants = require("../../config/constants.js");
let config = require("../../config/config.js");
const { getReceiverSocketId, io } = require("../../socket/socket.js");


/**
 *  create notification
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
          notification: "Chat is not existed",
        });
      }

      let receiverID = isChatExisted.firstUser === req.body.senderID ? isChatExisted.secondUser : isChatExisted.firstUser;

      let notification = await notificationServiceInstance.sendnotification(req.body);

      if (notification) {
        // helper.notify({
        //   userId: req.userId,
        //   notification:
        //     "You placed a " +
        //     type +
        //     " sell notification on " +
        //     category.name +
        //     " token",
        //   notification_id: notificationAdd.id,
        // });
        // SOCKET IO FUNCTIONALITY WILL GO HERE
        const receiverSocketId = getReceiverSocketId(receiverID);
        
        if (receiverSocketId) {
          // io.to(<socket_id>).emit() used to send events to specific client
          io.to(receiverSocketId).emit("newnotification", notification);
        }

        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ notification: constants.RESPONSE_STATUS.SUCCESS, data: notification });
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ notification: constants.RESPONSE_STATUS.FAILURE });
      }
    } catch (err) {
      console.log(err);
      return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ notification: constants.notificationS.INTERNAL_SERVER_ERROR });
    }
  }
);

/** get notification of user */
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
          notification: "Chat is not existed",
        });
      }

      let notifications = await notificationServiceInstance.getnotifications({
        chatID, limit, offset, orderBy
      });

      if (notifications) {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          notification: constants.RESPONSE_STATUS.SUCCESS,
          data: {
            notifications: notifications.notifications,
            count: notifications.count
          },
        });
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.NOT_FOUND)
          .json({ notification: constants.RESPONSE_STATUS.NOT_FOUND });
      }
    } catch (err) {
      console.log(err);
      return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ notification: constants.notificationS.INTERNAL_SERVER_ERROR });
    }
  }
);



module.exports = router;
