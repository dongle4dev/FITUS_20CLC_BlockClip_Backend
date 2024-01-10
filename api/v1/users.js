const express = require("express");
const router = express.Router({ mergeParams: true });
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const auth = require("../utils/auth");
const config = require("../../config/config");
const constants = require("../../config/constants");
const verifyToken = require("../middlewares/verify-token");


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
    check("address", "A valid address is required")
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

      // let userExists = await userServiceInstance.userExists(req.body);
      // if (userExists) {
      //   if (
      //     auth.isValidSignature({
      //       owner: userExists.address,
      //       signature: req.body.signature,
      //     })
      //   ) {
      //     var token = jwt.sign({ userId: userExists.id }, config.secret, {
      //       expiresIn: constants.JWT_EXPIRY,
      //     });
      //     return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
      //       message: constants.RESPONSE_STATUS.SUCCESS,
      //       data: userExists,
      //       auth_token: token,
      //     });
      //   } else {
      //     return res
      //       .status(401)
      //       .json({ message: constants.MESSAGES.UNAUTHORIZED });
      //   }
      // } else {
        // let user = await userServiceInstance.createUser(req.body);
        // if (user) {
          const { signature, address } = req.body;
          const message = "Sign in to BlockClip";
          if (
            auth.isValidSignature({
              message,
              owner: address,
              signature: signature,
            })
          ) {
            // var token = jwt.sign({ userId: user.id }, config.secret, {
            //   expiresIn: constants.JWT_EXPIRY,
            // });
            var token = jwt.sign({ address }, config.secret, {
              expiresIn: constants.JWT_EXPIRY,
            });

            // let balance = await web3.eth.getBalance(user.address);
            // if (parseInt(balance) < parseInt(config.MINIMUM_BALANCE)) {
            //   await web3.eth.sendTransaction({
            //     from: config.FROM_ADDRESS,
            //     to: user.address,
            //     value: config.DONATION_AMOUNT,
            //     gas: "8000000",
            //   });
            // }
            return res.status(constants.RESPONSE_STATUS_CODES.OK).json({
              message: constants.RESPONSE_STATUS.SUCCESS,
              // data: user,
              auth_token: token,
            });
          } else {
            return res
              .status(401)
              .json({ message: constants.MESSAGES.UNAUTHORIZED });
          }
        // } else {
        //   return res
        //     .status(constants.RESPONSE_STATUS_CODES.BAD_REQUEST)
        //     .json({ message: constants.RESPONSE_STATUS.FAILURE });
        // }
      // }
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
    // let userId = req.userId;
    // let users = await userServiceInstance.getUser({ userId });
    return res
      .status(constants.RESPONSE_STATUS_CODES.OK)
      .json({ 
        message: constants.RESPONSE_STATUS.SUCCESS, 
        // data: users 
      });
  } catch (err) {
    console.log(err);
    return res
      .status(constants.RESPONSE_STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: constants.MESSAGES.INTERNAL_SERVER_ERROR });
  }
});


module.exports = router;
