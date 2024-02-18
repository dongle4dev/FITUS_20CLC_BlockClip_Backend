const prisma = require("../../prisma");
let { hasNextPage } = require("../utils/request-utils");
let constants = require("../../config/constants");

/**
 * Includes all the chat services that controls
 * the chat Data object from the database
 */

class chatService {
  async createChat(params) {
    try {
      let { firstUser, secondUser } = params;
      let chat = await prisma.chats.create({
        data: {
          firstUserWallet: { connect: { wallet: firstUser } },
          secondUserWallet: { connect: { wallet: secondUser } }
        },
      });
      return chat;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async isChatExisted(params) {
    try {
      let { firstUser, secondUser } = params;
      let chat = await prisma.chats.findMany({
        where: {
          firstUser: {
            in: [firstUser, secondUser]
          },
          secondUser: {
            in: [firstUser, secondUser]
          },
        }
      });
      return chat.length > 0 ? true : false;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getChatByID(params) {
    try {
      let { id } = params;
      let chats = await prisma.chats.findMany({
        where: { id: id },
        include: {
          messages: {
            take: 1,
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      return chats.at(0);
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getChats({ user, limit, offset, orderBy }) {
    try {
      let where = {
        OR: [
          {
            firstUser: user !== "" ? {
              in: [user]
            } : {
              contains: ""
            }
          },
          {
            secondUser: user !== "" ? {
              in: [user]
            } : {
              contains: ""
            }
          },
        ],
      }

      let count = await prisma.chats.count({ where });

      let chat = await prisma.chats.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: {
          messages: {
            take: 1,
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });
      return {
        chat,
        count
      };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
}

module.exports = chatService;
