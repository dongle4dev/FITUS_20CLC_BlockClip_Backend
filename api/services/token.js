// const { Client } = require("pg");
// import { contractAddress } from './../../../nft-marketplace/pages/api/utils';
let constants = require("../../config/constants");
const helper = require("../utils/helper");
const prisma = require("../../prisma");
const config = require("../../config/config");
// const userService = require("./user");
// let userServiceInstance = new userService();
const pinataSDK = require('@pinata/sdk');
const pinata = new pinataSDK(config.PINATA_API_KEY, config.PINATA_API_SECRET);
const fs = require('fs');
const path = require("path");

class TokenService {

  async getTokens({ limit, offset, orderBy, title, creator, owner, collectionID, status, active }) {
    try {
      let where;

      if (status !== "" && active !== "") {
        where = {
          disabled: false,
          collectionID: {
            contains: collectionID
          },
          OR: [
            {
              title: {
                contains: title,
              }
            },
            {
              title_lowercase: {
                contains: title,
              }
            },
          ],
          creator: {
            contains: creator
          },
          owner: {
            contains: owner
          },
          marketorders: {
            some: {
              status: parseInt(status)
            }
          },
          active: active == 'true'
        };
      } else if (status !== "") {
        where = {
          disabled: false,
          collectionID: {
            contains: collectionID
          },
          OR: [
            {
              title: {
                contains: title,
              }
            },
            {
              title_lowercase: {
                contains: title,
              }
            },
          ],
          creator: {
            contains: creator
          },
          owner: {
            contains: owner
          },
          marketorders: {
            some: {
              status: parseInt(status)
            }
          }
        };
      } else if (active !== "") {
        where = {
          disabled: false,
          collectionID: {
            contains: collectionID
          },
          OR: [
            {
              title: {
                contains: title,
              }
            },
            {
              title_lowercase: {
                contains: title,
              }
            },
          ],
          creator: {
            contains: creator
          },
          owner: {
            contains: owner
          },
          active: active == 'true'
        };
      } else {
        where = {
          disabled: false,
          collectionID: {
            contains: collectionID
          },
          OR: [
            {
              title: {
                contains: title,
              }
            },
            {
              title_lowercase: {
                contains: title,
              }
            },
          ],
          creator: {
            contains: creator
          },
          owner: {
            contains: owner
          },
        };
      }

      let count = 0;
      if (creator !== "" || owner !== "" || collectionID !== "" || title !== "" || status !== "" || active !== "") {
        count = await prisma.tokens.count({ where });
      } else {
        count = await prisma.tokens.count({ where: { disabled: false } });
      }
      let tokens = await prisma.tokens.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset
      });
      return {
        tokens,
        count,
        limit,
        offset
      };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getTokensByPrice({ limit, offset, orderBy, title, creator, owner, collectionID, status, active }) {
    try {
      let where;

      if (status !== "" && active !== "") {
        where = {
          disabled: false,
          collectionID: {
            contains: collectionID
          },
          OR: [
            {
              title: {
                contains: title,
              }
            },
            {
              title_lowercase: {
                contains: title,
              }
            },
          ],
          creator: {
            contains: creator
          },
          owner: {
            contains: owner
          },
          marketorders: {
            some: {
              status: parseInt(status),
            }
          },
          active: active == 'true'
        };
      } else if (status !== "") {
        where = {
          disabled: false,
          collectionID: {
            contains: collectionID
          },
          OR: [
            {
              title: {
                contains: title,
              }
            },
            {
              title_lowercase: {
                contains: title,
              }
            },
          ],
          creator: {
            contains: creator
          },
          owner: {
            contains: owner
          },
          marketorders: {
            some: {
              status: parseInt(status)
            }
          }
        };
      } else if (active !== "") {
        where = {
          disabled: false,
          collectionID: {
            contains: collectionID
          },
          OR: [
            {
              title: {
                contains: title,
              }
            },
            {
              title_lowercase: {
                contains: title,
              }
            },
          ],
          creator: {
            contains: creator
          },
          owner: {
            contains: owner
          },
          active: active == 'true'
        };
      } else {
        where = {
          disabled: false,
          collectionID: {
            contains: collectionID
          },
          OR: [
            {
              title: {
                contains: title,
              }
            },
            {
              title_lowercase: {
                contains: title,
              }
            },
          ],
          creator: {
            contains: creator
          },
          owner: {
            contains: owner
          },
        };
      }

      let count = 0;
      if (creator !== "" || owner !== "" || collectionID !== "" || title !== "" || status !== "" || active !== "") {
        count = await prisma.tokens.count({ where });
      } else {
        count = await prisma.tokens.count({ where: { disabled: false } });
      }
      let tokens = await prisma.tokens.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset
      });
      return {
        tokens,
        count,
        limit,
        offset
      };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async createToken(params) {
    try {
      let { creator, owner, title, description, source, collectionID, chainID, contractAddress, mode } = params;
      let token = await prisma.tokens.create({
        data: {
          creatorWallet: { connect: { wallet: creator } },
          ownerWallet: { connect: { wallet: owner } },
          title: title,
          title_lowercase: title.toLowerCase(),
          description: description,
          source: source,
          collection: collectionID ? { connect: { collectionID: collectionID } } : null,
          chainID: chainID ? chainID : null,
          contractAddress: contractAddress,
          mode: mode
        },
      });
      let tempToken = { ...token };

      delete tempToken.id, delete tempToken.active, delete tempToken.disabled;
      delete tempToken.updatedAt, delete tempToken.createdAt;
      delete tempToken.title_lowercase, delete tempToken.tokenID;
      delete tempToken.listOfLikedUsers, delete tempToken.listOfFavoriteUsers;
      delete tempToken.totalViews, delete tempToken.collectionID;
      delete tempToken.totalShares;
      
      const res = await pinata.pinJSONToIPFS(tempToken);

      return { token, tokenURI: `https://gateway.pinata.cloud/ipfs/${res.IpfsHash}` };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getToken(params) {
    try {
      let { tokenID, collectionID } = params;
      let token = await prisma.tokens.findMany({
        where: {
          tokenID: tokenID,
          collectionID: collectionID,
        },
      });
      return token.at(0);
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getTokenByID(params) {
    try {
      let { id } = params;
      let tokens = await prisma.tokens.findMany({
        where: { id: id },
      });
      return tokens.at(0);
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getTokenByTokenID(params) {
    try {
      let { tokenID } = params;
      let tokens = await prisma.tokens.findMany({
        where: { tokenID: tokenID },
      });
      return tokens.at(0);
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getTokensByUser({ limit, offset, orderBy, title, wallet, tokenID, active }) {
    try {
      let where;
      if (active !== "") {
        where = {
          disabled: false,
          tokenID: {
            contains: tokenID
          },
          OR: [
            {
              title: {
                contains: title,
              }
            },
            {
              title_lowercase: {
                contains: title,
              }
            },
          ],
          creator: {
            contains: wallet,
          },
          owner: {
            contains: wallet,
          },
          active: active == 'true'
        };
      } else {
        where = {
          disabled: false,
          tokenID: {
            contains: tokenID
          },
          OR: [
            {
              title: {
                contains: title,
              }
            },
            {
              title_lowercase: {
                contains: title,
              }
            },
          ],
          creator: {
            contains: wallet,
          },
          owner: {
            contains: wallet,
          },
        };
      }


      let count = await prisma.tokens.count({ where });
      let tokens = await prisma.tokens.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset
      });
      return {
        tokens,
        count,
        limit,
        offset
      };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getFavoritedTokensByUser({ limit, offset, orderBy, title, wallet, active }) {
    try {
      let where;
      if (active !== "") {
        where = {
          disabled: false,
          OR: [
            {
              title: {
                contains: title,
              }
            },
            {
              title_lowercase: {
                contains: title.toLowerCase(),
              }
            },
          ],
          listOfFavoriteUsers: {
            hasSome: [wallet]
          },
          active: active == 'true'
        };
      } else {
        where = {
          disabled: false,
          OR: [
            {
              title: {
                contains: title,
              }
            },
            {
              title_lowercase: {
                contains: title.toLowerCase(),
              }
            },
          ],
          listOfFavoriteUsers: {
            hasSome: [wallet]
          },
        };
      }


      let count = await prisma.tokens.count({ where });
      let tokens = await prisma.tokens.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset
      });
      return {
        tokens,
        count,
        limit,
        offset
      };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateToken(params) {
    try {
      let current = await this.getTokenByID(params);
      let { description: params_description, source: params_source,
        title: params_title, active: params_active, disabled: params_disabled,
        tokenID: params_tokenID, contractAddress: params_contractAddress,
        owner: params_owner,
      } = params;
      let { description: current_description, source: current_source,
        title: current_title, active: current_active, disabled: current_disabled,
        tokenID: current_tokenID, contractAddress: current_contractAddress,
        owner: current_owner
      } = current;
      let token = await prisma.tokens.update({
        where: {
          id: current.id
        },
        data: {
          description: params_description
            ? params_description
            : current_description,
          source: params_source ? params_source : current_source,
          title: params_title
            ? params_title
            : current_title,
          active: params_active !== undefined
            ? params_active
            : current_active,
          disabled: params_disabled !== undefined ? params_disabled : current_disabled,
          title_lowercase: params_title
            ? params_title.toLowerCase()
            : current_title.toLowerCase(),
          tokenID: params_tokenID ? params_tokenID : current_tokenID,
          contractAddress: params_contractAddress ? params_contractAddress : current_contractAddress,
          ownerWallet: params_owner ? {
            connect: { wallet: params_owner }
          } : {
            connect: { wallet: current_owner }
          },
        },
      });

      if (params_description || params_title ||
        params_source || params_contractAddress || params_owner) {
        let tempToken = { ...token };
        delete tempToken.id, delete tempToken.active, delete tempToken.disabled;
        delete tempToken.updatedAt, delete tempToken.createdAt;
        delete tempToken.title_lowercase, delete tempToken.tokenID;
        delete tempToken.listOfLikedUsers, delete tempToken.listOfFavoriteUsers;
        delete tempToken.totalViews, delete tempToken.collectionID;
        delete tempToken.totalShares;
        const res = await pinata.pinJSONToIPFS(tempToken);
        if (params.tokenURI) {
          const res2 = await pinata.unpin(params.tokenURI.split('/')[4]);
          console.log("Unpin token on Pinata: " + res2);
        }

        return { token, tokenURI: `https://gateway.pinata.cloud/ipfs/${res.IpfsHash}` };
      } else return token;

    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateTokenByTokenID(params) {
    try {
      let current = await this.getTokenByTokenID(params);
      let { description: params_description, source: params_source,
        title: params_title, active: params_active, disabled: params_disabled,
        tokenID: params_tokenID, contractAddress: params_contractAddress,
        owner: params_owner, collectionID: params_collectionID,
      } = params;
      let { description: current_description, source: current_source,
        title: current_title, active: current_active, disabled: current_disabled,
        tokenID: current_tokenID, contractAddress: current_contractAddress,
        owner: current_owner, collectionID: current_collectionID
      } = current;
      let token = await prisma.tokens.update({
        where: {
          id: current.id
        },
        data: {
          description: params_description
            ? params_description
            : current_description,
          source: params_source ? params_source : current_source,
          title: params_title
            ? params_title
            : current_title,
          active: params_active !== undefined
            ? params_active
            : current_active,
          disabled: params_disabled !== undefined ? params_disabled : current_disabled,
          title_lowercase: params_title
            ? params_title.toLowerCase()
            : current_title.toLowerCase(),
          tokenID: params_tokenID ? params_tokenID : current_tokenID,
          contractAddress: params_contractAddress ? params_contractAddress : current_contractAddress,
          ownerWallet: params_owner ? {
            connect: { wallet: params_owner }
          } : {
            connect: { wallet: current_owner }
          },
          collection: params_collectionID ? {
            connect: { collectionID: params_collectionID }
          } : {
            connect: { collectionID: current_collectionID }
          },
        },
      });

      if (params_description || params_title ||
        params_source || params_contractAddress || 
        params_owner) {
        let tempToken = { ...token };
        delete tempToken.id, delete tempToken.active, delete tempToken.disabled;
        delete tempToken.updatedAt, delete tempToken.createdAt;
        delete tempToken.title_lowercase, delete tempToken.tokenID;
        delete tempToken.listOfLikedUsers, delete tempToken.listOfFavoriteUsers;
        delete tempToken.totalViews, delete tempToken.collectionID;
        delete tempToken.totalShares;
        const res = await pinata.pinJSONToIPFS(tempToken);
        if (params.tokenURI) {
          const res2 = await pinata.unpin(params.tokenURI.split('/')[4]);
          console.log("Unpin token on Pinata: " + res2);
        }

        return { token, tokenURI: `https://gateway.pinata.cloud/ipfs/${res.IpfsHash}` };
      } else return token;

    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async uploadVideoToIPFS(source) {
    try {
      const stream = fs.createReadStream(path.resolve(source));
      const indexForNaming = stream.path.lastIndexOf("/")
      const options = {
        pinataMetadata: {
          name: stream.path.slice(indexForNaming + 1),
        },
      }

      const res = await pinata.pinFileToIPFS(stream, options);

      return `https://gateway.pinata.cloud/ipfs/${res.IpfsHash}`;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async likeToken(params) {
    try {
      let { tokenID, userWallet } = params;
      let tokens = await prisma.tokens.findMany({
        where: {
          tokenID: tokenID
        },
      });

      if (tokens.length > 0) {
        tokens = tokens.at(0);
        if (tokens.listOfLikedUsers.includes(userWallet)) {
          helper.removeItemOnce(tokens.listOfLikedUsers, userWallet);
        } else {
          tokens.listOfLikedUsers.push(userWallet);
        }
        let token = await prisma.tokens.update({
          where: {
            tokenID: tokenID
          },
          data: {
            listOfLikedUsers: tokens.listOfLikedUsers
          }
        })
        return token;
      }
      else return tokens;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async isLikedToken(params) {
    try {
      let { tokenID, userWallet } = params;
      let tokens = await prisma.tokens.findMany({
        where: {
          tokenID: tokenID,
          listOfLikedUsers: {
            hasSome: [userWallet]
          }
        },
      });

      if (tokens.length > 0) {
        return { isLiked: true };
      }
      else return { isLiked: false };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async addTokenToFavorites(params) {
    try {
      let { tokenID, userWallet } = params;
      let tokens = await prisma.tokens.findMany({
        where: {
          tokenID: tokenID
        },
      });

      if (tokens.length > 0) {
        tokens = tokens.at(0);
        if (tokens.listOfFavoriteUsers.includes(userWallet)) {
          helper.removeItemOnce(tokens.listOfFavoriteUsers, userWallet);
        } else {
          tokens.listOfFavoriteUsers.push(userWallet);
        }
        let token = await prisma.tokens.update({
          where: {
            tokenID: tokenID
          },
          data: {
            listOfFavoriteUsers: tokens.listOfFavoriteUsers
          }
        })
        return token;
      }
      else return tokens;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async isFavoriteToken(params) {
    try {
      let { tokenID, userWallet } = params;
      let tokens = await prisma.tokens.findMany({
        where: {
          tokenID: tokenID,
          listOfFavoriteUsers: {
            hasSome: [userWallet]
          }
        },
      });

      if (tokens.length > 0) {
        return { isFavorited: true };
      }
      else return { isFavorited: false };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async viewToken(params) {
    try {
      let { tokenID } = params;
      let tokens = await prisma.tokens.findMany({
        where: {
          tokenID: tokenID
        },
      });

      if (tokens.length > 0) {
        tokens = tokens.at(0);

        let token = await prisma.tokens.update({
          where: {
            tokenID: tokenID
          },
          data: {
            totalViews: tokens.totalViews + 1
          }
        })
        return token;
      }
      else return tokens;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async shareToken(params) {
    try {
      let { tokenID } = params;
      let tokens = await prisma.tokens.findMany({
        where: {
          tokenID: tokenID
        },
      });

      if (tokens.length > 0) {
        tokens = tokens.at(0);

        let token = await prisma.tokens.update({
          where: {
            tokenID: tokenID
          },
          data: {
            totalShares: tokens.totalShares + 1
          }
        })
        return token;
      }
      else return tokens;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
}

module.exports = TokenService;
