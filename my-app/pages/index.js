import { Contract, providers, utils } from "ethers";
import Head from "next/head";
import Web3Modal from "web3modal";
import React, { useEffect, useRef, useState } from "react";
import { abi, NFT_CONTRACT_ADDRESS } from "../constants";
import styles from "../styles/Home.module.css";

export default function Home() {
  // whether the user's wallet is collected or not.
  const [walletConnected, setWalletConnected] = useState(false);
  // whether the presale has started or not.
  const [presaleStarted, setPresaleStarted] = useState(false);
  // whether presale has ended or not.
  const [presaleEnded, setPresaleEnded] = useState(false);
  // loading is set to true when we're waiting for a transaction to be mined.
  const [loading, setLoading] = useState(false);
  // whether the currently connected metamask wallest is the owner of the contract.
  const [isOwner, setIsOwner] = useState(false);
  // No of tokenIds minted.
  const [tokenIdsMinted, setTokenIdsMinted] = useState("0");
  // Web 3 modal reference.
  const web3ModalRef = useRef();

  // minting an Nft during a presale.
  const presaleMint = async () => {
    try {
      // We need a signer here, because it is a 'write' transaction.
      const signer = await getProviderOrSigner(true);

      // creating a new instance of the contract with the signer, which allows update methods.
      const whitelistContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);

      // calling the presalemint from the contract, only whitelisted addresses would be able to mint.
      const tx = await whitelistContract.presaleMint({
        // value signifies the cost of one crypto that is 0.01 eth.
        // We are parsing 0.01 string to ether using the utils library from ethers.js
        value: utils.parseEther("0.01"),
      });
      setLoading(true);
      // Waiting for the transaction to be mined;
      await tx.wait();
      setLoading(false);
      window.alert("You successfully mined a crypto Dev");
    } catch (err) {
      console.log(err);
    }
  };

  // publicMint -> Mint an NFT after the presale.
  const publicMint = async () => {
    try {
      // We need a signer here as it is a write operation.
      const signer = await getProviderOrSigner(true);

      const whitelistContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);

      // Calling the mint function to mint the crypto dev NFt.
      const tx = await whitelistContract.mint({
        value: utils.parseEther("0.01"),
      });

      setLoading(true);

      await tx.wait();

      setLoading(false);

      window.alert("You successfully mined a crypto Dev.");
    } catch (err) {
      console.log(err);
    }
  };

  // connect to wallet -> Connects the metamask wallet
  const connectWallet = async () => {
    try {
      // Get the provider from web3modal, which in our case is Metamask
      // When used for the first time, it prompts the user to connect their wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.log(err);
    }
  };

  // start the presale for the NFT collection.
  const startPresale = async () => {
    try {
      const signer = await getProviderOrSigner(true);

      const whitelistedContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );

      // calls the start presale from the contract
      const tx = await whitelistedContract.startPresale();
      setLoading(true);
      await tx.wait();
      setLoading(false);
      await checkIfPresaleStarted(true);
    } catch (err) {
      console.log(err);
    }
  };

  // checks if the presale has started by quering the presaleStarted variable in the contract.
  const checkIfPresaleStarted = async () => { 
    try {
      // getting the provider from web3modal.
      // no need for signer as we are only reading state from the blockchain.
      const provider = await getProviderOrSigner();
      // we connect to the contract using the provider so we would only have read-only access to the contract.
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      const _presaleStarted = await nftContract.presaleStarted();

      if (!_presaleStarted) {
        await getOwner();
      }

      setPresaleStarted(_presaleStarted);
      return !_presaleStarted;
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  // checks if the presale ended by quering the presaleEnded variable in the contract.
  const checkIfPresaleEnded = async () => {
    try {
      // No need for the signer as we're just reading state from the blockchain.
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      const _presaleEnded = await nftContract.presaleEnded();

      // _presaleEnded is a Big Number, so we are using the lt(less than function) instead of `<`
      // Date.now()/1000 returns the current time in seconds
      // We compare if the _presaleEnded timestamp is less than the current time
      // which means presale has ended
      const hasEnded = _presaleEnded.lt(Math.floor(Date.now() / 1000));

      if (hasEnded) {
        setPresaleEnded(true);
      } else {
        setPresaleEnded(false);
      }

      return hasEnded;
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  // calls the contract to retrieve the owner.
  const getOwner = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      const _owner = await nftContract.owner();

      // We will get the signer now to extract the address of the currently connected Metamask account.
      const signer = await getProviderOrSigner(true);

      const address = await signer.getAddress();

      // Check if the owner is the same as retrieved from the metamask address.
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (err) {
      console.log(err.message);
    }
  };

  // gets the number of tokens that have been minted.
  const getTokenIdsMinted = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      const _tokenIds = await nftContract.tokenIds();
      // TokenIds is a BigNumber. We need to convert it to a string.
      setTokenIdsMinted(_tokenIds.toString());
    } catch (err) {
      console.error(err);
    }
  };

  const getProviderOrSigner = async (needSigner = false) => {
    // connect to metamask
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Rinkeby network, let them know and throw an error.
    const { chainId } = await web3Provider.getNetwork();

    if (chainId !== 4) {
      window.alert("Change network to Rinkeby");
      throw new Error("Change network to Rinkeby");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  // Whenever the value of 'walletConnected' changes, the value will change.
  useEffect(() => {
    // If wallet is not connected, create a new instance of Web3Modal and connect the Metamask wallet.
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();

      // Check if presale has started or not.
      const _presaleStarted = checkIfPresaleStarted();
      if (_presaleStarted) {
        checkIfPresaleEnded();
      }

      getTokenIdsMinted();

      // an interval which gets called every 5 seconds to check presale has ended or not.
      const presaleEndedInterval = setInterval(async function () {
        const _presaleStarted = await checkIfPresaleStarted();
        if (_presaleStarted) {
          const _presaleEnded = checkIfPresaleEnded();
          if (_presaleEnded) {
            clearInterval(presaleEndedInterval);
          }
        }
      }, 5 * 1000);
    }
  }, [walletConnected]);

  const renderButton = () => {
    // If wallet is not connected, return a button which allows them to connect their wllet
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    }

    // If we are currently waiting for something, return a loading button
    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }

    // If connected user is the owner, and presale hasnt started yet, allow them to start the presale
    if (isOwner && !presaleStarted) {
      return (
        <button className={styles.button} onClick={startPresale}>
          Start Presale!
        </button>
      );
    }

    // If connected user is not the owner but presale hasn't started yet, tell them that
    if (!presaleStarted) {
      return (
        <div>
          <div className={styles.description}>Presale hasnt started!</div>
        </div>
      );
    }

    // If presale started, but hasn't ended yet, allow for minting during the presale period
    if (presaleStarted && !presaleEnded) {
      return (
        <div>
          <div className={styles.description}>
            Presale has started!!! If your address is whitelisted, Mint a Crypto
            Dev 🥳
          </div>
          <button className={styles.button} onClick={presaleMint}>
            Presale Mint 🚀
          </button>
        </div>
      );
    }

    // If presale started and has ended, its time for public minting
    if (presaleStarted && presaleEnded) {
      return (
        <button className={styles.button} onClick={publicMint}>
          Public Mint 🚀
        </button>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="Whitelist-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
          <div className={styles.description}>
            Its an NFT collection for developers in Crypto.
          </div>
          <div className={styles.description}>
            {tokenIdsMinted}/20 have been minted
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="/lapboy.png" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  );
}
