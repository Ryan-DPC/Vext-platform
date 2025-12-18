const crypto = require('crypto');

class Block {
    constructor(timestamp, transactions, previousHash = '') {
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.nonce = 0;
        this.hash = this.calculateHash();
    }

    calculateHash() {
        return crypto
            .createHash('sha256')
            .update(
                this.previousHash +
                this.timestamp +
                JSON.stringify(this.transactions) +
                this.nonce
            )
            .digest('hex');
    }

    mineBlock(difficulty) {
        const target = Array(difficulty + 1).join('0');

        while (this.hash.substring(0, difficulty) !== target) {
            this.nonce++;
            this.hash = this.calculateHash();
        }

        console.log(`Block mined: ${this.hash}`);
    }
}

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 1;
        this.pendingTransactions = [];
        this.miningReward = 100; // Tokens de récompense pour le minage
    }

    createGenesisBlock() {
        return new Block(Date.now(), [], '0');
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    minePendingTransactions(miningRewardAddress) {
        const rewardTransaction = new Transaction(
            null,
            miningRewardAddress,
            this.miningReward,
            'mining_reward'
        );
        this.pendingTransactions.push(rewardTransaction);

        const block = new Block(
            Date.now(),
            this.pendingTransactions,
            this.getLatestBlock().hash
        );

        block.mineBlock(this.difficulty);

        this.chain.push(block);
        this.pendingTransactions = [];
    }

    createTransaction(transaction) {
        if (!transaction.fromAddress || !transaction.toAddress) {
            throw new Error('Transaction must include from and to address');
        }

        if (!transaction.isValid()) {
            throw new Error('Cannot add invalid transaction to chain');
        }

        this.pendingTransactions.push(transaction);
    }

    getBalanceOfAddress(address) {
        let balance = 0;

        for (const block of this.chain) {
            for (const trans of block.transactions) {
                if (trans.fromAddress === address) {
                    balance -= trans.amount;
                }
                if (trans.toAddress === address) {
                    balance += trans.amount;
                }
            }
        }

        return balance;
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }

        return true;
    }
}

class Transaction {
    constructor(fromAddress, toAddress, amount, type = 'transfer', gameId = null) {
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
        this.type = type; // 'transfer', 'game_purchase', 'game_sale', 'commission', 'mining_reward'
        this.gameId = gameId;
        this.timestamp = Date.now();
        this.transactionId = this.generateTransactionId();
    }

    generateTransactionId() {
        return crypto
            .createHash('sha256')
            .update(
                this.fromAddress +
                this.toAddress +
                this.amount +
                this.timestamp +
                Math.random()
            )
            .digest('hex');
    }

    isValid() {
        // Les récompenses de minage peuvent avoir fromAddress = null
        if (this.type === 'mining_reward') {
            return this.amount > 0 && this.toAddress;
        }
        // Pour les autres transactions, fromAddress et toAddress sont requis
        return this.amount > 0 && this.fromAddress && this.toAddress;
    }
}

module.exports = { Blockchain, Block, Transaction };
