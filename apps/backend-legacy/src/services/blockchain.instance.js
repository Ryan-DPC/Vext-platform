const { Blockchain } = require('./blockchain.service');

// Create a singleton instance of the blockchain
const etherBlockchain = new Blockchain();

module.exports = etherBlockchain;
