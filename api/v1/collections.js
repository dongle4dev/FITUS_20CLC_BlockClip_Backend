const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const collectionService = require("../services/collection");
let collectionServiceInstance = new collectionService();
const upload = require("../utils/upload");
const validate = require("../utils/helper");
let requestUtil = require("../utils/request-utils");
let constants = require("../../config/constants");

/**
 * collection routes
 */

/**
 *  Adds a new collection of NFT token
 *  @params name type: String
 *  @params description type: String
 *  @params url type: String
 *  @params address type: String
 *  @param collectionImage type: file
 */

router.post(
  "/",
  async (req, res) => {
    /* 	#swagger.tags = ['Collection']
        #swagger.description = 'Endpoint to create a collection' */

    /*	#swagger.parameters['obj'] = {
            in: 'body',
            description: 'Collection information.',
            required: true,
            schema: { $ref: "#/definitions/Collection" }
    } */

    /* #swagger.security = [{
            "apiKeyAuth": []
    }] */
    try {
      let { title, creator } = req.body;
      
      if (!title || !creator) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
      }

      let collectionExists = await collectionServiceInstance.collectionExists(
        req.body
      );

      if (collectionExists.length !== 0) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
      }

      let collection = await collectionServiceInstance.createCollection(
        req.body
      );
      if (collection) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: collection });
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
 *  Adds a new collection of NFT token
 *  @param collectionImage type: file
 */

router.post(
  "/image",
  upload.single("collectionImage"),
  async (req, res) => {
    try {
      let bannerURL = requestUtil.getFileURL(req.file);


      if (bannerURL) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: bannerURL });
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
 *  Gets all the collection details
 */

router.get("/", async (req, res) => {
  try {
    let limit = requestUtil.getLimit(req.query);
    let offset = requestUtil.getOffset(req.query);
    let orderBy = requestUtil.getSortBy(req.query, "+id");
    let chainID = requestUtil.getChainID(req.query);
    let title = requestUtil.getKeyword(req.query);
    let creator = requestUtil.getCreator(req.query);

    if (creator !== "") {
      if (!validate.isValidEthereumAddress(creator)) {
        return res
        .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
        .json({ message: 'creator address is not valid' });
      }
    }


    let collections = await collectionServiceInstance.getCollections({
      limit,
      offset,
      orderBy,
      chainID,
      title,
      creator
    });
    if (collections) {
      /**
       * re-form collections array to include count of orders in each object
       */
      // let collectionsArray = collections.collections;

      // collectionsArray.map((collectionDetail) => {
      //   return (collectionDetail.orders = collectionDetail.orders.length);
      // });

      // collectionsArray.sort((a, b) => {
      //   return b.orders - a.orders;
      // });

      return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
        message: constants.RESPONSE_STATUS.SUCCESS,
        data: {
          collections: collections.collections,
          count: collections.count
        }
      });
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


/**
 *  Gets single collection detail by title
 *  @param search type: string
 */

router.get("/title",
  async (req, res) => {
    try {
      let title = requestUtil.getKeyword(req.query);

      let collection = await collectionServiceInstance.getCollectionsByTitle(title);
      if (collection) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: collection });
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
 *  Gets single collection detail by collectionID
 *  @param collectionID type: string
 */

router.get(
  "/:collectionID",
  [check("collectionID", "A valid id is required").exists()],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let collection = await collectionServiceInstance.getCollectionByCollectionID(req.params);
      if (collection) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: collection });
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
 *  Updates an existing collection of NFT token by id
 */

router.put(
  "/:id",
  async (req, res) => {
    try {
      let params = { ...req.params, ...req.body };

      if (!params.id) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
      }

      let collectionExists = await collectionServiceInstance.getCollectionByID(params);

      if (collectionExists.length === 0) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "collection doesnt exists" });
      }

      let collection = await collectionServiceInstance.updateCollection(
        params
      );
      if (collection) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: "collection updated successfully", data: collection });
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "collection update failed" });
      }
    } catch (err) {
      console.log(err);
      return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
);

module.exports = router;
