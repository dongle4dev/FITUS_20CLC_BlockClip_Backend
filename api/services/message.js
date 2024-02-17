const prisma = require("../../prisma");
let { hasNextPage } = require("../utils/request-utils");
let constants = require("../../config/constants");

/**
 * Includes all the message services that controls
 * the message Data object from the database
 */

class messageService {
  async sendMessage(params) {
    try {
      let { chatID, senderID, content } = params;
      let message = await prisma.messages.create({
        data: {
          chat: { connect: { id: chatID }},
          sender: { connect: { wallet: senderID }},
          content: content
        },
      });
      return message;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getMessages({ chatID, limit, offset, orderBy }) {
    try {
      let where = {
        chatID: chatID,
      }

      let count = await prisma.messages.count({ where });

      let messages = await prisma.messages.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      });
      return {
        messages,
        count
      };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
}

module.exports = messageService;
