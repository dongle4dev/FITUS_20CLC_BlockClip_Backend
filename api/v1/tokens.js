const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const TokenService = require("../services/token");
const tokenServiceInstance = new TokenService();
const userService = require("../services/user");
let userServiceInstance = new userService();
const collectionService = require("../services/collection");
let collectionServiceInstance = new collectionService();
let constants = require("../../config/constants");
const helper = require("../utils/helper");
const upload = require("../utils/upload");
let requestUtil = require("../utils/request-utils");
const validate = require("../utils/helper");
const verifyToken = require("../middlewares/verify-token");
const getUserWallet = require("../middlewares/get-user-wallet");
const { watermarkVideo, deleteTempVideo } = require("../utils/watermark");
const { encodeLSB, decodeLSB } = require("../utils/embedData");
const fs = require("fs");
var crypto = require("crypto");
const {
  uploadVideo,
  uploadAvatar,
  uploadVideoWithSSE,
  createSymmetricKey,
  generatePresignedUrl,
  downloadEncryptedFileFromS3,
  isFileExist,
  getKeyKMS,
  updateKeyName,
  updateFileAlias,
} = require("../utils/serviceAWS");
const VideoEncryptor = require("video-encryptor");
const prisma = require("../../prisma");
const { title } = require("process");
const packageService = require("../services/package");
const packageServiceInstance = new packageService();
const axios = require("axios");
const jwt = require("jsonwebtoken");
let config = require("../../config/config");

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

    var accessToken = req.headers["x-access-token"] || req.headers.authorization && req.headers.authorization.split(' ')[1];
    var user;
    var userWallet;
    if (accessToken) {
      jwt.verify(accessToken, config.secret, async (err, decoded) => {
        if (err) {
          return res
            .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
            .json({ message: "This NFT is not available." });
        }
        if (!decoded.username) {
          user = await userServiceInstance.getUser(decoded);
          userWallet = decoded.userWallet;
          // user = await { ...user};
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
       
      })
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    if (user && user.role === "ADMIN") {
      return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
        message: constants.RESPONSE_STATUS.SUCCESS,
        data: {
          tokens: tokens.tokens,
          count: tokens.count,
        },
      });
    }
    
    if (collectionID && userWallet) {
      let foundCollection = await collectionServiceInstance.getCollectionByCollectionID(collectionID);
      if (userWallet === foundCollection.creatorCollection) {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: constants.RESPONSE_STATUS.SUCCESS,
          data: {
            tokens: tokens.tokens,
            count: tokens.count,
          },
        });
      }
    } 
      
    let newTokens = [];
    for (let i = 0; i < tokens.tokens.length; i++) {
      if (tokens.tokens[i].active === false || tokens.tokens[i].disabled) {
        if (tokens.tokens[i].owner === userWallet) {
          newTokens.push(tokens.tokens[i]);
        }
      } else {
        newTokens.push(tokens.tokens[i]);
      }

    }
    
    return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
      message: constants.RESPONSE_STATUS.SUCCESS,
      data: {
        tokens: newTokens,
        count: newTokens ? newTokens.length : 0,
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

      userWallet = await userServiceInstance.getUser(req.userWallet);
      if (userWallet.role === "ADMIN") {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: constants.RESPONSE_STATUS.SUCCESS,
          data: {
            tokens: tokens.tokens,
            count: tokens.count,
          },
        });
      } else {
        let newTokens = [];
        for (let i = 0; i < tokens.tokens.length; i++) {
          if (tokens.tokens[i].active === false || tokens.tokens[i].disabled) {
            if (tokens.tokens[i].owner === req.userWallet) {
              newTokens.push(tokens.tokens[i]);
            }
          } else {
            newTokens.push(tokens.tokens[i]);
          }
        }

        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: constants.RESPONSE_STATUS.SUCCESS,
          data: {
            tokens: newTokens,
            count: newTokens ? newTokens.length : 0,
          },
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
 *  Adds a new comment
 */

router.post(
  "/comments",
  check("tokenID", "A valid tokenID is required").exists(),
  check("ownerWallet", "A valid owner wallet is required").exists().isEthereumAddress(),
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let owner = await userServiceInstance.getUser({
        wallet: req.body.ownerWallet,
      });

      if (!owner) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: constants.MESSAGES.INPUT_VALIDATION_ERROR });
      }

      let comment = await tokenServiceInstance.createComment(req.body);
      if (comment) {
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: constants.RESPONSE_STATUS.SUCCESS,
          data: comment,
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
  }
);


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

      if (parseInt(req.body.mode) === constants.MODE.COMMERCIAL) {
        const avatar = await isFileExist(`${req.body.creator}.png`);

        if (!avatar) {
          return res
            .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
            .json({ message: "Avatar is not exist!" });
        }

        const key = await getKeyKMS(req.body.creator);
        if (key) {
          console.log(key);
          let token = await tokenServiceInstance.createToken(req.body);
          if (token) {
            await updateFileAlias(`${token.token.creator}.png`, `${token.token.id}.png`);
            await updateKeyName(token.token.creator, token.token.id, key);
            await tokenServiceInstance.updateToken({ id: token.token.id, avatar: `https://block-clip.s3.ap-southeast-2.amazonaws.com/${token.token.id}.png` });
            token.token.avatar = `https://block-clip.s3.ap-southeast-2.amazonaws.com/${token.token.id}.png`;
            return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
              message: constants.RESPONSE_STATUS.SUCCESS,
              data: token,
            });
          } else {
            return res
              .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
              .json({ message: constants.RESPONSE_STATUS.FAILURE });
          }
        } else {
          return res
            .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
            .json({ message: "Key is not exist!" });
        }
      } else if (parseInt(req.body.mode) === constants.MODE.PUBLIC) {
        const avatar = await isFileExist(`${req.body.creator}.png`);
        if (!avatar) {
          return res
            .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
            .json({ message: "Avatar is not exist!" });
        }

        let token = await tokenServiceInstance.createToken(req.body);
        await updateFileAlias(`${token.token.creator}.png`, `${token.token.id}.png`);
        await tokenServiceInstance.updateToken({ id: token.token.id, avatar: `https://block-clip.s3.ap-southeast-2.amazonaws.com/${token.token.id}.png` });
        token.token.avatar = `https://block-clip.s3.ap-southeast-2.amazonaws.com/${token.token.id}.png`;
        if (token) {
          return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
            message: constants.RESPONSE_STATUS.SUCCESS,
            data: token,
          });
        } else {
          return res
            .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
            .json({ message: constants.RESPONSE_STATUS.FAILURE });
        }
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "Mode is not valid!" });
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
      let outputDecode = inputVideo.replace(".mp4", "_decoded.mp4");
      let outputEncrypt = inputVideo.replace(".mp4", ".encrypted");
      const videoEncryptor = new VideoEncryptor();
      let source;


      let checkData = await decodeLSB(inputVideo, outputDecode);
      let foundOwner = await userServiceInstance.getUser({userWallet: checkData});
      
      if (foundOwner) {
        await deleteTempVideo(inputVideo);
        await deleteTempVideo(outputDecode);

        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: 'This is duplicated video!' });
      }

      console.time('Total');
      // ?mode=public || ?mode=commercial
      if (
        parseInt(mode) === constants.MODE.PUBLIC ||
        parseInt(mode) === constants.MODE.COMMERCIAL
      ) {
        // Flow: Upload original video
        await uploadVideo(inputVideo, inputVideo);
        
        console.time('Watermark');
        await watermarkVideo(inputVideo, outputVideo);
        console.timeEnd('Watermark');

        console.time('LSB');
        await encodeLSB(outputVideo, outputEncode, wallet);
        console.timeEnd('LSB');
        if (parseInt(mode) === constants.MODE.PUBLIC) {
          // Flow: Watermark -> Embed wallet address -> upload
          source = await tokenServiceInstance.uploadVideoToIPFS(outputEncode);
          await deleteTempVideo(outputEncode);
        } else if (parseInt(mode) === constants.MODE.COMMERCIAL) {
          // Create symmetric key
          console.time('AES');
          const keyId = await createSymmetricKey(wallet);
          // Flow: Watermark -> Embed wallet address -> upload
          await videoEncryptor.encryptVideo(outputEncode, keyId, outputEncrypt);
          console.timeEnd('AES');
          source = await tokenServiceInstance.uploadVideoToIPFS(outputEncrypt);
          await deleteTempVideo(outputEncrypt);
        }
      }

      await uploadAvatar("public/avatar.png", `${wallet}.png`);

      await deleteTempVideo("public/avatar.png");
      await deleteTempVideo(outputVideo);
      await deleteTempVideo(outputEncode);
      await deleteTempVideo(inputVideo);
      await deleteTempVideo(outputDecode);
      console.timeEnd('Total');
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

router.get("/file", verifyToken, async (req, res) => {
  try {
    let tokenID = req.body.tokenID;

    console.log(tokenID);

    const token = await prisma.tokens.findUnique({
      where: {
        tokenID: tokenID,
      },
    });

    if (token) {
      const response = await axios.get(token.source, {
        responseType: "arraybuffer",
      });

      const videoData = response.data;

      if (videoData)
        return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
          message: constants.RESPONSE_STATUS.SUCCESS,
          data: videoData,
        });
      else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: "No video source!" });
      }
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
    let userWallet = req.userWallet;
    var algorithm = "aes256";
    let owner = "";

    await packageServiceInstance.checkExpire({ userWallet });

    const token = await prisma.tokens.findUnique({
      where: {
        tokenID: tokenID,
      },
    });

    if (token) {
      const marketPackage =
        await packageServiceInstance.getSubscriberByCollectionID({
          userWallet,
          collectionID: token.collectionID,
        });
      const user = await userServiceInstance.getUser({userWallet: req.userWallet});
      if (marketPackage[0] || token.owner === userWallet || user.role === "ADMIN") {
        // Get JWT from header
        let jwt = req.headers.authorization.split(" ")[1];
        console.log(jwt);

        // Get the key from KMS
        if (token.mode === constants.MODE.COMMERCIAL) {
          let key = await getKeyKMS(token.id);
          if (key) {
            let cipher = crypto.createCipher(algorithm, jwt);
            var encryptedKey =
              (await cipher.update(key, "utf8", "hex")) + cipher.final("hex");

            // to decrypt
            // var decipher = crypto.createDecipher(algorithm, jwt);
            // var decryptedKey =
            //   (await decipher.update(encryptedKey, "hex", "utf8")) +
            //   decipher.final("utf8");

            // console.log(decryptedKey);

            return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
              message: constants.RESPONSE_STATUS.SUCCESS,
              data: encryptedKey,
            });
          } else {
            return res
              .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
              .json({ message: "Key is not exist!" });
          }
        } else {
          return res
            .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
            .json({ message: "This is not commercial video" });
        }
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "Subscribe the collection!" });
      }
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
 *  Check token is disabled
 */

router.get(
  "/:tokenID/isDisabled",
  [check("tokenID", "A valid tokenID is required").exists()],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      // let userWallet = req.userWallet;
      // if (!validate.isValidEthereumAddress(userWallet)) {
      //   return res
      //     .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
      //     .json({ message: "wallet is not valid" });
      // }

      let token = await tokenServiceInstance.isDisabledToken({
        // userWallet,
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
        if (token.disabled || token.active === false) {
          let userWallet = await getUserWallet(req, res);

          let foundUser = await userServiceInstance.getUser({ userWallet: userWallet });
          if (userWallet === token.owner || foundUser.role === "ADMIN") {
            return res
              .status(constants.RESPONSE_STATUS_CODES.OK)
              .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: token });
          } else {
            return res
              .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
              .json({ message: "This NFT is not available." });
          }
        }
        else {
          return res
            .status(constants.RESPONSE_STATUS_CODES.OK)
            .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: token });
        }
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

router.delete(
  "/comments/:id",
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

      let commentExists = await tokenServiceInstance.getCommentByID(params);

      if (!commentExists) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "comment doesnt exist" });
      }

      let comment = await tokenServiceInstance.deleteCommentByID(params);
      if (comment) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: "comment deleted successfully", data: comment });
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "comment delete failed" });
      }
    } catch (err) {
      console.log(err);
      return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
);

// Delete comment by ID

router.delete(
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

      let token = await tokenServiceInstance.deleteTokenByID(params);
      if (token) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: "token deleted successfully", data: token });
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "token delete failed" });
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
  "/comments/:tokenID",
  [check("tokenID", "A valid tokenID is required").exists()],
  async (req, res) => {
    try {
      let limit = requestUtil.getLimit(req.query);
      let offset = requestUtil.getOffset(req.query);
      let orderBy = requestUtil.getSortBy(req.query, "-createdAt");

      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let comment = await tokenServiceInstance.getCommentsByTokenID({
        ...req.params,
        limit, offset, orderBy});
      if (comment) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ 
            message: constants.RESPONSE_STATUS.SUCCESS, 
            data: {
              comments: comment.comments,
              count: comment.count
            } });
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


module.exports = router;
