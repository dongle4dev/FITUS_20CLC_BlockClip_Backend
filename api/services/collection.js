const prisma = require("../../prisma");
let { hasNextPage } = require("../utils/request-utils");
let constants = require("../../config/constants");
const config = require("../../config/config");
const pinataSDK = require('@pinata/sdk');
const pinata = new pinataSDK(config.PINATA_API_KEY, config.PINATA_API_SECRET);

/**
 * Includes all the Collection services that controls
 * the Collection Data object from the database
 */

class CollectionService {
  async createCollection(params) {
    let { title, description, creator, chainID, contractAddress, paymentType, category, bannerURL } = params;
    try {
      let collection = await prisma.collections.create({
        data: {
          title: title,
          description: description,
          creator: creator,
          chainID: chainID,
          contractAddress: contractAddress,
          paymentType: paymentType,
          category: category,
          title_lowercase: title.toLowerCase(),
          bannerURL: bannerURL,
        },  
      });
      let tempCol = {...collection};
      delete tempCol.id, delete tempCol.active, delete tempCol.disabled, delete tempCol.updatedAt, delete tempCol.createdAt;
      delete tempCol.averagePrice, delete tempCol.totalViews;
      const res = await pinata.pinJSONToIPFS(tempCol);

      return {collection, collectionURI: `https://gateway.pinata.cloud/ipfs/${res.IpfsHash}`};
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getCollections({ limit, offset, orderBy, chainID }) {
    try {
      let where = {
        active: true,
        chainID: chainID
      };

      let count = await prisma.collections.count({ where });
      let collections = await prisma.collections.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset
      }); 
      return {
        collections,
        count,
        limit,
        offset,
        has_next_page: hasNextPage({ limit, offset, count }),
      };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  // async getCollectionByAddress({ collectionAddress, chainId }) {
  //   try {
  //     let collection = await prisma.collectionsaddresses.findOne({
  //       where: {
  //         address_chain_id: {
  //           address: collectionAddress,
  //           chain_id: chainId,
  //         },
  //       },
  //     });

  //     return collection;
  //   } catch (err) {
  //     console.log(err);
  //     throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  //   }
  // }

  async collectionExists(params) {
    try {
      let { title } = params;
      let collections = await prisma.collections.findMany({
        where: { title_lowercase: title.toLowerCase() },
      });
      return collections;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

//   async collectionAddressExists(params) {
//     let { address } = params;
//     try {
//       let collections = await prisma.collectionsaddresses.findOne({
//         where: {
//           address_chain_id: {
//             address: params.address,
//             chain_id: params.chain_id,
//           },
//         },
//       });

//       collections;
//       return collections;
//     } catch (err) {
//       console.log(err);
//       throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
//     }
//   }

  async getCollectionByCollectionID(params) {
    try {
      let { collectionID } = params;
      let collections = await prisma.collections.findMany({
        where: { collectionID: collectionID },
      });
      return collections.at(0);
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getCollectionByID(params) {
    try {
      let { id } = params;
      let collections = await prisma.collections.findMany({
        where: { id: id },
      });
      return collections.at(0);
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateCollection(params) {
    try {
      let current = await this.getCollectionByID(params);
      let { collectionID: current_collectionID, title: current_title, description: current_description, bannerURL: current_bannerURL, 
            active: current_active, disabled: current_disabled} = current;
      let { collectionID: params_collectionID, title: params_title, description: params_description, bannerURL: params_bannerURL, 
        active: params_active, disabled: params_disabled } = params;

      let collection = await prisma.collections.update({
        where: { id: params.id },
        data: {
          description: params_description
            ? params_description
            : current_description,
          bannerURL: params_bannerURL ? params_bannerURL : current_bannerURL,
          title: params_title ? params_title : current_title,
          title_lowercase: params_title ? params_title.toLowerCase(): current_title.toLowerCase(),
          collectionID: params_collectionID ? params_collectionID : current_collectionID,
          active: params_active ? params_active : current_active,
          disabled: params_disabled ? params_disabled : current_disabled,
        },
      });
      return collection;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
}

module.exports = CollectionService;
