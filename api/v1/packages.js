const express = require("express");
const router = express.Router({ mergeParams: true });
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const auth = require("../utils/auth");
let requestUtil = require("../utils/request-utils");
const config = require("../../config/config");
const constants = require("../../config/constants");
const verifyToken = require("../middlewares/verify-token");
const packageService = require("../services/package");
let packageServiceInstance = new packageService();
const collectionService = require("../services/collection");
let collectionServiceInstance = new collectionService();

// user Subscrible to a collection
// Done

router.post("/", verifyToken, async (req, res) => {
  try {
    let params = { userWallet: req.userWallet, ...req.body };

    let collectionExists = await collectionServiceInstance.getCollectionByCollectionID(params);

      if (!collectionExists) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "collection doesnt exists" });
      }

    let check = await packageServiceInstance.subscribeCollection(params);

    if (check) {
      return res
        .status(constants.RESPONSE_STATUS_CODES.OK)
        .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: check });
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
});

// http://localhost:3001/api/v1/users/subscribed/?collectionID=2
// Check coi user đó có đăng ký gói nào của collection. Trả về gói đó
// Done

// router.get("/:collectionID", verifyToken, async (req, res) => {
//   try {
//     const collectionID = req.params.collectionID;
//     let params = { userWallet: req.userWallet, collectionID };

//     if (!params.collectionID) {
//       return res
//         .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
//         .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
//     }

//     await packageServiceInstance.checkExpire(params);

//     let packageType = await packageServiceInstance.getPackageType(params);

//     if (packageType) {
//       return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
//         message: constants.RESPONSE_STATUS.SUCCESS,
//         data: packageType,
//       });
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

// // lấy danh sách giao dịch đki của user by ID
// // done

router.get("/", verifyToken, async (req, res) => {
  try {
    let limit = requestUtil.getLimit(req.query);
    let offset = requestUtil.getOffset(req.query);
    let orderBy = requestUtil.getSortBy(req.query, "+id");
    let id = requestUtil.getKeyword(req.query, "id");
    let collectionID = requestUtil.getKeyword(req.query, "collectionID");

    if (collectionID) {
      let collectionExists = await collectionServiceInstance.getCollectionByCollectionID({collectionID: collectionID});

      if (!collectionExists) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "collection doesnt exists" });
      }
    }
    

    await packageServiceInstance.checkExpire({ userWallet: req.userWallet });

    let subscribers = await packageServiceInstance.getSubscriber({
      userWallet: req.userWallet,
      limit,
      offset,
      orderBy,
      id,
      collectionID
    });

    if (subscribers) {
      return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
        message: constants.RESPONSE_STATUS.SUCCESS,
        data: subscribers,
      });
    }
  } catch (err) {
      return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// lấy danh sách giao dịch đki của user
// done

// router.get("/", verifyToken, async (req, res) => {
//   try {
//     let params = { userWallet: req.userWallet, ...req.body };
//     let subscribers;
//     await packageServiceInstance.checkExpire(params);

//     subscribers = await packageServiceInstance.getSubscriber(params);

//     if (subscribers) {
//       return res
//         .status(constants.RESPONSE_STATUS_CODES.OK)
//         .json({
//           message: constants.RESPONSE_STATUS.SUCCESS,
//           data: subscribers,
//         });
//     }
//   } catch (err) {
//     console.log(err);
//     return res
//       .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
//       .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
//   }
// });

module.exports = router;
