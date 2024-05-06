const prisma = require("../../prisma");
let { hasNextPage } = require("../utils/request-utils");
let constants = require("../../config/constants");

class PackageService {
  // User subscribe a collection
  async subscribeCollection(params) {
    try {
      let {
        userWallet,
        chainID,
        collectionID,
        paymentType,
        packageType,
        status,
        price,
        seller,
      } = params;

      let marketPackage = await prisma.marketpackages.create({
        data: {
          chainID: chainID,
          paymentType: paymentType,
          packageType: packageType,
          status: status,
          price: price,
          subscriberWallet: { connect: { wallet: userWallet } },
          sellerWallet: { connect: { wallet: seller } },
          collection: collectionID
            ? { connect: { collectionID: collectionID } }
            : null,
        },
      });

      return marketPackage;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  // Check expire of a subscriber
  async checkExpire(params) {
    try {
      let { userWallet } = params;
      let currentDate = new Date();
      let timeExpired;

      let marketPackages = await prisma.marketpackages.findMany({
        where: {
          subscriber: {
            equals: userWallet,
          },
        },
      });

      marketPackages.forEach(async (pkg) => {
        if (pkg.packageType === 1) {
          // time Expired is 30 day
          timeExpired = 30;
        } else if (pkg.packageType === 2) {
          // time Expired is 90 day
          timeExpired = 90;
        } else {
          // time Expired is 365 day
          timeExpired = 365;
        }

        const expireDate = new Date(pkg.createdAt);
        expireDate.setDate(expireDate.getDate() + timeExpired);

        if (expireDate.toISOString() < currentDate.toISOString()) {
          await this.updateMarketPackage({ id: pkg.id, status: 2 });
        }
      });
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateMarketPackage(params) {
    try {
      let {
        id: params_id,
        status: params_status,
        collectionID: params_collectionID,
        chainID: params_chainID,
        paymentType: params_paymentType,
        packageType: params_packageType,
        price: params_Price,
      } = params;

      let {
        status: current_status,
        collectionID: current_collectionID,
        chainID: current_chainID,
        paymentType: current_paymentType,
        packageType: current_packageType,
        price: current_Price,
      } = await prisma.marketpackages.findUnique({
        where: {
          id: params_id,
        },
      });

      const marketPackage = await prisma.marketpackages.update({
        where: {
          id: params_id,
        },
        data: {
          status: params_status ? params_status : current_status,
          chainID: params_chainID ? params_chainID : current_chainID,
          paymentType: params_paymentType
            ? params_paymentType
            : current_paymentType,
          packageType: params_packageType
            ? params_packageType
            : current_packageType,
          price: params_Price ? params_Price : current_Price,
          collection: params_collectionID
            ? { connect: { collectionID: params_collectionID } }
            : { connect: { collectionID: current_collectionID } },
        },
      });

      if (!marketPackage) {
        throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
      } else {
        return marketPackage;
      }
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  // get all subscribe of a user
  async getSubscriber({ userWallet, limit, offset, orderBy, id, collectionID }) {
    try {
      let where
      if (id) {
        where = {
          subscriber: {
            equals: userWallet,
          },
          id: {
            equals: id,
          },
        };
      }
      else if (collectionID) 
      {
        return await this.getPackageType({ userWallet, collectionID });
      }
      else {
        where = {
          subscriber: {
            equals: userWallet,
          },
        };
      }

      let marketPackages = await prisma.marketpackages.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      });

      if (marketPackages) {
        return marketPackages;
      } else {
        throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
      }
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getSubscriberByID(params) {
    try {
      let { userWallet, id } = params;

      let marketPackages = await prisma.marketpackages.findMany({
        where: {
          subscriber: {
            equals: userWallet,
          },
          id: {
            equals: id,
          },
        },
      });

      return marketPackages;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getPackageType(params) {
    try {
      let { userWallet, collectionID } = params;
      let marketPackages = await prisma.marketpackages.findMany({
        where: {
          subscriber: {
            equals: userWallet,
          },
          collectionID: {
            equals: collectionID,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      });

      if (marketPackages.length > 0) {
        return {
          "packageType": marketPackages[0].packageType
        };
      }
      else 
        return {
          "packageType": 0
        };
      
    } catch (err) {
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
}

module.exports = PackageService;
