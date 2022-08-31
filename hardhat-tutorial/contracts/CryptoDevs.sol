// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IWhitelist.sol";

// Create a contract and inherit from ERC21Enumerable, Ownable
contract CryptoDevs is ERC721Enumerable, Ownable {
    /**
     * @dev _baseTokenURI for computing {tokenURI}. If set, the resulting URI for each
     * token will be the concatenation of the `baseURI` and the `tokenId`.
     */
    string _baseTokenURI;

    // The price of one crypto dev NFT.
    uint256 public _price = 0.01 ether;

    // Boolean used to pause the contract in case of an emergency.
    bool public _paused;

    // max number of cryptoDev NFTs.
    uint256 public maxTokenIds = 20;

    // total number of current token Ids minted.
    uint256 public tokenIds;

    // Whitelist contract instance
    IWhitelist whitelist;

    // boolean to keep track of whether the presale started or not.
    bool public presaleStarted;

    // The timestamp for when the presale would end.
    uint256 public presaleEnded;

    // Modifier / Middleware to check whether the contract is paused or not.
    modifier onlyWhenNotPaused() {
        require(!_paused, "Contract currently paused");
        _;
    }

    // ERC721 contructor takes in a 'name' and a 'symbol' to the token collection
    // Our contructor takes in the baseURI to set the _baseTokenURI from the collection
    // It also initializes an instance of the whitelist interface.

    constructor (string memory baseURI, address whitelistContract) ERC721("Crypto Devs", "CD") {
        _baseTokenURI = baseURI;
        whitelist = IWhitelist(whitelistContract);
    }

    // function to start a presale for the whitelisted addresses. 
    function startPresale() public onlyOwner {
        presaleStarted = true;
        // Set presale time as current timestamp + 5 minutes.
        // Solidity has cool syntax for timestamps
        presaleEnded = block.timestamp + 5 minutes;
    }

    // function that allows a user to mint one NFT per transaction during the presale has ended. 
    // We also use the onlyWhenNotPaused modifier / middleware here. 
    function presaleMint() public payable onlyWhenNotPaused {
        // Check if the presale time has started and it's not ended
        require(presaleStarted && block.timestamp < presaleEnded, "Presale is not running");
        // Check if the user's address is whitelisted.
        require(whitelist.whitelistedAddresses(msg.sender), "You are not whitelisted");
        // Check if maximum no of NFTs has exceeded or not. 
        require(tokenIds < maxTokenIds, "Exceeded maximum crypto Devs supply");
        // Check if the price amount is correct. 
        require(msg.value >= _price, "The amount of eth sent is not enough");
        // Incrementing the current no. of tokenIds 
        tokenIds += 1;

        // safemint is a safer version of the _mint function as it ensures that
        // if the address being minted to is a contract then it knows how to deal with ERC721
        // If the address being minted to is not a contract, it works the same way as _mint.
        // We pass the address of the user and the token id. 
        _safeMint(msg.sender, tokenIds);
    }

    // Function that allows a user to mint one NFT per transaction after the presale has ended. 
    function mint() public payable onlyWhenNotPaused {
        // Check if presale is still going on. 
        require(presaleStarted && block.timestamp >= presaleEnded, "Presale is still running");
        // Check if maximum no of NFTs has exceeded or not. 
        require(tokenIds < maxTokenIds, "Maximum No of Nfts Exceeded");
        // Check ether price
        require(msg.value >= _price, "amount of eth sent is not correct");
        // Increment tokenIds
        tokenIds += 1;
        // _safeMint to the address
        _safeMint(msg.sender, tokenIds);
    }

    // Overrides the oppenzeppelin's ERC721 implementation which by default returns an empty string for the baseURI
    function _baseURI() internal view virtual override returns(string memory) {
        return _baseTokenURI;
    }

    // function that makes the contract paused or unpaused. 
    function setPaused(bool val) public onlyOwner {
        _paused = val;
    }

    // Function that sends all the ether in the contract to the owner in the contract. 
    function withDraw() public onlyOwner {
        // getting the address of the current owner.
        address _owner = owner();
        // getting the balance of the owner
        uint amount = address(this).balance;
        // sending the amount to the owner's address
        (bool sent, ) = _owner.call{value: amount}("");
        require(sent, "Failed to sent Ether");
    }

    // Function to receive Ether. msg.data must be empty.
    receive() external payable {}

    // Fallback function is called when msg.data is not empty. 
    fallback() external payable {}

}