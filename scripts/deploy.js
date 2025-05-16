// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title DigitalAuction
 * @dev Smart contract for auctioning digital goods
 */
contract DigitalAuction {
    struct Auction {
        uint256 id;
        address payable seller;
        string digitalItemURI;
        string digitalItemDescription;
        uint256 startingPrice;
        uint256 highestBid;
        address payable highestBidder;
        uint256 endTime;
        bool ended;
    }

    mapping(uint256 => Auction) public auctions;
    uint256 public auctionCounter;
    
    // Events
    event AuctionCreated(uint256 indexed auctionId, address indexed seller, string digitalItemURI, uint256 startingPrice, uint256 endTime);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount);

    /**
     * @dev Create a new auction for a digital item
     * @param _digitalItemURI URI to the digital item (IPFS hash or other identifier)
     * @param _digitalItemDescription Description of the digital item
     * @param _startingPrice Starting price for the auction
     * @param _durationInMinutes Duration of the auction in minutes
     */
    function createAuction(
        string memory _digitalItemURI,
        string memory _digitalItemDescription,
        uint256 _startingPrice,
        uint256 _durationInMinutes
    ) external {
        require(_startingPrice > 0, "Starting price must be greater than 0");
        require(_durationInMinutes > 0, "Duration must be greater than 0");

        uint256 auctionId = auctionCounter++;
        uint256 endTime = block.timestamp + (_durationInMinutes * 1 minutes);

        auctions[auctionId] = Auction({
            id: auctionId,
            seller: payable(msg.sender),
            digitalItemURI: _digitalItemURI,
            digitalItemDescription: _digitalItemDescription,
            startingPrice: _startingPrice,
            highestBid: 0,
            highestBidder: payable(address(0)),
            endTime: endTime,
            ended: false
        });

        emit AuctionCreated(auctionId, msg.sender, _digitalItemURI, _startingPrice, endTime);
    }

    /**
     * @dev Place a bid on an auction
     * @param _auctionId ID of the auction
     */
    function placeBid(uint256 _auctionId) external payable {
        Auction storage auction = auctions[_auctionId];
        
        require(block.timestamp < auction.endTime, "Auction has ended");
        require(!auction.ended, "Auction already finalized");
        require(msg.sender != auction.seller, "Seller cannot bid on their own auction");
        
        uint256 currentBid = msg.value;
        
        if (auction.highestBid == 0) {
            require(currentBid >= auction.startingPrice, "Bid must be at least the starting price");
        } else {
            require(currentBid > auction.highestBid, "Bid must be higher than current highest bid");
            
            // Refund the previous highest bidder
            auction.highestBidder.transfer(auction.highestBid);
        }
        
        auction.highestBid = currentBid;
        auction.highestBidder = payable(msg.sender);
        
        emit BidPlaced(_auctionId, msg.sender, currentBid);
    }

    /**
     * @dev End an auction and transfer funds to the seller
     * @param _auctionId ID of the auction to end
     */
    function endAuction(uint256 _auctionId) external {
        Auction storage auction = auctions[_auctionId];
        
        require(block.timestamp >= auction.endTime, "Auction has not ended yet");
        require(!auction.ended, "Auction already finalized");
        require(msg.sender == auction.seller || msg.sender == auction.highestBidder, "Only seller or highest bidder can end auction");
        
        auction.ended = true;
        
        if (auction.highestBidder != address(0)) {
            // Transfer funds to the seller
            auction.seller.transfer(auction.highestBid);
            emit AuctionEnded(_auctionId, auction.highestBidder, auction.highestBid);
        } else {
            emit AuctionEnded(_auctionId, address(0), 0);
        }
    }

    /*
     * @dev Get the details of an auction
     * @param _auctionId ID of the auction
     * @return Auction details
     */
    function getAuction(uint256 _auctionId) external view returns (
        address seller,
        string memory digitalItemURI,
        string memory digitalItemDescription,
        uint256 startingPrice,
        uint256 highestBid,
        address highestBidder,
        uint256 endTime,
        bool ended
    ) {
        Auction storage auction = auctions[_auctionId];
        return (
            auction.seller,
            auction.digitalItemURI,
            auction.digitalItemDescription,
            auction.startingPrice,
            auction.highestBid,
            auction.highestBidder,
            auction.endTime,
            auction.ended
        );
    }
}
