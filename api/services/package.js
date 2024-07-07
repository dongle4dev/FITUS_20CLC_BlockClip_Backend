const prisma = require("../../prisma");
let { hasNextPage } = require("../utils/request-utils");
let constants = require("../../config/constants");
let helper = require("../utils/helper");

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

  async getSubscriber({
    userWallet,
    limit,
    offset,
    orderBy,
    id,
    collectionID,
  }) {
    try {
      let where;
      if (id) {
        where = {
          subscriber: {
            equals: userWallet,
          },
          id: {
            equals: id,
          },
        };
      } else if (collectionID) {
        where = {
          subscriber: {
            equals: userWallet,
          },
          collectionID: {
            equals: collectionID,
          },
          status: 1,
        };
      } else {
        where = {
          subscriber: {
            equals: userWallet,
          },
        };
      }
      let count = await prisma.marketpackages.count({ where });

      let marketPackages = await prisma.marketpackages.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      });

      if (marketPackages) {
        return {
          marketPackages,
          count,
          limit,
          offset
        };
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

  async getSubscriberByUser(params) {
    try {
      let { userWallet, 
            limit,
            offset,
            orderBy
      } = params;
    
      let where = {
        OR: [
          {
            subscriber: {
              contains: userWallet,
            },
          },
          {
            seller: {
              contains: userWallet,
            },
          },
        ]
      }

      orderBy = { createdAt: 'desc'};

      let marketPackages = await prisma.marketpackages.findMany({
        where,
        orderBy
      });

      let count = await prisma.marketpackages.count({ where });

      if (marketPackages) {
        return {
          marketPackages,
          count,
          limit,
          offset
        };
      } else {
        throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
      }
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getSubscriberByCollectionID(params) {
    try {
      let { userWallet, collectionID } = params;

      let marketPackages = await prisma.marketpackages.findMany({
        where: {
          OR: [
            {
              subscriber: {
                equals: userWallet,
              },
            },
            {
              seller: {
                equals: userWallet,
              },
            },
          ],
          collectionID: {
            equals: collectionID,
          },
          status: 1,
        },
      });
      return marketPackages;
    } catch (err) {
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
          status: 1,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      });

      if (marketPackages.length > 0) {
        return {
          packageType: marketPackages[0].packageType,
        };
      } else return "No packages found.";
    } catch (err) {
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getRevenueByTime(type, from, to, payment, priceRate) {
    try {
      const results = [];

      let currentDate = new Date(from);
      let end = new Date(to);
      if (to === "") {
        end = new Date();
      }

      while (currentDate <= end) {
        let periodStart, periodEnd;
        if (type === "MONTH") {
          periodStart = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            1
          );
          periodEnd = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            0,
            23,
            59,
            59,
            999
          );
          currentDate.setMonth(currentDate.getMonth() + 1);
        } else if (type === "YEAR") {
          periodStart = new Date(currentDate.getFullYear(), 0, 1);
          periodEnd = new Date(
            currentDate.getFullYear(),
            11,
            31,
            23,
            59,
            59,
            999
          );
          currentDate.setFullYear(currentDate.getFullYear() + 1);
        } else if (type === "WEEK") {
          periodStart = new Date(currentDate);
          periodStart.setDate(periodStart.getDate() - periodStart.getDay()); // Start of the week (Sunday)
          periodEnd = new Date(periodStart);
          periodEnd.setDate(periodEnd.getDate() + 6); // End of the week (Saturday)
          periodEnd.setHours(23, 59, 59, 999);
          currentDate.setDate(currentDate.getDate() + 7);
        } else {
          periodStart = new Date(currentDate);
          periodEnd = new Date(end);

          const count = await prisma.marketpackages.count({
            where: {
              createdAt: {
                gte: periodStart,
                lt: periodEnd,
              },
            },
          });
          const packages = await prisma.marketpackages.findMany({
            where: {
              createdAt: {
                gte: periodStart,
                lt: periodEnd,
              },
            },
          });
          
          return {
            results: {
              from: periodStart.toLocaleDateString(),
              to: periodEnd.toLocaleDateString(),
              revenue: packages.reduce((acc, curr) =>  { return (payment === curr.paymentType) ? acc + curr.price : acc + (curr.price / priceRate)}, 0),
              count: count,
            },
          };
        }

        const count = await prisma.marketpackages.count({
          where: {
            createdAt: {
              gte: periodStart,
              lt: periodEnd,
            },
          },
        });
        const packages = await prisma.marketpackages.findMany({
          where: {
            createdAt: {
              gte: periodStart,
              lt: periodEnd,
            },
          },
        });
        
        results.push({
          from: periodStart.toLocaleDateString(),
          to: periodEnd.toLocaleDateString(),
          revenue: packages.reduce((acc, curr) =>  { return (payment === curr.paymentType) ? acc + curr.price : acc + (curr.price / priceRate)}, 0),
          count,
        });

      }

      return {
        results,
        revenue: results.reduce((acc, curr) =>  acc + curr.revenue, 0),
        count: results.reduce((acc, curr) => acc + curr.count, 0),
      };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getSubscribersByTime(type, from, to) {
    try {
      const results = [];

      let currentDate = new Date(from);
      let end = new Date(to);
      if (to === "") {
        end = new Date();
      }

      while (currentDate <= end) {
        let periodStart, periodEnd;
        if (type === "MONTH") {
          periodStart = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            1
          );
          periodEnd = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            0,
            23,
            59,
            59,
            999
          );
          currentDate.setMonth(currentDate.getMonth() + 1);
        } else if (type === "YEAR") {
          periodStart = new Date(currentDate.getFullYear(), 0, 1);
          periodEnd = new Date(
            currentDate.getFullYear(),
            11,
            31,
            23,
            59,
            59,
            999
          );
          currentDate.setFullYear(currentDate.getFullYear() + 1);
        } else if (type === "WEEK") {
          periodStart = new Date(currentDate);
          periodStart.setDate(periodStart.getDate() - periodStart.getDay()); // Start of the week (Sunday)
          periodEnd = new Date(periodStart);
          periodEnd.setDate(periodEnd.getDate() + 6); // End of the week (Saturday)
          periodEnd.setHours(23, 59, 59, 999);
          currentDate.setDate(currentDate.getDate() + 7);
        } else {
          periodStart = new Date(currentDate);
          periodEnd = new Date(end);

          const subscriber = await prisma.marketpackages.count({
            where: {
              createdAt: {
                gte: periodStart,
                lt: periodEnd,
              },
            },
          });

          return {
            results: {
              from: periodStart.toLocaleDateString(),
              to: periodEnd.toLocaleDateString(),
              count: subscriber,
            },
          };
        }

        const subscriber = await prisma.marketpackages.count({
          where: {
            createdAt: {
              gte: periodStart,
              lt: periodEnd,
            },
          },
        });

        results.push({
          from: periodStart.toLocaleDateString(),
          to: periodEnd.toLocaleDateString(),
          count: subscriber,
        });
      }

      return {
        results,
        count: results.reduce((acc, curr) => acc + curr.count, 0),
      };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
}

module.exports = PackageService;
