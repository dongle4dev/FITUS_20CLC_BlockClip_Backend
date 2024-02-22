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

  async getChatByUser(params) {
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
      return chat.at(0);
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
      if (chats.length > 0) {
        chats = chats[0];
        chats.lastMessage = chats.messages.at(0);
        delete chats.messages;

        return chats;
      }

      return chats[0];
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getChats({ user, username, lastMessage, limit, offset, orderBy }) {
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
        OR: [
          {
            firstUserWallet: {
              username: {
                contains: username
              }
            }
          },
          {
            secondUserWallet: {
              username: {
                contains: username
              }
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

      chat = await chat.filter((chat) => {
        chat.lastMessage = chat.messages.at(0);
        delete chat.messages;
        if (lastMessage !== "") {
          if (chat.lastMessage) {
            if (chat.lastMessage.content.includes(lastMessage)) {
              return true;
            } else {
              count--;
              return false;
            }
          } else {
            count--;
            return false;
          }
        }
        return true;
      })

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
