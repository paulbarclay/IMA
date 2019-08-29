import { BigNumber } from "bignumber.js";
import * as chaiAsPromised from "chai-as-promised";
import {
    ERC721OnChainContract,
    ERC721OnChainInstance,
    LockAndDataForMainnetContract,
    LockAndDataForMainnetERC721Contract,
    LockAndDataForMainnetERC721Instance,
    LockAndDataForMainnetInstance,
    LockAndDataForSchainContract,
    LockAndDataForSchainInstance,
    MessageProxyContract,
    MessageProxyInstance,
    TokenFactoryContract,
    TokenFactoryInstance,
    } from "../types/truffle-contracts";

import { createBytes32 } from "./utils/helper";
import { stringToHex } from "./utils/helper";

import chai = require("chai");
import { gasMultiplier } from "./utils/command_line";

chai.should();
chai.use((chaiAsPromised as any));

const MessageProxy: MessageProxyContract = artifacts.require("./MessageProxy");
const LockAndDataForMainnet: LockAndDataForMainnetContract = artifacts.require("./LockAndDataForMainnet");
const LockAndDataForSchain: LockAndDataForSchainContract = artifacts.require("./LockAndDataForSchain");
const LockAndDataForMainnetERC721: LockAndDataForMainnetERC721Contract =
    artifacts.require("./LockAndDataForMainnetERC721");
const TokenFactory: TokenFactoryContract = artifacts.require("./TokenFactory");
const ERC721OnChain: ERC721OnChainContract = artifacts.require("./ERC721OnChain");

contract("LockAndDataForMainnetERC721", ([deployer, user, invoker]) => {
  let messageProxy: MessageProxyInstance;
  let lockAndDataForMainnet: LockAndDataForMainnetInstance;
  let lockAndDataForSchain: LockAndDataForSchainInstance;
  let lockAndDataForMainnetERC721: LockAndDataForMainnetERC721Instance;
  let tokenFactory: TokenFactoryInstance;
  let eRC721OnChain: ERC721OnChainInstance;

  beforeEach(async () => {
    messageProxy = await MessageProxy.new("Mainnet", {from: deployer, gas: 8000000 * gasMultiplier});
    lockAndDataForMainnet = await LockAndDataForMainnet.new({from: deployer, gas: 8000000 * gasMultiplier});
    lockAndDataForSchain = await LockAndDataForSchain.new({from: deployer, gas: 8000000 * gasMultiplier});
    lockAndDataForMainnetERC721 =
        await LockAndDataForMainnetERC721.new(lockAndDataForMainnet.address,
        {from: deployer, gas: 8000000 * gasMultiplier});
    await lockAndDataForSchain.setContract("LockAndDataERC721", lockAndDataForMainnetERC721.address);
    tokenFactory = await TokenFactory.new(lockAndDataForSchain.address,
        {from: deployer, gas: 8000000 * gasMultiplier});
    eRC721OnChain = await ERC721OnChain.new("ERC721OnChain", "ERC721");

  });

  it("should NOT to send ERC721 to `to` when invoke `sendERC721`", async () => {
    // preparation
    const contractHere = eRC721OnChain.address;
    const to = user;
    const tokenId = 1;
    // mint some ERC721 of  for `deployer` address
    await eRC721OnChain.mint(deployer, tokenId, {from: deployer});
    // execution/expectation
    const res = await lockAndDataForMainnetERC721
        .sendERC721(contractHere, to, tokenId, {from: deployer});
    // expectation
    expect(await eRC721OnChain.ownerOf(tokenId)).to.be.equal(deployer);
  });

  it("should to send ERC721 to `to` when invoke `sendERC721`", async () => {
    // preparation
    const contractHere = eRC721OnChain.address;
    const to = user;
    const tokenId = 1;
    // mint some ERC721 of  for `deployer` address
    await eRC721OnChain.mint(deployer, tokenId, {from: deployer});
    // transfer tokenId from `deployer` to `lockAndDataForMainnetERC721`
    await eRC721OnChain.transferFrom(deployer,
        lockAndDataForMainnetERC721.address, tokenId, {from: deployer});
    // execution
    const res = await lockAndDataForMainnetERC721
        .sendERC721(contractHere, to, tokenId, {from: deployer});
    // expectation
    expect(await eRC721OnChain.ownerOf(tokenId)).to.be.equal(user);
  });

  it("should add ERC721 token when invoke `sendERC721`", async () => {
    // preparation
    const contractHere = eRC721OnChain.address;
    // execution#1
    const res = await lockAndDataForMainnetERC721
        .addERC721Token(contractHere, {from: deployer});
    // expectation#1
    parseInt(new BigNumber(res.logs[0].args.index).toString(), 10)
        .should.be.equal(1);
    // execution#2
    const res1 = await lockAndDataForMainnetERC721
        .addERC721Token(contractHere, {from: deployer});
    // expectation#2
    parseInt(new BigNumber(res1.logs[0].args.index).toString(), 10)
        .should.be.equal(2);
  });

});
