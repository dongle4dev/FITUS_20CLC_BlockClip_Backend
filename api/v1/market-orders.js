const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const MarketOrderService = require("../services/market-order");
let marketOrderServiceInstance = new MarketOrderService();
const TokenService = require("../services/token");
const tokenServiceInstance = new TokenService();
const verifyToken = require("../middlewares/verify-token");
let requestUtil = require("../utils/request-utils");
let helper = require("../utils/helper");
let constants = require("../../config/constants");
let config = require("../../config/config");
// let { BigNumber } = require("@0x/utils");

/**
 * Order routes
 */

/**
 *  Create a new order
 */

router.post(
  "/",
  [
    check("seller", "A seller id is required").exists(),
    check("tokenID", "A token id is required").exists(),
  ],
  verifyToken,
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let {
        tokenID, chainID, tokenAddress, paymentType, seller, status, price, event
      } = req.body;

      let validOrder = await marketOrderServiceInstance.checkValidOrder({
        seller: seller,
        tokenID,
      });

      if (validOrder.active_order) {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: constants.MESSAGES.INPUT_VALIDATION_ERROR,
        });
      }

      let order = await marketOrderServiceInstance.placeFixedOrder({
        tokenID, chainID, tokenAddress, paymentType, seller, status, price, event
      });

      if (order) {
        // helper.notify({
        //   userId: req.userId,
        //   message:
        //     "You placed a " +
        //     type +
        //     " sell order on " +
        //     category.name +
        //     " token",
        //   order_id: orderAdd.id,
        // });
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: order });
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: constants.RESPONSE_STATUS.FAILURE });
      }
    } catch (err) {
      console.log(err);
      return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
);

/**
 *  Check a order is listed
 */

router.get(
  "/:tokenID/isListed",
  check("tokenID", "A seller id is required").exists(),
  // verifyToken,
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let tokenID = req.params.tokenID;
      let status = requestUtil.getKeyword(req.query, "status");

      let validOrder = await marketOrderServiceInstance.checkValidOrder({
        tokenID,
        status
      });

      if (validOrder.active_order) {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: constants.MESSAGES.SUCCESS,
          data: { isListed: true }
        });
      } else {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: constants.MESSAGES.SUCCESS,
          data: { isListed: false }
        });
      }
    } catch (err) {
      console.log(err);
      return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
);

/**
 *  Get a market order (newest) of a nft
 */

router.get(
  "/:tokenID/newest",
  check("tokenID", "A seller id is required").exists(),
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let tokenID = req.params.tokenID;

      let validOrder = await marketOrderServiceInstance.getNewestOrder({
        tokenID,
      });

      if (validOrder) {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: constants.MESSAGES.SUCCESS,
          data: validOrder
        });
      } else {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: constants.MESSAGES.FAILURE,
        });
      }
    } catch (err) {
      console.log(err);
      return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
);

// router.post("/executeMetaTx", async (req, res) => {
//   const { intent, fnSig, from, contractAddress } = req.body;
//   const txDetails = { intent, fnSig, from, contractAddress };
//   let txResult;
//   try {
//     txResult = await helper.executeMetaTransaction(txDetails);
//   } catch (err) {
//     console.log(err);
//     return res
//       .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
//       .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
//   }
//   return res
//     .status(constants.RESPONSE_STATUS_CODES.OK)
//     .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: txResult });
// });

/**
 *  Gets all the order details
 */

router.get(
  "/",
  async (req, res) => {
    try {
      let limit = requestUtil.getLimit(req.query);
      let offset = requestUtil.getOffset(req.query);
      let orderBy = requestUtil.getSortBy(req.query, "+id");
      let tokenID = requestUtil.getKeyword(req.query, "tokenID");
      let status = requestUtil.getKeyword(req.query, "status");

      let orders = await marketOrderServiceInstance.getOrders({
        tokenID,
        status,
        limit,
        offset,
        orderBy,
      });

      if (orders) {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: constants.RESPONSE_STATUS.SUCCESS,
          data: {
            order: orders.order,
            count: orders.count
          },
        });
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.NOT_FOUND)
          .json({ message: constants.RESPONSE_STATUS.NOT_FOUND });
      }
    } catch (err) {
      console.log(err);
      return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
);

/**
 *  Gets all the tokens details by status, price
 */

router.get(
  "/tokens",
  async (req, res) => {
    try {
      let limit = requestUtil.getLimit(req.query);
      let offset = requestUtil.getOffset(req.query);
      let orderBy = requestUtil.getSortBy(req.query, "+id");
      let status = requestUtil.getKeyword(req.query, "status");
      let active = requestUtil.getKeyword(req.query, "active");

      let orders = await marketOrderServiceInstance.getTokensByOrder({
        status,
        active,
        limit,
        offset,
        orderBy,
      });

      if (orders) {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: constants.RESPONSE_STATUS.SUCCESS,
          data: {
            tokens: orders.tokens,
            count: orders.count
          },
        });
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.NOT_FOUND)
          .json({ message: constants.RESPONSE_STATUS.NOT_FOUND });
      }
    } catch (err) {
      console.log(err);
      return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
);

/**
 *  Gets single order details
 *  @params orderId type: int
 */

router.get(
  "/:orderId",
  [check("orderId", "A valid id is required").exists()],
  async (req, res) => {
    try {
      let order = await marketOrderServiceInstance.getOrderByID(req.params);
      if (order) {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: constants.RESPONSE_STATUS.SUCCESS,
          data: order,
        });
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.NOT_FOUND)
          .json({ message: constants.RESPONSE_STATUS.NOT_FOUND });
      }
    } catch (err) {
      console.log(err);
      return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
);

/**
 *  Updates an existing market orders of NFT token by id
 */

router.put(
  "/:id",
  verifyToken,
  async (req, res) => {
    try {
      let params = { ...req.params, ...req.body };

      if (!params.id) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
      }

      let ordersExists = await marketOrderServiceInstance.getOrderByID(params);

      if (ordersExists.length === 0) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "market orders doesnt exists" });
      }

      let order = await marketOrderServiceInstance.updateOrder(
        params
      );
      if (order) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: "market orders updated successfully", data: order });
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "market orders update failed" });
      }
    } catch (err) {
      console.log(err);
      return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
);

/**
 *  Buy order
 *  @params orderId type: int
 *  @params bid type: string
 */

// router.patch(
//   "/:orderId/buy",
//   [check("orderId", "A valid order id is required").exists()],
//   verifyToken,
//   async (req, res) => {
//     try {
//       const errors = validationResult(req);

//       if (!errors.isEmpty()) {
//         return res
//           .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//           .json({ error: errors.array() });
//       }

//       let orderId = req.params.orderId;
//       let { bid, signature, taker_signature } = req.body;

//       let order = await marketOrderServiceInstance.orderExists({ orderId });

//       if (!order || order.status !== 0) {
//         return res
//           .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//           .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
//       }

//       if (
//         (order.type === constants.ORDER_TYPES.FIXED &&
//           order.maker_address === req.userId) ||
//         (order.type !== constants.ORDER_TYPES.FIXED &&
//           order.taker_address === req.userId)
//       ) {
//         return res
//           .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//           .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
//       }

//       let category = await categoryServiceInstance.getCategory({
//         categoryId: order.categories_id,
//       });

//       let erc20Token = await erc20TokenServiceInstance.getERC20Token({
//         id: order.erc20tokens_id,
//       });

//       if (!order || order.status !== 0) {
//         return res
//           .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//           .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
//       }

//       let orderAdd;

//       switch (order.type) {
//         case constants.ORDER_TYPES.FIXED: {
//           orderAdd = await marketOrderServiceInstance.buyFixedOrder({
//             orderId,
//             taker_address: req.userId,
//             signature: order.signature,
//             takerSign: taker_signature,
//           });

//           if (orderAdd) {
//             helper.notify({
//               userId: req.userId,
//               message:
//                 "You bought a " +
//                 category.name +
//                 " token for " +
//                 orderAdd.taker_amount +
//                 " " +
//                 erc20Token.symbol,
//               order_id: orderAdd.id,
//               type: "SWAP",
//             });
//             helper.notify({
//               userId: orderAdd.maker_address,
//               message:
//                 "Your " +
//                 category.name +
//                 " token has been bought for " +
//                 orderAdd.taker_amount +
//                 " " +
//                 erc20Token.symbol,
//               order_id: orderAdd.id,
//               type: "SWAP",
//             });
//           }
//           break;
//         }
//         case constants.ORDER_TYPES.NEGOTIATION: {
//           if (!bid || !signature) {
//             return res
//               .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//               .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
//           }

//           if (parseFloat(bid) > parseFloat(order.price)) {
//             return res
//               .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//               .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
//           }
//           orderAdd = await marketOrderServiceInstance.makeBid({
//             orderId,
//             bid,
//             signature,
//             maker_address: req.userId,
//           });
//           if (orderAdd) {
//             helper.notify({
//               userId: req.userId,
//               message:
//                 "You made an offer of " +
//                 bid +
//                 " " +
//                 erc20Token.symbol +
//                 " on " +
//                 category.name +
//                 " token",
//               order_id: orderAdd.id,
//             });
//             helper.notify({
//               userId: orderAdd.taker_address,
//               message:
//                 "An offer of " +
//                 bid +
//                 " " +
//                 erc20Token.symbol +
//                 " has been made on your " +
//                 category.name +
//                 " token",
//               order_id: orderAdd.id,
//             });
//           }
//           break;
//         }
//         case constants.ORDER_TYPES.AUCTION: {
//           if (!bid || !signature) {
//             return res
//               .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//               .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
//           }
//           orderAdd = await marketOrderServiceInstance.makeBid({
//             orderId,
//             bid,
//             signature,
//             maker_address: req.userId,
//           });
//           if (orderAdd) {
//             helper.notify({
//               userId: req.userId,
//               message:
//                 "You placed a bid of " +
//                 bid +
//                 " on " +
//                 category.name +
//                 " token",
//               order_id: orderAdd.id,
//             });
//             helper.notify({
//               userId: orderAdd.taker_address,
//               message:
//                 "A bid of " +
//                 bid +
//                 " has been placed on your " +
//                 category.name +
//                 " token",
//               order_id: orderAdd.id,
//             });
//           }
//           break;
//         }
//       }
//       if (orderAdd) {
//         return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
//           message: constants.RESPONSE_STATUS.SUCCESS,
//           data: orderAdd,
//         });
//       } else {
//         return res
//           .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//           .json({ message: constants.RESPONSE_STATUS.FAILURE });
//       }
//     } catch (err) {
//       console.log(err);
//       return res
//         .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
//         .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
//     }
//   }
// );

// /**
//  *  cancel order
//  */

// router.patch(
//   "/:orderId/cancel",
//   [check("orderId", "A valid id is required").exists()],
//   verifyToken,
//   async (req, res) => {
//     try {
//       let order = await marketOrderServiceInstance.orderExists(req.params);

//       if (!order || order.status !== 0) {
//         return res
//           .status(constants.RESPONSE_STATUS_CODES.OK)
//           .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
//       }

//       let cancel = await marketOrderServiceInstance.cancelOrder({
//         orderId: req.params.orderId,
//         signature: order.signature,
//         type: order.type,
//         takerSign: req.body.taker_signature,
//       });
//       let category = await categoryServiceInstance.getCategory({
//         categoryId: cancel.categories_id,
//       });

//       if (cancel) {
//         helper.notify({
//           userId: req.userId,
//           message:
//             "You cancelled your " +
//             cancel.type +
//             " sell order on " +
//             category.name +
//             " token",
//           order_id: cancel.id,
//           type: "CANCELLED",
//         });
//         return res
//           .status(constants.RESPONSE_STATUS_CODES.OK)
//           .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: cancel });
//       } else {
//         return res
//           .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//           .json({ message: constants.RESPONSE_STATUS.FAILURE });
//       }
//     } catch (err) {
//       console.log(err);
//       return res
//         .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
//         .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
//     }
//   }
// );

// /**
//  *  swap token
//  */

// router.post("/swap-token", async (req, res) => {
//   try {
//     let signedOrder = req.body.signedOrder;

//     const contractWrappers = new ContractWrappers(helper.providerEngine(), {
//       chainId: parseInt(constants.MATIC_CHAIN_ID),
//     });

//     const makerAssetData = await contractWrappers.devUtils
//       .encodeERC20AssetData(config.WETH_ADDRESS)
//       .callAsync();

//     if (
//       !new BigNumber(signedOrder.takerAssetAmount).eq(
//         new BigNumber(signedOrder.makerAssetAmount)
//       )
//     ) {
//       return res
//         .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//         .json({ message: constants.RESPONSE_STATUS.FAILURE });
//     }

//     if (
//       !(
//         makerAssetData.toLowerCase() ===
//         signedOrder.makerAssetData.toLowerCase()
//       )
//     ) {
//       return res
//         .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//         .json({ message: constants.RESPONSE_STATUS.FAILURE });
//     }

//     let tx = await marketOrderServiceInstance.swapToken({
//       signedOrder,
//     });

//     if (tx) {
//       return res
//         .status(constants.RESPONSE_STATUS_CODES.OK)
//         .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: tx });
//     } else {
//       return res
//         .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//         .json({ message: constants.RESPONSE_STATUS.FAILURE });
//     }
//   } catch (err) {
//     console.log(err);
//     return res
//       .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
//       .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
//   }
// });

// /**
//  *  cancel bid
//  */

// router.patch(
//   "/bid/:bidId/cancel",
//   [check("bidId", "A valid id is required").exists()],
//   verifyToken,
//   async (req, res) => {
//     try {
//       let bid = await marketOrderServiceInstance.bidExists(req.params);

//       if (!bid || bid.status !== 0) {
//         return res
//           .status(constants.RESPONSE_STATUS_CODES.OK)
//           .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
//       }

//       let { bidId } = req.params;
//       let { taker_signature } = req.body;

//       let order = await marketOrderServiceInstance.getOrder({
//         orderId: bid.orders_id,
//       });

//       let category = await categoryServiceInstance.getCategory({
//         categoryId: order.categories.id,
//       });

//       let cancel;
//       if (order.type === constants.ORDER_TYPES.FIXED) {
//         cancel = await marketOrderServiceInstance.cancelBid({
//           orderId: order.id,
//           bidId,
//           signature: bid.signature,
//           takerSign: taker_signature,
//         });
//       }

//       if (order.type === constants.ORDER_TYPES.NEGOTIATION) {
//         cancel = await marketOrderServiceInstance.clearBids({ bidId });
//       }

//       if (cancel) {
//         helper.notify({
//           userId: req.userId,
//           message:
//             "You cancelled your bid/offer on " + category.name + " token",
//           order_id: order.id,
//         });
//         return res
//           .status(constants.RESPONSE_STATUS_CODES.OK)
//           .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: cancel });
//       } else {
//         return res
//           .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//           .json({ message: constants.RESPONSE_STATUS.FAILURE });
//       }
//     } catch (err) {
//       console.log(err);
//       return res
//         .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
//         .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
//     }
//   }
// );

// /**
//  *  Execute order
//  *  @params orderId type: int
//  *  @params maker_token type: int
//  *  @params bid type: string
//  */

// router.patch(
//   "/:bidId/execute",
//   [check("bidId", "A valid bid id is required").exists()],
//   verifyToken,
//   async (req, res) => {
//     try {
//       const errors = validationResult(req);

//       if (!errors.isEmpty()) {
//         return res
//           .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//           .json({ error: errors.array() });
//       }

//       let bid = await marketOrderServiceInstance.bidExists(req.params);

//       if (!bid || bid.status !== 0) {
//         return res
//           .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//           .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
//       }

//       let order = await marketOrderServiceInstance.getOrder({
//         orderId: bid.orders_id,
//       });

//       let category = await categoryServiceInstance.getCategory({
//         categoryId: order.categories.id,
//       });

//       let erc20Token = await erc20TokenServiceInstance.getERC20Token({
//         id: order.erc20tokens.id,
//       });

//       let params = {
//         orderId: order.id,
//         maker_address: bid.users_id,
//         maker_amount: bid.price,
//         signature: bid.signature,
//         takerSign: req.body.taker_signature,
//       };

//       if (
//         !order ||
//         order.status !== 0 ||
//         (order.type !== constants.ORDER_TYPES.NEGOTIATION &&
//           order.type !== constants.ORDER_TYPES.AUCTION)
//       ) {
//         return res
//           .status(constants.RESPONSE_STATUS_CODES.OK)
//           .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
//       }

//       let orderExecute = await marketOrderServiceInstance.executeOrder(params);

//       if (orderExecute) {
//         if (order.type !== constants.ORDER_TYPES.FIXED) {
//           let limit = requestUtil.getLimit(req.query);
//           let offset = requestUtil.getOffset(req.query);
//           let orderBy = requestUtil.getSortBy(req.query, "+id");

//           let bids = await marketOrderServiceInstance.getBids({
//             orderId: order.id,
//             limit,
//             offset,
//             orderBy,
//           });

//           for (data of bids.order) {
//             marketOrderServiceInstance.clearBids({ bidId: data.id });
//           }
//         }

//         helper.notify({
//           userId: orderExecute.maker_address,
//           message:
//             "You bought a " +
//             category.name +
//             " token for " +
//             orderExecute.maker_amount +
//             " " +
//             erc20Token.symbol,
//           order_id: orderExecute.id,
//           type: "SWAP",
//         });
//         helper.notify({
//           userId: orderExecute.taker_address,
//           message:
//             "Your " +
//             category.name +
//             " token has been bought for " +
//             orderExecute.maker_amount +
//             " " +
//             erc20Token.symbol,
//           order_id: orderExecute.id,
//           type: "SWAP",
//         });
//         return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
//           message: constants.RESPONSE_STATUS.SUCCESS,
//           data: orderExecute.id,
//         });
//       } else {
//         return res
//           .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//           .json({ message: constants.RESPONSE_STATUS.FAILURE });
//       }
//     } catch (err) {
//       console.log(err);
//       return res
//         .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
//         .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
//     }
//   }
// );

// /**
//  *  Gets bid list from order
//  *  @params orderId type: int
//  */

// router.get(
//   "/bids/:orderId",
//   [check("orderId", "A valid id is required").exists()],
//   async (req, res) => {
//     try {
//       let orderId = req.params.orderId;
//       let limit = requestUtil.getLimit(req.query);
//       let offset = requestUtil.getOffset(req.query);
//       let orderBy = requestUtil.getSortBy(req.query, "+id");

//       let bids = await marketOrderServiceInstance.getBids({
//         orderId,
//         limit,
//         offset,
//         orderBy,
//       });
//       if (bids.order) {
//         return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
//           message: constants.RESPONSE_STATUS.SUCCESS,
//           data: bids,
//         });
//       } else {
//         return res
//           .status(constants.RESPONSE_STATUS_CODES.NOT_FOUND)
//           .json({ message: constants.RESPONSE_STATUS.NOT_FOUND });
//       }
//     } catch (err) {
//       console.log(err);
//       return res
//         .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
//         .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
//     }
//   }
// );

// /**
//  *  Gets zrx exchange data encoded
//  *  @params orderId type: int
//  */

// router.get(
//   "/exchangedata/encoded/",
//   [check("orderId", "A valid id is required").exists()],
//   async (req, res) => {
//     try {
//       let { orderId, functionName } = req.query;

//       let order = await marketOrderServiceInstance.orderExists({ orderId });

//       if (!order || order.status !== 0) {
//         return res
//           .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//           .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
//       }

//       let encodedData = helper.encodeExchangeData(
//         JSON.parse(order.signature),
//         functionName
//       );
//       return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
//         message: constants.RESPONSE_STATUS.SUCCESS,
//         data: encodedData,
//       });
//     } catch (err) {
//       console.log(err);
//       return res
//         .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
//         .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
//     }
//   }
// );

// /**
//  *  Gets zrx exchange data encoded
//  *  @params orderId type: int
//  */

// router.get(
//   "/exchangedata/encodedbid/",
//   [check("bidId", "A valid id is required").exists()],
//   async (req, res) => {
//     try {
//       let { bidId, functionName } = req.query;

//       let bid = await marketOrderServiceInstance.bidExists({ bidId });

//       if (!bid || bid.status !== 0) {
//         return res
//           .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//           .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
//       }

//       let encodedData = helper.encodeExchangeData(
//         JSON.parse(bid.signature),
//         functionName
//       );
//       return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
//         message: constants.RESPONSE_STATUS.SUCCESS,
//         data: encodedData,
//       });
//     } catch (err) {
//       console.log(err);
//       return res
//         .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
//         .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
//     }
//   }
// );

// /**
//  *  Validate order
//  *  @params orderId type: int
//  */

// router.post(
//   "/validate",
//   [check("orderId", "A valid id is required").exists()],
//   verifyToken,
//   async (req, res) => {
//     try {
//       let { orderId } = req.body;

//       let order = await marketOrderServiceInstance.getOrder({ orderId });

//       if (!order) {
//         return res
//           .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//           .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
//       }

//       let userAddress = order.seller_users.address;
//       let tokenId = order.tokens_id;
//       let contractAddress = order.categories.categoriesaddresses[0].address;

//       let valid = await helper.checkOwnerShip(
//         userAddress,
//         tokenId,
//         contractAddress
//       );

//       let orderInvalid = false;

//       if (order.signature) {
//         let signedOrder = JSON.parse(order.signature);
//         const contractWrappers = new ContractWrappers(helper.providerEngine(), {
//           chainId: parseInt(constants.MATIC_CHAIN_ID),
//         });

//         const [
//           { orderStatus, orderHash },
//           remainingFillableAmount,
//           isValidSignature,
//         ] = await contractWrappers.devUtils
//           .getOrderRelevantState(signedOrder, signedOrder.signature)
//           .callAsync();

//         orderInvalid = !(
//           orderStatus === OrderStatus.Fillable &&
//           remainingFillableAmount.isGreaterThan(0) &&
//           isValidSignature
//         );
//       }

//       if (!valid || orderInvalid) {
//         await marketOrderServiceInstance.expireOrder({ orderId });
//       }

//       return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
//         message: constants.RESPONSE_STATUS.SUCCESS,
//         data: order,
//       });
//     } catch (err) {
//       console.log(err);
//       return res
//         .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
//         .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
//     }
//   }
// );

// /**
//  *  Validate bids
//  *  @params orderId type: int
//  */

// router.post(
//   "/validate/bids",
//   [check("orderId", "A valid id is required").exists()],
//   verifyToken,
//   async (req, res) => {
//     try {
//       let { orderId } = req.body;

//       let order = await marketOrderServiceInstance.getOrder({ orderId });

//       if (!order || order.status !== 0) {
//         return res
//           .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//           .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
//       }

//       let bids = await marketOrderServiceInstance.getBids({
//         orderId,
//       });

//       for (data of bids.order) {
//         let signedOrder = JSON.parse(data.signature);
//         if (
//           !(await helper.checkTokenBalance(
//             signedOrder.makerAddress,
//             signedOrder.makerAssetAmount,
//             data.orders.erc20tokens.erc20tokensaddresses[0].address
//           ))
//         ) {
//           await marketOrderServiceInstance.clearBids({ bidId: data.id });
//         }
//       }

//       return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
//         message: constants.RESPONSE_STATUS.SUCCESS,
//         data: bids,
//       });
//     } catch (err) {
//       console.log(err);
//       return res
//         .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
//         .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
//     }
//   }
// );

module.exports = router;
