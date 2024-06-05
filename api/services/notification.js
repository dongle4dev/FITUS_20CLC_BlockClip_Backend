const prisma = require("../../prisma");
let { hasNextPage } = require("../utils/request-utils");
let constants = require("../../config/constants");

/**
 * Includes all the notification services that controls
 * the notification Data object from the database
 */

class notificationService {
  async notifyToUsers(params) {
    try {
      let { title, description, link, image, type, receiver, isRead } = params;

      let notifications = [];

      for (let i = 0; i < receiver.length; i++) {
        let notification = await prisma.notifications.create({
          data: { 
            title: title, 
            description: description, 
            link: link, 
            image: image, 
            type: type,
            isRead: isRead? false: isRead,
            receiver: { connect: {wallet: receiver[i]}}
          }
        })

        notifications.push(notification);
      }
      
      return {
        notifications,
        count: notifications.length
      };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getNotifications({ chatID, limit, offset, orderBy }) {
    try {
      let where = {
        chatID: chatID,
      }

      let count = await prisma.notifications.count({ where });

      let notifications = await prisma.notifications.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      });
      return {
        notifications,
        count
      };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  // get notifications of a user by type, limit, offset
  async getNotificationsByUser(params) {
    try {
      let { limit, offset, orderBy, userWallet, type } = params;

      let where = {
        type: {
          contains: type,
        },
        receiverID: {
          contains: userWallet,
        },
      };

      let count = await prisma.notifications.count({ where });
      let notifications = await prisma.notifications.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      });

      return {
        notifications,
        count,
        limit,
        offset
      };
    } catch (err) {
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
  
  async getUserNotification({ userId, limit, offset, orderBy }) {
    try {
      let count = await prisma.notifications.count({
        where: {
          usersId: parseInt(userId),
        },
      });

      let unread_count = await prisma.notifications.count({
        where: {
          usersId: parseInt(userId),
          read: false,
        },
      });
      let notifications = await prisma.notifications.findMany({
        where: {
          usersId: parseInt(userId),
        },
        select: {
          read: true,
          id: true,
          active: true,
          created: true,
          message: true,
          updated: true,
          usersId: true,
          order_id: true,
          type: true,
          orders: {
            select: { type: true, txhash: true, categories: { select: { img_url: true } } },
          },
        },
        orderBy: { created: constants.SORT_DIRECTION.DESC },
        take: limit,
        skip: offset,
      });

      return {
        notifications,
        limit,
        offset,
        has_next_page: hasNextPage({ limit, offset, count }),
        unread_count,
      };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async readUserNotification({ userId }) {
    try {
      let notifications = await prisma.notifications.updateMany({
        where: {
          read: false,
          usersId: parseInt(userId),
        },
        data: { read: true },
      });

      return notifications;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
}

module.exports = notificationService;
