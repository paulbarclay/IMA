// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @license
 * SKALE IMA
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * @file Linker.spec.ts
 * @copyright SKALE Labs 2019-Present
 */

import chaiAsPromised from "chai-as-promised";
import chai = require("chai");
import {
    ContractManager,
    DepositBoxEth,
    DepositBoxERC20,
    DepositBoxERC721,
    Linker,
    MessageProxyForMainnet,
} from "../typechain";
import { randomString, stringValue } from "./utils/helper";


chai.should();
chai.use((chaiAsPromised as any));

import { deployDepositBoxEth } from "./utils/deploy/mainnet/depositBoxEth";
import { deployDepositBoxERC20 } from "./utils/deploy/mainnet/depositBoxERC20";
import { deployDepositBoxERC721 } from "./utils/deploy/mainnet/depositBoxERC721";
import { deployLinker } from "./utils/deploy/mainnet/linker";
import { deployMessageProxyForMainnet } from "./utils/deploy/mainnet/messageProxyForMainnet";
import { deployContractManager } from "./utils/skale-manager-utils/contractManager";

import { initializeSchain } from "./utils/skale-manager-utils/schainsInternal";

import { ethers, web3 } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { BigNumber } from "ethers";

import { assert, expect } from "chai";

describe("Linker", () => {
    let deployer: SignerWithAddress;
    let user: SignerWithAddress;
    let user2: SignerWithAddress;

    let depositBoxEth: DepositBoxEth;
    let depositBoxERC20: DepositBoxERC20;
    let depositBoxERC721: DepositBoxERC721;
    let contractManager: ContractManager;
    let messageProxy: MessageProxyForMainnet;
    let linker: Linker;
    let contractManagerAddress = "0x0000000000000000000000000000000000000000";

    before(async () => {
        [deployer, user, user2] = await ethers.getSigners();
    });

    beforeEach(async () => {
        contractManager = await deployContractManager(contractManagerAddress);
        contractManagerAddress = contractManager.address;
        messageProxy = await deployMessageProxyForMainnet(contractManager);
        linker = await deployLinker(messageProxy, contractManager);
        depositBoxEth = await deployDepositBoxEth(contractManager, messageProxy, linker);
        depositBoxERC20 = await deployDepositBoxERC20(contractManager, messageProxy, linker);
        depositBoxERC721 = await deployDepositBoxERC721(contractManager, messageProxy, linker);
        await linker.removeMainnetContract(depositBoxEth.address);
        await linker.removeMainnetContract(depositBoxERC20.address);
        await linker.removeMainnetContract(depositBoxERC721.address);
    });

    it("should connect schain", async () => {
        const schainName = randomString(10);
        const nullAddress = "0x0000000000000000000000000000000000000000";

        // only owner can add schain:
        await linker.connect(user).connectSchain(schainName, []).should.be.rejected;

        // Token Manager address shouldn't be equal zero:
        await linker.connect(deployer).connectSchain(schainName, [nullAddress])
            .should.be.eventually.rejectedWith("Incorrect number of addresses");

        await linker.connect(deployer).connectSchain(schainName, []);
    });

    it("should connect schain with 1 tokenManager", async () => {
        const schainName = randomString(10);
        const nullAddress = "0x0000000000000000000000000000000000000000";
        const tokenManagerAddress = user.address;

        expect(await linker.hasMainnetContract(depositBoxEth.address)).to.equal(false);

        await linker.connect(deployer).registerMainnetContract(depositBoxEth.address);

        expect(await linker.hasMainnetContract(depositBoxEth.address)).to.equal(true);

        await linker.connect(deployer).connectSchain(schainName, [])
            .should.be.eventually.rejectedWith("Incorrect number of addresses");

        await linker.connect(deployer).connectSchain(schainName, [tokenManagerAddress, nullAddress])
            .should.be.eventually.rejectedWith("Incorrect number of addresses");

        expect(await linker.hasSchain(schainName)).to.equal(false);

        await linker.connect(deployer).connectSchain(schainName, [nullAddress])
            .should.be.eventually.rejectedWith("Incorrect Token Manager address");

        await linker.connect(deployer).connectSchain(schainName, [tokenManagerAddress])

        expect(await linker.hasSchain(schainName)).to.equal(true);

    });

    it("should connect schain with 3 tokenManager", async () => {
        const schainName = randomString(10);
        const nullAddress = "0x0000000000000000000000000000000000000000";
        const tokenManagerAddress = user.address;

        expect(await linker.hasMainnetContract(depositBoxEth.address)).to.equal(false);
        expect(await linker.hasMainnetContract(depositBoxERC20.address)).to.equal(false);
        expect(await linker.hasMainnetContract(depositBoxERC721.address)).to.equal(false);
        expect(await linker.hasMainnetContract(linker.address)).to.equal(false);

        await linker.connect(deployer).registerMainnetContract(depositBoxEth.address);
        await linker.connect(deployer).registerMainnetContract(depositBoxERC20.address);
        await linker.connect(deployer).registerMainnetContract(depositBoxERC721.address);
        await linker.connect(deployer).registerMainnetContract(linker.address);

        expect(await linker.hasMainnetContract(depositBoxEth.address)).to.equal(true);
        expect(await linker.hasMainnetContract(depositBoxERC20.address)).to.equal(true);
        expect(await linker.hasMainnetContract(depositBoxERC721.address)).to.equal(true);
        expect(await linker.hasMainnetContract(linker.address)).to.equal(true);

        await linker.connect(deployer).connectSchain(schainName, [])
            .should.be.eventually.rejectedWith("Incorrect number of addresses");

        await linker.connect(deployer).connectSchain(schainName, [tokenManagerAddress])
            .should.be.eventually.rejectedWith("Incorrect number of addresses");

        await linker.connect(deployer).connectSchain(schainName, [tokenManagerAddress, nullAddress])
            .should.be.eventually.rejectedWith("Incorrect number of addresses");

        await linker.connect(deployer).connectSchain(schainName, [tokenManagerAddress, nullAddress, tokenManagerAddress])
            .should.be.eventually.rejectedWith("Incorrect number of addresses");

        expect(await linker.hasSchain(schainName)).to.equal(false);

        await linker.connect(deployer).connectSchain(schainName, [nullAddress, tokenManagerAddress, nullAddress, tokenManagerAddress])
            .should.be.eventually.rejectedWith("Incorrect Token Manager address");

        await linker.connect(deployer).connectSchain(schainName, [tokenManagerAddress, tokenManagerAddress, tokenManagerAddress, tokenManagerAddress])

        expect(await linker.hasSchain(schainName)).to.equal(true);
    });

    it("should invoke `unconnectSchain` without mistakes", async () => {
        const schainName = randomString(10);
        const nullAddress = "0x0000000000000000000000000000000000000000";
        const tokenManagerAddress = user.address;

        await linker.connect(deployer).registerMainnetContract(depositBoxEth.address);
        await linker.connect(deployer).registerMainnetContract(depositBoxERC20.address);
        await linker.connect(deployer).registerMainnetContract(depositBoxERC721.address);
        await linker.connect(deployer).registerMainnetContract(linker.address);

        await linker.connect(deployer).connectSchain(schainName, [tokenManagerAddress, tokenManagerAddress, tokenManagerAddress, tokenManagerAddress]);

        expect(await linker.hasSchain(schainName)).to.equal(true);

        await linker.connect(user).unconnectSchain(schainName).should.be.rejected;
        await linker.connect(deployer).unconnectSchain(schainName);

        expect(await linker.hasSchain(schainName)).to.equal(false);
    });

    it("should register and remove depositBoxes", async () => {
        const nullAddress = "0x0000000000000000000000000000000000000000";
        const tokenManagerAddress = user.address;

        expect(await linker.hasMainnetContract(depositBoxEth.address)).to.equal(false);
        expect(await linker.hasMainnetContract(depositBoxERC20.address)).to.equal(false);
        expect(await linker.hasMainnetContract(depositBoxERC721.address)).to.equal(false);

        await linker.connect(deployer).registerMainnetContract(depositBoxEth.address);
        await linker.connect(deployer).registerMainnetContract(depositBoxERC20.address);
        await linker.connect(deployer).registerMainnetContract(depositBoxERC721.address);

        expect(await linker.hasMainnetContract(depositBoxEth.address)).to.equal(true);
        expect(await linker.hasMainnetContract(depositBoxERC20.address)).to.equal(true);
        expect(await linker.hasMainnetContract(depositBoxERC721.address)).to.equal(true);

        expect(await linker.hasMainnetContract(nullAddress)).to.equal(false);
        expect(await linker.hasMainnetContract(tokenManagerAddress)).to.equal(false);

        await linker.connect(user).registerMainnetContract(nullAddress).should.be.rejected;
        await linker.connect(deployer).registerMainnetContract(nullAddress);

        expect(await linker.hasMainnetContract(nullAddress)).to.equal(true);
        expect(await linker.hasMainnetContract(tokenManagerAddress)).to.equal(false);

        await linker.connect(deployer).registerMainnetContract(tokenManagerAddress);

        expect(await linker.hasMainnetContract(tokenManagerAddress)).to.equal(true);

        await linker.connect(user).removeMainnetContract(tokenManagerAddress).should.be.rejected;
        await linker.connect(deployer).removeMainnetContract(tokenManagerAddress);

        expect(await linker.hasMainnetContract(tokenManagerAddress)).to.equal(false);

        await linker.connect(deployer).removeMainnetContract(nullAddress);

        expect(await linker.hasMainnetContract(nullAddress)).to.equal(false);

        await linker.connect(deployer).removeMainnetContract(depositBoxEth.address);
        await linker.connect(deployer).removeMainnetContract(depositBoxERC20.address);
        await linker.connect(deployer).removeMainnetContract(depositBoxERC721.address);

        expect(await linker.hasMainnetContract(depositBoxEth.address)).to.equal(false);
        expect(await linker.hasMainnetContract(depositBoxERC20.address)).to.equal(false);
        expect(await linker.hasMainnetContract(depositBoxERC721.address)).to.equal(false);
    });

    it("should allow interchain connection", async () => {
        const schainName = randomString(10);
        await linker.connect(deployer).allowInterchainConnections(schainName).should.be.eventually.rejectedWith("Destination chain is not initialized");
        await linker.connect(deployer).connectSchain(schainName, []);
        expect(await linker.interchainConnections(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(false);
        await linker.connect(deployer).allowInterchainConnections(schainName);
        expect(await linker.interchainConnections(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(true);
    });

    it("should raise a message during allow interchain connection", async () => {
        const schainName = randomString(10);
        await linker.connect(deployer).connectSchain(schainName, []);
        const res = await (await linker.connect(deployer).allowInterchainConnections(schainName)).wait();
        if (!res.events) {
            assert("No events were emitted");
        } else {
            expect(res.events[0]?.topics[0]).to.equal(stringValue(web3.utils.soliditySha3("OutgoingMessage(bytes32,uint256,address,address,bytes)")));
            expect(res.events[0]?.topics[1]).to.equal(stringValue(web3.utils.soliditySha3(schainName)));
            expect(BigNumber.from(res.events[0]?.topics[2]).toString()).to.equal("0");
            expect(stringValue(web3.utils.toChecksumAddress("0x" + res.events[0]?.topics[3].slice(-40)))).to.equal(linker.address);
        }
    });

    it("should kill schain by schain owner first", async () => {
        const schainName = randomString(10);
        // schain owner is user
        initializeSchain(contractManager, schainName, user.address, 1, 1);
        await linker.connect(deployer).connectSchain(schainName, []);
        expect(await linker.isNotKilled(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(true);
        expect(await linker.statuses(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(0);
        await linker.connect(user).kill(schainName);
        expect(await linker.isNotKilled(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(true);
        expect(await linker.statuses(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(1);
        await linker.connect(user).kill(schainName).should.be.eventually.rejectedWith("Already killed or incorrect sender");
        await linker.connect(deployer).kill(schainName);
        expect(await linker.isNotKilled(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(false);
        expect(await linker.statuses(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(3);
    });

    it("should kill schain by deployer first", async () => {
        const schainName = randomString(10);
        // schain owner is user
        initializeSchain(contractManager, schainName, user.address, 1, 1);
        await linker.connect(deployer).connectSchain(schainName, []);
        expect(await linker.isNotKilled(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(true);
        expect(await linker.statuses(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(0);
        await linker.connect(deployer).kill(schainName);
        expect(await linker.isNotKilled(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(true);
        expect(await linker.statuses(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(2);
        await linker.connect(user).kill(schainName);
        expect(await linker.isNotKilled(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(false);
        expect(await linker.statuses(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(3);
    });

    it("should not kill schain if interchain connection allowed", async () => {
        const schainName = randomString(10);
        // schain owner is user
        initializeSchain(contractManager, schainName, user.address, 1, 1);
        await linker.connect(deployer).connectSchain(schainName, []);
        await linker.connect(deployer).allowInterchainConnections(schainName);
        expect(await linker.isNotKilled(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(true);
        expect(await linker.statuses(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(0);
        await linker.connect(deployer).kill(schainName).should.be.eventually.rejectedWith("Interchain connections turned on");
    });

    it("should not allow interchain connection during kill process", async () => {
        const schainName = randomString(10);
        // schain owner is user
        initializeSchain(contractManager, schainName, user.address, 1, 1);
        await linker.connect(deployer).connectSchain(schainName, []);
        expect(await linker.isNotKilled(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(true);
        expect(await linker.statuses(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(0);
        await linker.connect(deployer).kill(schainName);
        await linker.connect(deployer).allowInterchainConnections(schainName).should.be.eventually.rejectedWith("Schain is in kill process");
        expect(await linker.isNotKilled(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(true);
        expect(await linker.statuses(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(2);
        await linker.connect(user).kill(schainName);
        await linker.connect(deployer).allowInterchainConnections(schainName).should.be.eventually.rejectedWith("Schain is in kill process");
        expect(await linker.isNotKilled(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(false);
        expect(await linker.statuses(stringValue(web3.utils.soliditySha3(schainName)))).to.equal(3);
    });

});