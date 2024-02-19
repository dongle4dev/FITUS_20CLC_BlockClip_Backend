let ethers = require("ethers");
let config = require("../../config/config");
let artifacts = require("./artifacts.json");
let mongodb = require("mongodb");
// const fetch = require("node-fetch");
// const provider = new ethers.HttpProvider(config.ETHEREUM_RPC);
// let { exchangeDataEncoder } = require("@0x/contracts-exchange");
// const ethers = new ethers(provider);
// const root_provider = new ethers.HttpProvider(config.ETHEREUM_RPC);
// let { BigNumber, providerUtils } = require("@0x/utils");
// const root_ethers = new ethers(root_provider);
// const prisma = require("../../prisma");
// let constants = require("../../config/constants");

// let {
//   MnemonicWalletSubprovider,
//   RPCSubprovider,
//   ethersProviderEngine,
// } = require("@0x/subproviders");

function isValidMongodbID(id) {
  return mongodb.ObjectId.isValid(id);
}

function isValidEthereumAddress(address) {
  return ethers.isAddress(address);
}

function toChecksumAddress(address) {
  return ethers.toChecksumAddress(address);
}

function toNumber(tokenId) {
  return ethers.hexToNumberString(tokenId);
}

function toHex(value) {
  return ethers.numberToHex(value);
}

function removeItemOnce(arr, value) {
  var index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
  return arr;
}

// async function notify({ userId, message, order_id, type }) {
//   try {
//     let notification = await prisma.notifications.create({
//       data: {
//         users: { connect: { id: parseInt(userId) } },
//         message,
//         orders: { connect: { id: parseInt(order_id) } },
//         type,
//       },
//     });

//     return notification;
//   } catch (err) {
//     console.log(err);
//     throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
//   }
// }

// var getRate = async function (symbol) {
//   try {
//     let response = await fetch(
//       `${constants.PRICE_API}${symbol.toLowerCase()}&vs_currencies=usd`
//     );
//     let data = await response.json();
//     return data[symbol.toLowerCase()].usd.toString();
//   } catch (err) {
//     console.log(err.message);
//   }
// };

async function checkOwnerShip(userAddress, tokenId, contractAddress) {
  const childContractInstance = new ethers.Contract(
    artifacts.BlockClipNft,
    contractAddress
  );

  try {
    let owner = await childContractInstance.methods.ownerOf(tokenId).call();

    if (toChecksumAddress(owner) === toChecksumAddress(userAddress)) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    return false;
  }
}

// async function checkTokenBalance(userAddress, amount, contractAddress) {
//   const childContractInstance = new ethers.eth.Contract(
//     artifacts.pos_ChildERC721,
//     contractAddress
//   );
//   let balance = await childContractInstance.methods
//     .balanceOf(userAddress)
//     .call();

//   if (parseInt(balance) >= parseInt(amount)) {
//     return true;
//   } else {
//     return false;
//   }
// }

// async function ethereum_balance(
//   owner,
//   rootContractAddress,
//   ethereumAddress,
//   userId,
//   type
// ) {
//   const rootContractInstance = new root_ethers.eth.Contract(
//     artifacts.pos_RootERC721,
//     rootContractAddress
//   );
//   let balance = await rootContractInstance.methods.balanceOf(owner).call();

//   let token_array = [];
//   let tokenId_array = [];

//   for (i = 0; i < balance; i++) {
//     tokenId_array.push(
//       rootContractInstance.methods.tokenOfOwnerByIndex(owner, i).call()
//     );
//   }

//   tokenId_array = await Promise.all(tokenId_array);

//   for (data of tokenId_array) {
//     token_array.push({
//       contract: rootContractAddress,
//       token_id: data,
//       owner: owner,
//       type,
//     });
//   }
//   return token_array;
// }

// async function matic_balance(owner) {
//   url = config.BALANCE_URL + owner;
//   let response = await fetch(url);
//   let tokenIdArray = (await response.json()).data.tokens;
//   return tokenIdArray;
// }

// async function fetchMetadata(contract, token_id) {
//   let tokenDetail = null;
//   url = config.TOKEN_DETAILS_URL + contract + "&id=" + token_id;
//   let response = await fetch(url);
//   if (response) {
//     tokenDetail = (await response.json()).data;
//   }
//   return tokenDetail;
// }

// async function fetchMetadataFromTokenURI(url) {
//   let tokenDetail = null;
//   let response = await fetch(url);
//   if (response) {
//     tokenDetail = await response.json();
//   }
//   return tokenDetail;
// }

// function getSignatureParameters(signature) {
//   if (!ethers.isHexStrict(signature)) {
//     throw new Error(
//       'Given value "'.concat(signature, '" is not a valid hex string.')
//     );
//   }
//   var r = signature.slice(0, 66);
//   var s = "0x".concat(signature.slice(66, 130));
//   var v = "0x".concat(signature.slice(130, 132));
//   v = ethers.hexToNumber(v);
//   if (![27, 28].includes(v)) v += 27;
//   return { r, s, v };
// }

/**
 * extracts r,s,v params from the given signature, constructs a function call to `executeMetaTransaction` function on the smart contract and executes it. The execution happens on Matic chain
 * txDetails = { intent, fnSig, from, contractAddress }
 * @param {object} txDetails transaction object that will be executed on Matic chain
 */
// async function executeMetaTransaction(txDetails) {
//   const { r, s, v } = getSignatureParameters(txDetails.intent);
//   const inputs = [
//     { name: "userAddress", type: "address" },
//     { name: "functionSignature", type: "bytes" },
//     { name: "sigR", type: "bytes32" },
//     { name: "sigS", type: "bytes32" },
//     { name: "sigV", type: "uint8" },
//   ];

//   if (!isValidEthereumAddress(txDetails.from)) {
//     console.log("`from` not valid account address");
//     throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
//   }

//   const data = ethers.eth.abi.encodeFunctionCall(
//     {
//       name: "executeMetaTransaction",
//       type: "function",
//       inputs,
//     },
//     [txDetails.from, txDetails.fnSig, r, s, v]
//   );
//   // add private key
//   ethers.eth.accounts.wallet.add(config.admin_private_key);
//   let execution,
//     txObj = {
//       from: ethers.eth.accounts.wallet[0].address,
//       data,
//       to: txDetails.contractAddress,
//     };
//   try {
//     gas = await ethers.eth.estimateGas(txObj);
//     execution = await ethers.eth.sendTransaction({
//       ...txObj,
//       gas,
//     });
//   } catch (err) {
//     console.log(err);
//     throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
//   }
//   return execution;
// }

// const calculateProtocolFee = (
//   orders,
//   gasPrice = constants.ZERO_EX.GAS_PRICE
// ) => {
//   return new BigNumber(150000).times(gasPrice).times(orders.length);
// };

// const providerEngine = () => {
//   const mnemonicWallet = new MnemonicWalletSubprovider({
//     mnemonic: config.MNEMONIC,
//     baseDerivationPath: constants.ZERO_EX.BASE_DERIVATION_PATH,
//   });
//   const pe = new ethersProviderEngine();
//   pe.addProvider(mnemonicWallet);
//   pe.addProvider(new RPCSubprovider(constants.ZERO_EX.RPC_URL));
//   providerUtils.startProviderEngine(pe);
//   return pe;
// };

// const encodeExchangeData = (signedOrder, functionName) => {
//   signedOrder.takerAssetAmount = new BigNumber(signedOrder.takerAssetAmount);
//   let data = exchangeDataEncoder.encodeOrdersToExchangeData(functionName, [
//     signedOrder,
//   ]);
//   return data;
// };

module.exports = {
  isValidEthereumAddress,
  // notify,
  //   getRate,
  toChecksumAddress,
  toNumber,
  toHex,
  removeItemOnce,
  //   matic_balance,
  //   ethereum_balance,
  //   executeMetaTransaction,
  //   calculateProtocolFee,
  //   providerEngine,
  //   encodeExchangeData,
  checkOwnerShip,
  isValidMongodbID,
  //   checkTokenBalance,
  //   fetchMetadata,
  //   fetchMetadataFromTokenURI,
};
