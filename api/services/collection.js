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
  async createCollection(params, file) {
    let { title, description, creator, chainID, contractAddress, paymentType, category } = params;
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
          bannerURL: file ? `http://localhost:${config.port}/public/` + file.filename : "",
        },  
      });
      delete collection.id, delete collection.active, delete collection.disabled, delete collection.updatedAt, delete collection.createdAt;
      delete collection.averagePrice, delete collection.totalViews;
      const res = await pinata.pinJSONToIPFS(collection);

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

//   async updatecollection(params, file) {
//     try {
//       let current = await this.getcollection(params);
//       let { description: current_description, url: current_url, img_url: current_img_url, type: current_type } = current;
//       let { description: params_description, address: params_address, type: params_type, url: params_url } = params;
//       let collection = await prisma.collections.update({
//         where: { id: parseInt(params.collectionId) },
//         data: {
//           description: params_description
//             ? params_description
//             : current_description,
//           url: params_url ? params_url : current_url,
//           img_url: file ? file.path : current_img_url,
//           collectionsaddresses: {
//             create: params_address ? JSON.parse(params_address) : [],
//           },
//           type: params_type ? params_type : current_type,
//         },
//       });
//       return category;
//     } catch (err) {
//       console.log(err);
//       throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
//     }
//   }
}

module.exports = CollectionService;
