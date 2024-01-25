// const { Client } = require("pg");
let constants = require("../../config/constants");
const helper = require("../utils/helper");
const prisma = require("../../prisma");
const config = require("../../config/config");
const categoryService = require("./category");
let categoryServiceInstance = new categoryService();
const pinataSDK = require('@pinata/sdk');
const pinata = new pinataSDK(config.PINATA_API_KEY, config.PINATA_API_SECRET);
const fs = require('fs');
const path = require("path");

class TokenService {
  /**
   * takes chain id and user address as parameter and fetches balances of each token address
   * @param {params} params object of chainid, user address
   */
  async getTokens({limit, offset, orderBy, title, creator, owner, collectionID}) {
    try {
      let where = {
        active: true,
        collectionID: {
          contains: collectionID
        },
        OR:[
          {title: {
            contains: title,
          }},
          {title_lowercase: {
            contains: title,
          }},
        ],
        creator: {
          contains: creator
        },
        owner: {
          contains: owner
        }
      };

      let count = 0;
      if (creator !== "" || owner !== "" || collectionID !== "" || title !== "") {
        count = await prisma.tokens.count({ where });
      } else {
        count = await prisma.tokens.count({ where: {active: true} });
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
      let { creator, owner, title, description, source, collectionID, chainID, contractAddress, paymentType } = params;
      let token = await prisma.tokens.create({
        data: {
          creator: creator,
          owner: owner,
          title: title,
          title_lowercase: title.toLowerCase(),
          description: description,
          source: source,
          collectionID: collectionID? collectionID : null,
          chainID: chainID? chainID : null,
          contractAddress: contractAddress,
          paymentType: paymentType
        },
      });
      let tempToken = {...token};
      delete tempToken.id, tempToken.tokenID, 
      delete tempToken.active, delete tempToken.disabled, 
      delete tempToken.updatedAt, delete tempToken.createdAt;
      const res = await pinata.pinJSONToIPFS(tempToken);

      return {token, tokenURI: `https://gateway.pinata.cloud/ipfs/${res.IpfsHash}`};
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

  async updateToken(params) {
    try {
      let current = await this.getTokenByID(params);
      let { description: params_description, source: params_source, 
            title: params_title, active: params_active, disabled: params_disabled,
            tokenID: params_tokenID } = params;
      let { description: current_description, source: current_source, 
            title: current_title, active: current_active, disabled: current_disabled,
            tokenID: current_tokenID} = current;
      let token = await prisma.tokens.update({
        where: {
          id: params.id
        },
        data: {
          description: params_description
            ? params_description
            : current_description,
          source: params_source ? params_source : current_source,
          title: params_title
            ? params_title
            : current_title,
          active: params_active
            ? params_active
            : current_active,
          disabled: params_disabled && params_disabled !== "" ? params_disabled : current_disabled,
          title_lowercase: params_title 
            ? params_title.toLowerCase()
            : current_title.toLowerCase(),
          tokenID: params_tokenID? params_tokenID : current_tokenID
        },
      });

      return token;
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
}

module.exports = TokenService;
