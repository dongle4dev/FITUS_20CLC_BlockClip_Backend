const prisma = require("../../prisma");
let { hasNextPage } = require("../utils/request-utils");
let constants = require("../../config/constants");
let zeroxUtil = require("../utils/zerox-util");
const helper = require("../utils/helper");
const tokenService = require("./token");
let tokenServiceInstance = new tokenService();

/**
 * Includes all the Order services that controls
 * the Order Data object from the database
 */

class MarketOrderService {
  async placeFixedOrder(params) {
    try {
      let { tokenID, chainID, tokenAddress, paymentType, seller, status, price, event } = params;
      let order = await prisma.marketorders.create({
        data: {
          sellerWallet: { connect: { wallet: seller } },
          tokens: { connect: { tokenID: tokenID } },
          chainID: chainID,
          tokenAddress: tokenAddress,
          paymentType: paymentType,
          status: status,
          price: price,
          event: event
        },
      });
      return order;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  //   async placeNegotiationOrder(params) {
  //     try {
  //       let { taker_address, taker_token, taker_token_id, min_price, price, token_type, price_per_unit, min_price_per_unit, quantity, usd_price, maker_token, type, chain_id } = params
  //       let order = await prisma.orders.create({
  //         data: {
  //           seller_users: { connect: { id: parseInt(taker_address) } },
  //           categories: { connect: { id: parseInt(taker_token) } },
  //           taker_address: taker_address,
  //           tokens: {
  //             connect: {
  //               token_id_categories_id: {
  //                 token_id: taker_token_id,
  //                 categories_id: parseInt(taker_token),
  //               },
  //             },
  //           },
  //           min_price: min_price,
  //           price: price,
  //           token_type: token_type,
  //           price_per_unit: price_per_unit,
  //           min_price_per_unit: min_price_per_unit,
  //           quantity: quantity,
  //           usd_price: parseFloat(usd_price),
  //           taker_amount: "1",
  //           erc20tokens: { connect: { id: parseInt(maker_token) } },
  //           type: type,
  //           chain_id: chain_id,
  //         },
  //       });
  //       return order;
  //     } catch (err) {
  //       console.log(err);
  //       throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  //     }
  //   }

  //   async placeAuctionOrder(params) {
  //     try {
  //       let { expiry_date, taker_address, taker_token, maker_token, min_price, chain_id, taker_token_id } = params
  //       let order = await prisma.orders.create({
  //         data: {
  //           expiry_date: new Date(parseInt(expiry_date)),
  //           seller_users: { connect: { id: parseInt(taker_address) } },
  //           taker_address: taker_address,
  //           categories: { connect: { id: parseInt(taker_token) } },
  //           tokens_id: taker_token_id,
  //           min_price: min_price,
  //           taker_amount: "1",
  //           price: min_price,
  //           erc20tokens: { connect: { id: parseInt(maker_token) } },
  //           type: type,
  //           chain_id: chain_id,
  //         },
  //       });
  //       return order;
  //     } catch (err) {
  //       console.log(err);
  //       throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  //     }
  //   }

  async getOrders({ tokenID, status, limit, offset, orderBy }) {
    try {
      let where = {
        tokenID: {
          contains: tokenID
        },
        status: status ? parseInt(status) : {
          not: 5
        }
      };

      let count = await prisma.marketorders.count({ where });
      let order = await prisma.marketorders.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      });
      return {
        order,
        count
      };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getTokensByOrder({ status, active, limit, offset, orderBy }) {
    try {
      let where;
      if (active !== "") {
        where = {
          status: status ? parseInt(status) : {
            not: 5
          },
          tokens: {
            is: {
              active: active == 'true'
            }
          },
        };
      } else {
        where = {
          status: status ? parseInt(status) : {
            not: 5
          }
        };
      }

      let count = await prisma.marketorders.count({ where });
      let orders = await prisma.marketorders.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        select: {
          tokens: true
        },
        distinct: ['tokenID']
      });
      let tokens = orders.map((order) => {
        return order.tokens;
      })
      return {
        tokens,
        count
      };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  //   async getOrderList() {
  //     try {
  //       let where = {
  //         AND: [{ active: true }, { status: 0 }],
  //       };

  //       let order = await prisma.marketorders.findMany({
  //         where,
  //         select: {
  //           id: true,
  //           price: true,
  //           erc20tokens: {
  //             select: {
  //               symbol: true,
  //             },
  //           },
  //           categories: {
  //             include: {
  //               categoriesaddresses: {
  //                 where: { chain_id: constants.MATIC_CHAIN_ID },
  //                 select: { address: true, ethereum_address: true },
  //               },
  //             },
  //           },
  //           tokens_id: true,
  //         },
  //       });
  //       return order;
  //     } catch (err) {
  //       console.log(err);
  //       throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  //     }
  //   }

  //   async getFullOrderList() {
  //     try {
  //       let where = {
  //         AND: [{ active: true }, { status: 0 }],
  //       };

  //       let order = await prisma.orders.findMany({
  //         where,
  //         select: {
  //           id: true,
  //           price: true,
  //           erc20tokens: {
  //             select: {
  //               symbol: true,
  //             },
  //           },
  //           categories: {
  //             include: {
  //               categoriesaddresses: {
  //                 where: { chain_id: constants.MATIC_CHAIN_ID },
  //                 select: { address: true, ethereum_address: true },
  //               },
  //             },
  //           },
  //           tokens_id: true,
  //         },
  //         orderBy: { id: constants.SORT_DIRECTION.DESC },
  //       });
  //       return order;
  //     } catch (err) {
  //       console.log(err);
  //       throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  //     }
  //   }

  //   async getAuctionOrders() {
  //     try {
  //       let order = await prisma.orders.findMany({
  //         where: {
  //           status: 0,
  //           active: true,
  //           type: "AUCTION",
  //         },
  //         select: { id: true, expiry_date: true },
  //       });
  //       return order;
  //     } catch (err) {
  //       console.log(err);
  //       throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  //     }
  //   }

  async getNewestOrder(params) {
    try {
      let { tokenID } = params;
      const orderBy = {
        createdAt: "desc"
      }
      let order = await prisma.marketorders.findMany({
        where: {
          tokenID: tokenID,
        },
        orderBy,
        take: 1
      });
      return order;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  //   async orderExists(params) {
  //     try {
  //       let { orderId } = params
  //       let order = await prisma.orders.findOne({
  //         where: {
  //           id: parseInt(orderId),
  //         },
  //       });
  //       return order;
  //     } catch (err) {
  //       console.log(err);
  //       throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  //     }
  //   }

  async checkValidOrder(params) {
    try {
      let { tokenID, seller, status } = params;
      let order = await prisma.marketorders.findMany({
        where: {
          tokenID: tokenID,
          status: status ? parseInt(status) : 1,
          seller: seller ? seller : {
            contains: ""
          },
        },
      });

      if (order.length > 0) {
        return { order_id: order[0].id, active_order: true };
      } else {
        return { order_id: null, active_order: false };
      }
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  //   async buyFixedOrder(params) {
  //     try {
  //       let { signature, takerSign, orderId, taker_address } = params;
  //       let txHash = await zeroxUtil.execute(
  //         JSON.parse(signature),
  //         JSON.parse(takerSign)
  //       );
  //       let order = await prisma.orders.update({
  //         where: { id: parseInt(orderId) },
  //         data: {
  //           buyer_users: { connect: { id: parseInt(taker_address) } },
  //           taker_address: taker_address,
  //           txhash: txHash,
  //           status: 2,
  //           updated: new Date(),
  //         },
  //       });
  //       return order;
  //     } catch (err) {
  //       console.log(err);
  //       throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  //     }
  //   }

  //   async swapToken(params) {
  //     try {
  //       let { signedOrder } = params;
  //       let tx = await zeroxUtil.executeSwap(signedOrder);
  //       return tx;
  //     } catch (err) {
  //       console.log(err);
  //       throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  //     }
  //   }
  async getOrderByID(params) {
    try {
      let { id } = params;
      let marketorders = await prisma.marketorders.findMany({
        where: { id: id },
      });
      return marketorders.at(0);
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateOrder(params) {
    try {
      let current = await this.getOrderByID(params);
      let { price: current_price, status: current_status,
        buyer: current_buyer } = current;
      let { price: params_price, status: params_status,
        buyer: params_buyer, tokenURI: params_tokenURI, collectionID: params_collectionID } = params;

      if (parseInt(params_status) === 0) {
        console.log(params_status)
        let order = await prisma.marketorders.update({
          where: { id: params.id },
          data: {
            price: params_price ? params_price : current_price,
            status: params_status,
            buyerWallet: { connect: { wallet: params_buyer } }
          },
        });


        let token = await tokenServiceInstance.updateTokenByTokenID({
          tokenID: current.tokenID,
          owner: params_buyer,
          tokenURI: params_tokenURI,
          collectionID: params_collectionID
        })

        return { order, token: token.token, tokenURI: token.tokenURI };
      } else {
        let order = await prisma.marketorders.update({
          where: { id: params.id },
          data: {
            price: params_price ? params_price : current_price,
            status: params_status !== undefined ? params_status : current_status,
          },
        });
        return order;
      }
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  //   async makeBid(params) {
  //     const order = await prisma.orders.update({
  //       where: { id: parseInt(params.orderId) },
  //       data: {
  //         bids: {
  //           create: [
  //             {
  //               price: params.bid,
  //               signature: params.signature,
  //               users: { connect: { id: parseInt(params.maker_address) } },
  //             },
  //           ],
  //         },
  //         updated: new Date(),
  //       },
  //     });
  //     return order;
  //   }

  //   async cancelOrder(params) {
  //     try {
  //       let txHash = "";
  //       let { orderId, signature, takerSign } = params;
  //       if (params.type === constants.ORDER_TYPES.FIXED) {
  //         txHash = await zeroxUtil.execute(
  //           JSON.parse(signature),
  //           JSON.parse(takerSign)
  //         );
  //       }
  //       let order = await prisma.orders.update({
  //         where: { id: parseInt(orderId) },
  //         data: {
  //           status: 3,
  //           signature: "",
  //           txhash: txHash,
  //           updated: new Date(),
  //         },
  //       });
  //       return order;
  //     } catch (err) {
  //       console.log(err);
  //       throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  //     }
  //   }

  //   async expireOrder(params) {
  //     try {
  //       let { orderId } = params;
  //       let order = await prisma.orders.update({
  //         where: { id: parseInt(orderId) },
  //         data: {
  //           status: 3,
  //           signature: "",
  //           updated: new Date(),
  //         },
  //       });
  //       return order;
  //     } catch (err) {
  //       console.log(err);
  //       throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  //     }
  //   }

  //   async cancelBid(params) {
  //     let { signature, takerSign, bidId } = params;
  //     let txHash = await zeroxUtil.execute(
  //       JSON.parse(signature),
  //       JSON.parse(takerSign)
  //     );
  //     const order = await prisma.bids.update({
  //       where: { id: parseInt(bidId) },
  //       data: {
  //         status: 3,
  //         signature: "",
  //       },
  //     });
  //     return order;
  //   }

  //   async clearBids(params) {
  //     let { bidId } = params
  //     const order = await prisma.bids.update({
  //       where: { id: parseInt(bidId) },
  //       data: {
  //         status: 3,
  //         signature: "",
  //       },
  //     });
  //     return order;
  //   }

  //   async bidExists(params) {
  //     try {
  //       let { bidId } = params;
  //       let bid = await prisma.bids.findOne({
  //         where: {
  //           id: parseInt(bidId),
  //         },
  //       });
  //       return bid;
  //     } catch (err) {
  //       console.log(err);
  //       throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  //     }
  //   }

  //   async executeOrder(params) {
  //     try {
  //       let { maker_address, maker_amount } = params;
  //       let txHash = await zeroxUtil.execute(
  //         JSON.parse(params.signature),
  //         JSON.parse(params.takerSign)
  //       );
  //       let order = await prisma.orders.update({
  //         where: { id: parseInt(params.orderId) },
  //         data: {
  //           buyer_users: { connect: { id: parseInt(params.maker_address) } },
  //           maker_address: maker_address,
  //           maker_amount: maker_amount,
  //           txhash: txHash,
  //           status: 2,
  //           updated: new Date(),
  //         },
  //       });
  //       return order;
  //     } catch (err) {
  //       console.log(err);
  //       throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  //     }
  //   }

  //   async getBids({ orderId, limit, offset, orderBy }) {
  //     try {
  //       let where = {
  //         AND: [{ active: true }, { status: 0 }],
  //       };

  //       // let bids = await prisma.bids.findMany({
  //       //   where: {
  //       //     orders_id: parseInt(orderId),
  //       //     status: 0,
  //       //   },
  //       //   include: {
  //       //     users: true,
  //       //     orders: {
  //       //       select: {
  //       //         erc20tokens: {
  //       //           select: {
  //       //             erc20tokensaddresses: {
  //       //               where: { chain_id: constants.MATIC_CHAIN_ID },
  //       //             },
  //       //           },
  //       //         },
  //       //       },
  //       //     },
  //       //   },
  //       // });
  //       // // here
  //       // for (const data of bids) {
  //       //   let orderInvalid = false;
  //       //   if (data.signature) {
  //       //     let signedOrder = JSON.parse(data.signature);
  //       //     const contractWrappers = new ContractWrappers(
  //       //       helper.providerEngine(),
  //       //       {
  //       //         chainId: parseInt(constants.MATIC_CHAIN_ID),
  //       //       }
  //       //     );

  //       //     const [
  //       //       { orderStatus, orderHash },
  //       //       remainingFillableAmount,
  //       //       isValidSignature,
  //       //     ] = await contractWrappers.devUtils
  //       //       .getOrderRelevantState(signedOrder, signedOrder.signature)
  //       //       .callAsync();

  //       //     orderInvalid = !(
  //       //       orderStatus === OrderStatus.Fillable &&
  //       //       remainingFillableAmount.isGreaterThan(0) &&
  //       //       isValidSignature
  //       //     );

  //       //     if (
  //       //       !(await helper.checkTokenBalance(
  //       //         signedOrder.makerAddress,
  //       //         signedOrder.makerAssetAmount,
  //       //         data.orders.erc20tokens.erc20tokensaddresses[0].address
  //       //       )) ||
  //       //       orderInvalid
  //       //     ) {
  //       //       await this.clearBids({ bidId: data.id });
  //       //     }
  //       //   }
  //       // }
  //       //here

  //       let count = await prisma.bids.count({ where });
  //       let order = await prisma.bids.findMany({
  //         where: {
  //           orders_id: parseInt(orderId),
  //           status: 0,
  //         },
  //         orderBy: {
  //           price: constants.SORT_DIRECTION.DESC,
  //         },
  //         take: limit,
  //         skip: offset,
  //         include: {
  //           users: true,
  //           orders: {
  //             select: {
  //               erc20tokens: {
  //                 select: {
  //                   erc20tokensaddresses: {
  //                     where: { chain_id: constants.MATIC_CHAIN_ID },
  //                   },
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       });
  //       return {
  //         order,
  //         limit,
  //         offset,
  //         has_next_page: hasNextPage({ limit, offset, count }),
  //       };
  //     } catch (err) {
  //       console.log(err);
  //       throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  //     }
  //   }
}

module.exports = MarketOrderService;
