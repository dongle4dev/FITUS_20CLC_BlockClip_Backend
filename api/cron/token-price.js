const pinataSDK = require("@pinata/sdk");
const config = require("../../config/config");
const pinata = new pinataSDK(config.PINATA_API_KEY, config.PINATA_API_SECRET);
const fs = require("fs");
const axios = require("axios");
var { Web3 } = require("web3");
const rpcUrl = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const web3 = new Web3(rpcUrl);
const TokenService = require("../services/token");
let artifacts = require("../utils/artifacts.json");
const tokenServiceInstance = new TokenService();
const collectionService = require("../services/collection");
let collectionServiceInstance = new collectionService();
const cron = require("node-cron");
// const erc20TokenService = require("../services/erc20-token");
// let erc20TokenServiceInstance = new erc20TokenService();
// let helper = require("../utils/helper");

cron.schedule("0 */2 * * *", async function () {
  // let tokenList = await erc20TokenServiceInstance.getERC20TokenList();
  // let weth_price = await helper.getRate("WETH");
  // let dai_price = await helper.getRate("DAI");

  // for (token of tokenList) {
  //   let price;
  //   if (token.symbol == "WETH") {
  //     price = weth_price;
  //   } else {
  //     price = dai_price;
  //   }
  //   console.log(
  //     await erc20TokenServiceInstance.updateERC20Token({
  //       id: token.id,
  //       market_price: price,
  //     })
  //   );
  // }
  await syncCollection();
  await syncToken();
});

const tokenContractAddress = "0xC94D4239B037B842f1Ed92dAC48884eA2Ed06563";
const contractABI = artifacts;

const syncToken = async () => {
  // Create contract instance
  if (contractABI != "") {
    var MyContract = await new web3.eth.Contract(
      contractABI.BlockClipNft,
      tokenContractAddress
    );
    // console.log("Methods", await MyContract.methods);
    const tokenCount = await MyContract.methods._tokenIds().call();

    for (let i = 0; i < tokenCount; i++) {
      console.log("Token ID", i);
      const token = await MyContract.methods.tokenURI(i).call();
      const response = await axios.get(token);
      const tokenData = await tokenServiceInstance.getTokenByTokenID({
        tokenID: i.toString(),
      });
      const tokenDataByContract = await MyContract.methods._idToNft(i).call();
      if (tokenData) {
        await tokenServiceInstance.updateToken({
          id: tokenData.id,
          ...response.data,
        });
      } else if (tokenDataByContract) {
        const res = await tokenServiceInstance.createToken({
          ...response.data,
          collectionID: tokenDataByContract.collectionId.toString(),
          contractAddress: tokenContractAddress,
        });
        await tokenServiceInstance.updateToken({
          id: res.token.id,
          tokenID: i.toString(),
        });
      }
    }
  } else {
    console.log("Error");
  }
};

const syncCollection = async () => {
  try {
    var MyContract = await new web3.eth.Contract(
      contractABI.BlockClipNft,
      tokenContractAddress
    );
    // console.log("Methods", await MyContract.methods.getCollectionById(1).call());
    const collectionList = await MyContract.methods.getListCollection().call();

    for (let i = 0; i < collectionList.length; i++) {
      console.log("Collection ID", i);
      const collectionURI = await MyContract.methods.getCollectionURI(i).call();
      const response = await axios.get(collectionURI);
      const collection =
        await collectionServiceInstance.getCollectionByCollectionID({
          collectionID: i.toString(),
        });
      if (collection) {
        await collectionServiceInstance.updateCollection({
          id: collection.id,
          ...response.data,
        });
      } else {
        delete response.data.contractAddress;
        const res = await collectionServiceInstance.createCollection({
          ...response.data,
          collectionID: i.toString(),
        });
        await collectionServiceInstance.updateCollection({
          id: res.collection.id,
          ...response.data,
          collectionID: i.toString(),
        });
      }
    }
  } catch (error) {
    console.log(error);
  }
};