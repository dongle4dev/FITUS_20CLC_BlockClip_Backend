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
    let { title, description, creatorCollection, chainID, contractAddress, paymentType, category, bannerURL, package: packageData } = params;
    console.log(params);
    try {
      // packageData.forEach(pkg => delete pkg.privilege);
      let collection = await prisma.collections.create({
        data: {
          title: title,
          description: description,
          creator: { connect: { wallet: creatorCollection } },
          chainID: chainID,
          contractAddress: contractAddress,
          paymentType: paymentType ? paymentType : null,
          category: category,
          title_lowercase: title.toLowerCase(),
          bannerURL: bannerURL,
          package: packageData,
        },
      });
      let tempCol = { ...collection };
      delete tempCol.id, delete tempCol.active, delete tempCol.disabled, delete tempCol.updatedAt, delete tempCol.createdAt;
      delete tempCol.averagePrice, delete tempCol.totalViews;
      const res = await pinata.pinJSONToIPFS(tempCol);

      return { collection, collectionURI: `https://gateway.pinata.cloud/ipfs/${res.IpfsHash}` };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateCollectionAvgPrice(paginatedCollections) {
    try {
      for (const collection of paginatedCollections) {
        const tokens = await prisma.tokens.findMany({
          where: {
            collectionID: collection.collectionID,
            active: true,
          },
        });
  
        const totalPrices = tokens.reduce((sum, token) => sum + token.price, 0);
        const avgPrice = tokens.length ? totalPrices / tokens.length : 0;
  
        collection.averagePrice = avgPrice;
  
        // Update the collection in the database
        await prisma.collections.update({
          where: { collectionID: collection.collectionID },
          data: { averagePrice: avgPrice },
        });
      }
  
      return paginatedCollections;
    }
    catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getCollections({ limit, offset, orderBy, chainID, title, creatorCollection, category, active }) {
    try {
      let where = {
        disabled: false,
        chainID: chainID,
        OR: [
          {
            title: {
              contains: title,
            },
          },
          {
            title_lowercase: {
              contains: title,
            },
          },
        ],
        creatorCollection: {
          contains: creatorCollection,
        },
        category: {
          contains: category,
        },
      };
  
      if (active !== "") {
        where.active = active === 'true';
      }
  
      let count = await prisma.collections.count({ where });
  
      let collections = await prisma.collections.findMany({
        where,
        include: {
          _count: {
            select: { marketpackages: true },
          },
        },
        orderBy : orderBy.totalSubscribers ? {} : orderBy,
      });
      if (orderBy.totalSubscribers === 'asc') {
        collections.sort((a, b) => b._count.marketpackages - a._count.marketpackages);
      } else if (orderBy.totalSubscribers === 'desc') {
        collections.sort((a, b) => a._count.marketpackages - b._count.marketpackages);
      }
      collections.map((collection) => {
        collection.totalSubscribers = collection._count.marketpackages;
        delete collection._count;
        return collection;
      });
  
      // Paginate collections after sorting
      let paginatedCollections = collections.slice(offset, offset + limit);
  
      // Calculate the average price of a collection with active tokens
      paginatedCollections = await this.updateCollectionAvgPrice(paginatedCollections);

      return {
        collections: paginatedCollections,
        orderBy,
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

  async getCollectionsByWallet({ limit, offset, orderBy, chainID, title, creatorCollection, category, active }) {
    try {
      let where = {
        disabled: false,
        chainID: chainID,
        OR: [
          {
            title: {
              contains: title,
            },
          },
          {
            title_lowercase: {
              contains: title,
            },
          },
        ],
        creatorCollection: {
          contains: creatorCollection,
        },
        category: {
          contains: category,
        },
      };
  
      if (creatorCollection !== "" || category !== "" || active !== "") {
        if (active !== "" ) {
          where.active = active === 'true';
        }
      }

      let count = await prisma.collections.count({ where });
  
      let collections = await prisma.collections.findMany({
        where,
        include: {
          _count: {
            select: { marketpackages: true },
          },
        },
        orderBy : orderBy.totalSubscribers ? {} : orderBy,
      });
      if (orderBy.totalSubscribers === 'asc') {
        collections.sort((a, b) => b._count.marketpackages - a._count.marketpackages);
      } else if (orderBy.totalSubscribers === 'desc') {
        collections.sort((a, b) => a._count.marketpackages - b._count.marketpackages);
      }
      collections.map((collection) => {
        collection.totalSubscribers = collection._count.marketpackages;
        delete collection._count;
        return collection;
      });
  
      // Paginate collections after sorting
      let paginatedCollections = collections.slice(offset, offset + limit);
  
      // Calculate the average price of a collection with active tokens
      paginatedCollections = await this.updateCollectionAvgPrice(paginatedCollections);
  
      return {
        collections: paginatedCollections,
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

  async getCollectionsByTitle(params) {
    try {
      let title = params;

      const collections = await prisma.collections.findMany({
        where: {
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
          active: true,
        },
        include: {
          _count: {
            select: { marketpackages: true },
          },
        },
      });

      collections.map((collection) => {
        collection.totalSubscribers = collection._count.marketpackages;
        delete collection._count;
        return collection;
      });

      // const updatedCollection = await this.updateCollectionAvgPrice(collections);

      return collections;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getCollectionByCollectionID(params) {
    try {
      let { collectionID } = params;
      let collections = await prisma.collections.findMany({
        where: { collectionID: collectionID },
        include: {
          _count: {
            select: { marketpackages: true },
          },
        },
      });

      collections.map((collection) => {
        collection.totalSubscribers = collection._count.marketpackages;
        delete collection._count;
        return collection;
      });

      // const updatedCollection = await this.updateCollectionAvgPrice(collections);

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
        include: {
          _count: {
            select: { marketpackages: true },
          },
        },
      });

      collections.map((collection) => {
        collection.totalSubscribers = collection._count.marketpackages;
        delete collection._count;
        return collection;
      });

      // const updatedCollection = await this.updateCollectionAvgPrice(collections);

      return collections.at(0);
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async viewCollection(params) {
    try {
      let { collectionID } = params;
      let collections = await prisma.collections.findMany({
        where: {
          collectionID: collectionID
        },
        include: {
          _count: {
            select: { marketpackages: true },
          },
        },
      });

      collections.map((collection) => {
        collection.totalSubscribers = collection._count.marketpackages;
        delete collection._count;
        return collection;
      });

      if (collections.length > 0) {
        collections = collections.at(0);
        let collection = await prisma.collections.update({
          where: {
            collectionID: collectionID
          },
          data: {
            totalViews: collections.totalViews + 1
          }
        })
        return collection;
      }
      else return collections;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateCollection(params) {
    try {
      let current = await this.getCollectionByID(params);
      let { collectionID: current_collectionID, title: current_title, description: current_description, bannerURL: current_bannerURL,
        active: current_active, disabled: current_disabled, averagePrice: current_averagePrice, totalViews: current_totalViews, package: current_package } = current;
      let { collectionID: params_collectionID, title: params_title, description: params_description, bannerURL: params_bannerURL,
        active: params_active, disabled: params_disabled, averagePrice: params_averagePrice, totalViews: params_totalViews, package: params_package } = params;

      // params_package.forEach(pkg => delete pkg.privilege);

      let collection = await prisma.collections.update({
        where: { id: current.id },
        data: {
          description: params_description
            ? params_description
            : current_description,
          bannerURL: params_bannerURL ? params_bannerURL : current_bannerURL,
          title: params_title ? params_title : current_title,
          title_lowercase: params_title ? params_title.toLowerCase() : current_title.toLowerCase(),
          collectionID: params_collectionID ? params_collectionID : current_collectionID,
          active: params_active !== undefined ? params_active : current_active,
          disabled: params_disabled !== undefined ? params_disabled : current_disabled,
          averagePrice: params_averagePrice ? params_averagePrice : current_averagePrice,
          totalViews: params_totalViews ? params_totalViews : current_totalViews,
          package: params_package ? params.package : current_package
        },
      });

      if (params_description || params_bannerURL || params_title) {
        let tempCol = { ...collection };
        delete tempCol.id, delete tempCol.active, delete tempCol.disabled;
        delete tempCol.updatedAt, delete tempCol.createdAt;
        delete tempCol.averagePrice, delete tempCol.totalViews;
        delete tempCol.collectionID, delete tempCol.title_lowercase;
        const res = await pinata.pinJSONToIPFS(tempCol);
        if (params.collectionURI) {
          const res2 = await pinata.unpin(params.collectionURI.split('/')[4]);
          console.log("Unpin collection on Pinata: " + res2);
        }
        return { collection, collectionURI: `https://gateway.pinata.cloud/ipfs/${res.IpfsHash}` };
      } else return collection;

    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateCollectionByCollectionID(params) {
    try {
      let current = await this.getCollectionByCollectionID(params);
      let { collectionID: current_collectionID, title: current_title, description: current_description, bannerURL: current_bannerURL,
        active: current_active, disabled: current_disabled, averagePrice: current_averagePrice, totalViews: current_totalViews, 
        package: current_package } = current;
      let { collectionID: params_collectionID, title: params_title, description: params_description, bannerURL: params_bannerURL,
        active: params_active, disabled: params_disabled, averagePrice: params_averagePrice, totalViews: params_totalViews, 
        package: params_package } = params;

      params_package.forEach(pkg => delete pkg.privilege);

      console.log(params_package);

      let collection = await prisma.collections.update({
        where: { id: current.id },
        data: {
          description: params_description
            ? params_description
            : current_description,
          bannerURL: params_bannerURL ? params_bannerURL : current_bannerURL,
          title: params_title ? params_title : current_title,
          title_lowercase: params_title ? params_title.toLowerCase() : current_title.toLowerCase(),
          collectionID: params_collectionID ? params_collectionID : current_collectionID,
          active: params_active !== undefined ? params_active : current_active,
          disabled: params_disabled !== undefined ? params_disabled : current_disabled,
          averagePrice: params_averagePrice ? params_averagePrice : current_averagePrice,
          totalViews: params_totalViews ? params_totalViews : current_totalViews,
          package: params_package ? params.package : current_package
        },
      });

      if (params_description || params_bannerURL || params_title) {
        let tempCol = { ...collection };
        delete tempCol.id, delete tempCol.active, delete tempCol.disabled;
        delete tempCol.updatedAt, delete tempCol.createdAt;
        delete tempCol.averagePrice, delete tempCol.totalViews;
        delete tempCol.collectionID, delete tempCol.title_lowercase;
        const res = await pinata.pinJSONToIPFS(tempCol);
        if (params.collectionURI) {
          const res2 = await pinata.unpin(params.collectionURI.split('/')[4]);
          console.log("Unpin collection on Pinata: " + res2);
        }
        return { collection, collectionURI: `https://gateway.pinata.cloud/ipfs/${res.IpfsHash}` };
      } else return collection;

    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
}

module.exports = CollectionService;
