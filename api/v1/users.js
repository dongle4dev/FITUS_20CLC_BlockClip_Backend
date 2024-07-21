const express = require("express");
const router = express.Router({ mergeParams: true });
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const auth = require("../utils/auth");
const config = require("../../config/config");
const constants = require("../../config/constants");
const verifyToken = require("../middlewares/verify-token");
const userService = require("../services/user");
let userServiceInstance = new userService();
let requestUtil = require("../utils/request-utils");
const validate = require("../utils/helper");
const upload = require("../utils/upload");

// const ethers = require("ethers");
// let rpc = config.MATIC_RPC;
// const provider = new Web3.providers.HttpProvider(rpc);
// const web3 = new Web3(provider);
// web3.eth.accounts.wallet.add(config.admin_private_key);

/**
 * User routes
 */

/**
 *  Adds the address of a new user
 *  @params address String
 *  @params signature String
 */

router.post(
  "/login",
  [
    check("wallet", "A valid address is required")
      .exists()
      .isEthereumAddress(),
    check("signature", "A valid signature is required")
      .exists()
      .isLength({ min: 132, max: 132 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ error: errors.array() });
      }

      let userExists = await userServiceInstance.userExists(req.body);
      if (userExists.length !== 0) {
        userExists = userExists[0];
        const message = "Sign in to BlockClip";
        if (
          auth.isValidSignature({
            message,
            owner: userExists.wallet,
            signature: req.body.signature,
          })
        ) {
          var token = jwt.sign({ userWallet: userExists.wallet }, config.secret, {
            expiresIn: constants.JWT_EXPIRY,
          });
          return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
            message: constants.RESPONSE_STATUS.SUCCESS,
            data: userExists,
            auth_token: token,
          });
        } else {
          return res
            .status(401)
            .json({ message: constants.MESSAGES.UNAUTHORIZED });
        }
      } else {
        let user = await userServiceInstance.createUser(req.body);
        if (user) {
          const { signature, wallet } = req.body;
          const message = "Sign in to BlockClip";
          if (
            auth.isValidSignature({
              message,
              owner: wallet,
              signature: signature,
            })
          ) {
            var token = jwt.sign({ userWallet: wallet }, config.secret, {
              expiresIn: constants.JWT_EXPIRY,
            });

            // let balance = await web3.eth.getBalance(user.wallet);
            // if (parseInt(balance) < parseInt(config.MINIMUM_BALANCE)) {
            //   await web3.eth.sendTransaction({
            //     from: config.FROM_ADDRESS,
            //     to: user.wallet,
            //     value: config.DONATION_AMOUNT,
            //     gas: "8000000",
            //   });
            // }
            return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
              message: constants.RESPONSE_STATUS.SUCCESS,
              data: user,
              auth_token: token,
            });
          } else {
            return res
              .status(401)
              .json({ message: constants.MESSAGES.UNAUTHORIZED });
          }
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
  }
);

/**
 *  Gets user detail from auth token
 */

router.get("/details", verifyToken, async (req, res) => {
  try {
    let userWallet = req.userWallet;
    let users = await userServiceInstance.getUser({ userWallet });
    return res
      .status(constants.RESPONSE_STATUS_CODES.OK)
      .json({ 
        message: constants.RESPONSE_STATUS.SUCCESS, 
        data: users 
      });
  } catch (err) {
    console.log(err);
    return res
      .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

/**
 *  Gets the user details by wallet
 */

router.get(
  "/:wallet", 
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
      .json({ message: 'wallet is not valid' });
  }

    let users = await userServiceInstance.getUser({ userWallet: wallet });

    if (users) {
      return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
        message: constants.RESPONSE_STATUS.SUCCESS,
        data: users
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
 *  Gets all the user details
 */

router.get("/", async (req, res) => {
  try {
    let limit = requestUtil.getLimit(req.query);
    let offset = requestUtil.getOffset(req.query);
    let orderBy = requestUtil.getSortBy(req.query, "+id");
    let username = requestUtil.getKeyword(req.query, "username");
    let wallet = requestUtil.getKeyword(req.query, "search");

    let users = await userServiceInstance.getUsers({
      limit,
      offset,
      orderBy,
      username,
      wallet
    })

    if (users) {
      return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
        message: constants.RESPONSE_STATUS.SUCCESS,
        data: {
          users: users.users,
          count: users.count
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
 *  Updates an existing user by wallet for admin
 */

router.put("/:wallet",
  verifyToken,
  async (req, res) => {
    try {
      let params = { userWallet: req.params.wallet, ...req.body };

      let userExists = await userServiceInstance.userExists(params);

      if (userExists.length === 0) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "user doesnt exists" });
      }

      let user = await userServiceInstance.updateUser(
        params
      );
      if (user) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: "user updated successfully", data: user });
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "user update failed" });
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
 *  Updates an existing user by wallet
 */

router.put("/",
  verifyToken,
  async (req, res) => {
    try {
      let params = { userWallet: req.userWallet, ...req.body };

      let userExists = await userServiceInstance.userExists(params);

      if (userExists.length === 0) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "user doesnt exists" });
      }

      let user = await userServiceInstance.updateUser(
        params
      );
      if (user) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: "user updated successfully", data: user });
      } else {
        return res
          .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
          .json({ message: "user update failed" });
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
 *  Post avatar of user
 */

router.post(
  "/avatar",
  verifyToken,
  upload.single("avatar"),
  async (req, res) => {
    try {
      let avatar = requestUtil.getFileURL(req.file);

      if (avatar) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: avatar });
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
 *  Post cover of user
 */

router.post(
  "/cover",
  verifyToken,
  upload.single("cover"),
  async (req, res) => {
    try {
      let cover = requestUtil.getFileURL(req.file);

      if (cover) {
        return res
          .status(constants.RESPONSE_STATUS_CODES.OK)
          .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: cover });
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

router.get("/notification", verifyToken, async (req, res) => {
  try {
    let params = { userWallet: req.userWallet, ...req.body };

    let notifications = await userServiceInstance.getNotifications(params);

    if (notifications) {
      return res
        .status(constants.RESPONSE_STATUS_CODES.OK)
        .json({ message: constants.RESPONSE_STATUS.SUCCESS, data: notifications });
    }

  } catch (err) {
    console.log(err);
    return res
        .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

module.exports = router;
