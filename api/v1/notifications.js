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
  // verifyToken,
  [
    check("title", "A title is required").exists(),
    check("description", "A description is required").exists(),
    check("link", "A link is required").exists(),
    check("image", "An image is required").exists(),
    check("type", "A type is required").exists(),
    check("receiver", "Receiver is required").exists(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let notifications = await notificationServiceInstance.notifyToUsers(req.body);
      if (notifications.notifications) {
        notifications.notifications.forEach(notification => {
          const receiverSocketId = getReceiverSocketId(notification.receiverID);
        
          if (receiverSocketId) {
            // io.to(<socket_id>).emit() used to send events to specific client
            io.to(receiverSocketId).emit("newNotification", notification);
          }
        })
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
        
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: notifications });
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

/** get notification of user */
router.get("/",
  // "/:wallet", 
  // [check("wallet", "A valid id is required").exists()],
  verifyToken,
  async (req, res) => {
    try {
      // const errors = validationResult(req);

      // if (!errors.isEmpty()) {
      //   return res
      //     .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
      //     .json({ error: errors.array() });
      // }

      let userWallet = req.userWallet;
      let limit = requestUtil.getLimit(req.query);
      let offset = requestUtil.getOffset(req.query);
      let orderBy = requestUtil.getSortBy(req.query, "+id");
      let type = requestUtil.getKeyword(req.query, "type");


      let notifications = await notificationServiceInstance.getNotificationsByUser({
        limit, offset, orderBy, userWallet, type
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
