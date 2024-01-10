let signUtil = require("@metamask/eth-sig-util");
var ethUtil = require("ethereumjs-util");
let config = require('../../config/config')

function getSignTypedData({ owner }) {
  return {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "host", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      Test: [{ name: "owner", type: "string" }],
    },
    domain: {
      name: "name",
      host: "",
      version: "1",
      verifyingContract: "0x0",
      chainId: "1",
    },
    primaryType: "Test",
    message: { owner },
  };
}

function isValidSignature({ message, owner, signature }) {
  const messageToVerify = message;
  const nonce = "\x19Ethereum Signed Message:\n" +
    messageToVerify.length +
    messageToVerify;

  const messageBuffer = ethUtil.keccak(Buffer.from(nonce, 'utf-8'));

  const { v, r, s } = ethUtil.fromRpcSig(signature);

  const pubKey = ethUtil.ecrecover(ethUtil.toBuffer(messageBuffer), v, r, s);
  const addrBuffer = ethUtil.pubToAddress(pubKey);
  const address = ethUtil.bufferToHex(addrBuffer);

  if (
    ethUtil.toChecksumAddress(address) !== ethUtil.toChecksumAddress(owner)
  ) {
    return false;
  }
  return true;
}

module.exports = {
  isValidSignature,
};
