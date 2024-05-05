const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const TokenService = require("../services/token");
const tokenServiceInstance = new TokenService();
const userService = require("../services/user");
let userServiceInstance = new userService();
let constants = require("../../config/constants");
const helper = require("../utils/helper");
const upload = require("../utils/upload");
let requestUtil = require("../utils/request-utils");
const validate = require("../utils/helper");
const verifyToken = require("../middlewares/verify-token");
const { watermarkVideo, deleteTempVideo } = require("../utils/watermark");
const { encodeLSB } = require("../utils/embedData");
const fs = require("fs");
var crypto = require("crypto");
const {
  uploadVideo,
  uploadVideoWithSSE,
  createSymmetricKey,
  generatePresignedUrl,
  downloadEncryptedFileFromS3,
  isFileExist,
  getKeyKMS
} = require("../utils/serviceAWS");
const VideoEncryptor = require("video-encryptor");
const prisma = require("../../prisma");
const { title } = require("process");

/**
 * Token routes
 */

/**
 *  Gets all the token details
 */

router.get("/", async (req, res) => {
  try {
    let limit = requestUtil.getLimit(req.query);
    let offset = requestUtil.getOffset(req.query);
    let orderBy = requestUtil.getSortBy(req.query, "+id");
    let title = requestUtil.getKeyword(req.query, "search");
    let creator = requestUtil.getKeyword(req.query, "creator");
    let owner = requestUtil.getKeyword(req.query, "owner");
    let collectionID = requestUtil.getKeyword(req.query, "collectionID");
    let status = requestUtil.getKeyword(req.query, "status");
    let active = requestUtil.getKeyword(req.query, "active");

    if (creator !== "") {
      if (!validate.isValidEthereumAddress(creator)) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "creator address is not valid" });
      }
    }
    if (owner !== "") {
      if (!validate.isValidEthereumAddress(owner)) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "owner address is not valid" });
      }
    }

    let foundOwner = await userServiceInstance.getUser({ owner });
    let foundCreator = await userServiceInstance.getUser({ creator });

    if (!foundOwner || !foundCreator) {
      return res.status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST).json({
        message: "creator address or owner address does not exist",
      });
    }

    let tokens = await tokenServiceInstance.getTokens({
      limit,
      offset,
      orderBy,
      title,
      creator,
      owner,
      collectionID,
      status,
      active,
    });

    return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
      message: constants.RESPONSE_STATUS.SUCCESS,
      data: {
        tokens: tokens.tokens,
        count: tokens.count,
      },
    });
  } catch (err) {
    console.log(err);
    return res
      .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

/**
 *  Gets all the token details by user
 */

router.get(
  "/user/:wallet",
  verifyToken,
  [check("wallet", "A valid id is required").exists()],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let wallet = req.params.wallet;

      if (!validate.isValidEthereumAddress(wallet)) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "wallet is not valid" });
      }

      let limit = requestUtil.getLimit(req.query);
      let offset = requestUtil.getOffset(req.query);
      let orderBy = requestUtil.getSortBy(req.query, "+id");
      let title = requestUtil.getKeyword(req.query, "search");
      let collectionID = requestUtil.getKeyword(req.query, "collectionID");
      let active = requestUtil.getKeyword(req.query, "active");

      let user = await userServiceInstance.getUser({ wallet });

      if (!user) {
        return res.status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST).json({
          message: "wallet does not exist",
        });
      }

      let tokens = await tokenServiceInstance.getTokensByUser({
        limit,
        offset,
        orderBy,
        title,
        wallet,
        collectionID,
        active,
      });

      return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
        message: constants.RESPONSE_STATUS.SUCCESS,
        data: {
          tokens: tokens.tokens,
          count: tokens.count,
        },
      });
    } catch (err) {
      console.log(err);
      return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
);

/**
 *  Gets all the favorited token details by user
 */

router.get("/favorite", verifyToken, async (req, res) => {
  try {
    let wallet = req.userWallet;

    if (!validate.isValidEthereumAddress(wallet)) {
      return res
        .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
        .json({ message: "wallet is not valid" });
    }

    let limit = requestUtil.getLimit(req.query);
    let offset = requestUtil.getOffset(req.query);
    let orderBy = requestUtil.getSortBy(req.query, "+id");
    let title = requestUtil.getKeyword(req.query, "search");
    let active = requestUtil.getKeyword(req.query, "active");

    let user = await userServiceInstance.getUser({ wallet });

    if (!user) {
      return res.status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST).json({
        message: "user does not exist",
      });
    }

    let tokens = await tokenServiceInstance.getFavoritedTokensByUser({
      limit,
      offset,
      orderBy,
      title,
      wallet,
      active,
    });

    return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
      message: constants.RESPONSE_STATUS.SUCCESS,
      data: {
        tokens: tokens.tokens,
        count: tokens.count,
      },
    });
  } catch (err) {
    console.log(err);
    return res
      .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

/**
 *  Adds a new token
 */

router.post(
  "/",
  check("creator", "A valid creator is required").exists().isEthereumAddress(),
  check("owner", "A valid owner is required").exists().isEthereumAddress(),
  check("title", "A valid title is required").exists(),
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let creator = await userServiceInstance.getUser({
        wallet: req.body.creator,
      });
      let owner = await userServiceInstance.getUser({
        wallet: req.body.owner,
      });

      if (!creator || !owner) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
      }
      
      let token = await tokenServiceInstance.createToken(req.body);
      if (token) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: token });
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
 *  Post video of NFT Token
 *  @param video type: file
 */

router.post(
  "/source",
  upload.single("source"),
  verifyToken, // check valid token
  async (req, res) => {
    try {
      let mode = req.query.mode;
      let wallet = req.userWallet;
      let inputVideo = `public/${req.file.filename}`;
      let outputVideo = inputVideo.replace(".mp4", "_output.mp4");
      let outputEncode = inputVideo.replace(".mp4", "_encoded.mp4");
      let outputEncrypt = inputVideo.replace(".mp4", ".encrypted");
      const videoEncryptor = new VideoEncryptor();
      let source;

      // ?mode=public || ?mode=commercial
      if (mode === constants.MODE.PUBLIC || mode === constants.MODE.COMMERCIAL ) {
        // Flow: Upload original video
        await uploadVideo(inputVideo, inputVideo);

        await watermarkVideo(inputVideo, outputVideo);
        await encodeLSB(outputVideo, outputEncode, wallet);

        if (mode === constants.MODE.PUBLIC) {
          // Flow: Watermark -> Embed wallet address -> upload
          source = await tokenServiceInstance.uploadVideoToIPFS(outputEncode);
          await deleteTempVideo(outputEncode);
        } else if (mode === constants.MODE.COMMERCIAL) {
          // Create symmetric key
          let keyId = await createSymmetricKey("KeyName");

          // Flow: Watermark -> Embed wallet address -> upload
          await videoEncryptor.encryptVideo(outputEncode, keyId, outputEncrypt);
          source = await tokenServiceInstance.uploadVideoToIPFS(outputEncrypt);
          await deleteTempVideo(outputEncrypt);
        }
      }

      await deleteTempVideo(outputVideo);
      await deleteTempVideo(outputEncode);
      await deleteTempVideo(inputVideo);

      if (source) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: source });
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

router.post("/file", verifyToken, async (req, res) => {
  try {
    let tokenID = req.body.tokenID;
    
    console.log(tokenID);

    const token = await prisma.tokens.findUnique({
      where: {
        tokenID: tokenID,
      }, 
    });

    if (token) {
      return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
        message: constants.RESPONSE_STATUS.SUCCESS,
        data: token.source,
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

router.post("/license", verifyToken, async (req, res) => {
  try { 
    let tokenID = req.body.tokenID;
    var algorithm = "aes256";
    let owner = "";

    console.log(title)
    
    const token = await prisma.tokens.findUnique({
      where: {
        tokenID: tokenID,
      },
    });

    if (token) {
      // Get JWT from header
      let jwt = req.headers.authorization.split(" ")[1];
      console.log(jwt)

      // Get the key from KMS
      let key = await getKeyKMS(token.contractAddress);
      console.log(key)
      let cipher = crypto.createCipher(algorithm, jwt);
      var encryptedKey =
        await cipher.update(key, "utf8", "hex") + cipher.final("hex");

      console.log(encryptedKey);

      // to decrypt
      var decipher = crypto.createDecipher(algorithm, jwt);
      var decryptedKey =
        await decipher.update(encryptedKey, "hex", "utf8") + decipher.final("utf8");
      
      console.log(decryptedKey)

      return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
        message: constants.RESPONSE_STATUS.SUCCESS,
        data: encryptedKey,
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

router.get("/getpublic", async (req, res) => {
  try {
    let keyname = req.query.filename;

    let isExist = await isFileExist(keyname);

    let url = "https://block-clip.s3.ap-southeast-2.amazonaws.com/" + keyname;

    if (isExist) {
      if (url) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: url });
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: constants.RESPONSE_STATUS.FAILURE });
      }
    }
  } catch (err) {
    console.log(err);
    return res
      .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

router.get("/getcommercial", verifyToken, async (req, res) => {
  try {
    const wallet = req.userWallet;

    // if user is paying for commercial video
    // then get the video
    let checkCommercial = true;

    let keyname = req.query.filename;

    let isExist = await isFileExist(keyname);

    if (isExist && checkCommercial) {
      let url = "https://block-clip.s3.ap-southeast-2.amazonaws.com/" + keyname;
      // let url = await generatePresignedUrl(keyname)
      return res
        .status(constants.RESPONSE_STATUS_CODES.OK)
        .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: url });
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

router.get("/downloadpublic", async (req, res) => {
  try {
    let keyname = req.query.filename;

    let output = `public/${keyname}`;
    let url = await generatePresignedUrl(keyname);

    // if watermarking is successful
    await watermarkVideo(url, output);

    // Check if watermarking is successful
    const isWatermarkingSuccessful = fs.existsSync(output);

    if (isWatermarkingSuccessful) {
      // If watermarking is successful, send the output file
      return res
        .status(constants.RESPONSE_STATUS_CODES.OK)
        .download(output, () => {
          deleteTempVideo(output);
        });
    } else {
      // If watermarking fails, send an error response
      return res
        .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
        .json({ message: constants.RESPONSE_STATUS.FAILURE });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

router.get("/downloadorigin", async (req, res) => {
  try {
    let keyname = req.query.filename;

    let output = `public/${keyname}`;
    await downloadEncryptedFileFromS3(keyname, output);

    // Check if watermarking is successful
    const isWatermarkingSuccessful = fs.existsSync(output);

    if (isWatermarkingSuccessful) {
      // If watermarking is successful, send the output file
      return res
        .status(constants.RESPONSE_STATUS_CODES.OK)
        .download(output, () => {
          deleteTempVideo(output);
        });
    } else {
      // If watermarking fails, send an error response
      return res
        .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
        .json({ message: constants.RESPONSE_STATUS.FAILURE });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

/**
 *  Like the token
 */

router.patch(
  "/:tokenID/like",
  [check("tokenID", "A valid tokenID is required").exists()],
  verifyToken,
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let userWallet = req.userWallet;
      if (!validate.isValidEthereumAddress(userWallet)) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "wallet is not valid" });
      }

      let token = await tokenServiceInstance.likeToken({
        userWallet,
        tokenID: req.params.tokenID,
      });
      if (token) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: token });
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
 *  Check user like the token?
 */

router.get(
  "/:tokenID/isLiked",
  [check("tokenID", "A valid tokenID is required").exists()],
  verifyToken,
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let userWallet = req.userWallet;

      if (!validate.isValidEthereumAddress(userWallet)) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "wallet is not valid" });
      }

      let token = await tokenServiceInstance.isLikedToken({
        userWallet,
        tokenID: req.params.tokenID,
      });
      if (token) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: token });
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
 *  Add the token to favorite list
 */

router.patch(
  "/:tokenID/favorite",
  [check("tokenID", "A valid tokenID is required").exists()],
  verifyToken,
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let userWallet = req.userWallet;
      if (!validate.isValidEthereumAddress(userWallet)) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "wallet is not valid" });
      }

      let token = await tokenServiceInstance.addTokenToFavorites({
        userWallet,
        tokenID: req.params.tokenID,
      });
      if (token) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: token });
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
 *  Check user add the token to favorite list?
 */

router.get(
  "/:tokenID/isFavorited",
  [check("tokenID", "A valid tokenID is required").exists()],
  verifyToken,
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let userWallet = req.userWallet;
      if (!validate.isValidEthereumAddress(userWallet)) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "wallet is not valid" });
      }

      let token = await tokenServiceInstance.isFavoriteToken({
        userWallet,
        tokenID: req.params.tokenID,
      });
      if (token) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: token });
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
 *  View the token
 */

router.patch(
  "/:tokenID/view",
  [check("tokenID", "A valid tokenID is required").exists()],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let token = await tokenServiceInstance.viewToken({
        tokenID: req.params.tokenID,
      });
      if (token) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: token });
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
 *  Share the token
 */

router.patch(
  "/:tokenID/share",
  [check("tokenID", "A valid tokenID is required").exists()],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let token = await tokenServiceInstance.shareToken({
        tokenID: req.params.tokenID,
      });
      if (token) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: token });
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
 *  Gets single collection detail by tokenID
 */

router.get(
  "/:tokenID",
  [check("tokenID", "A valid tokenID is required").exists()],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let token = await tokenServiceInstance.getTokenByTokenID(req.params);
      if (token) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: token });
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

router.put(
  "/tokenID/:tokenID",
  [check("tokenID", "A valid id is required").exists()],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let params = { ...req.params, ...req.body };

      if (!params.tokenID) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
      }

      let tokenExists = await tokenServiceInstance.getTokenByTokenID(params);

      if (!tokenExists) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "token doesnt exist" });
      }

      let token = await tokenServiceInstance.updateTokenByTokenID(params);
      if (token) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: "token updated successfully", data: token });
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "token update failed" });
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
 *  Updates an existing NFT token by id
 */

router.put(
  "/:id",
  [check("id", "A valid id is required").exists()],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let params = { ...req.params, ...req.body };

      if (!params.id) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
      }

      let tokenExists = await tokenServiceInstance.getTokenByID(params);

      if (!tokenExists) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "token doesnt exist" });
      }

      let token = await tokenServiceInstance.updateToken(params);
      if (token) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: "token updated successfully", data: token });
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "token update failed" });
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
