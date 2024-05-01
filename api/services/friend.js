const prisma = require("../../prisma");
let { hasNextPage } = require("../utils/request-utils");
let constants = require("../../config/constants");

/**
 * Includes all the Friend services that controls
 * the Friend Data object from the database
 */

class FriendService {
  async addFriend(params) {
    try {
      let { chainID, from, to, status } = params;
      let friend = await prisma.friends.create({
        data: {
          requester: { connect: { wallet: from } },
          recipient: { connect: { wallet: to } },
          chainID: chainID,
          status: status,
        },
      });
      return friend;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async checkValidRequest(params) {
    try {
      let { from, to, chainID } = params;
      let request = await prisma.friends.findMany({
        where: {
          from: {
            in: [from, to]
          },
          to: {
            in: [from, to]
          },
          status: {
            in: [0, 1]
          },
          chainID: chainID,
        },
      });

      if (request.length > 0) {
        return { status: request[0].status };
      } else {
        return { status: false };
      }
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getRequest(params) {
    try {
      let { from, to, chainID } = params;
      let request = await prisma.friends.findMany({
        where: {
          OR: [
            {
              from: from !== "" || to !== "" ? {
                in: [from, to]
              } : {
                contains: ""
              }
            },
            {
              to: from !== "" || to !== "" ? {
                in: [from, to]
              } : {
                contains: ""
              }
            },
          ],
          chainID: chainID ? chainID : {
            contains: ""
          },
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return request.at(0);
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateRequest(params) {
    try {
      let current = await this.getRequest(params);

      let request = await prisma.friends.update({
        where: {
          id: current.id
        },
        data: {
          status: params.status
        }
      })

      return request;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getRequests({ from, to, chainID, status, limit, offset, orderBy }) {
    try {

      let where = {
        OR: [
          {
            from: from !== "" || to !== "" ? {
              in: [from, to]
            } : {
              contains: ""
            }
          },
          {
            to: from !== "" || to !== "" ? {
              in: [from, to]
            } : {
              contains: ""
            }
          },
        ],
        chainID: chainID ? chainID : {
          contains: ""
        },
        status: status ? parseInt(status) : {
          not: 5
        },
      }

      let count = await prisma.friends.count({ where });

      let request = await prisma.friends.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      });
      return {
        request,
        count
      };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getListOfMyFriends({ wallet, limit, offset, orderBy }) {
    try {
      console.log(wallet);
      let where = {
        wallet: {
          not: wallet
        },
        OR: [
          {
            from_friends: {
              some: {
                status: {
                  equals: 1
                },
                to: {
                  in: [wallet]
                }
              }
            }
          },
          {
            to_friends: {
              some: {
                status: {
                  equals: 1
                },
                from: {
                  in: [wallet]
                }
              }
            }
          },
        ],
      }
      let count = await prisma.users.count({ where });

      let users = await prisma.users.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset
      });
      return {
        users,
        count
      };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getTokensOfFriends({ wallet, limit, offset, orderBy}) {
    try {
      let where = {
        mode: {
          equals: constants.MODE.PUBLIC
        },
        ownerWallet: {
          wallet: {
            not: wallet
          },
          OR: [
            {
              from_friends: {
                every: {
                  status: {
                    equals: 1
                  },
                  to: wallet
                }
              }
            },
            {
              to_friends: {
                every: {
                  status: {
                    equals: 1
                  },
                  from: wallet
                }
              }
            },
          ]
        }
      }
      let count = await prisma.tokens.count({ where });

      let tokens = await prisma.tokens.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      });
      return {
        tokens,
        count
      };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
}

module.exports = FriendService;
