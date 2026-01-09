const { sequelize } = require('../../config/database');
const Transaction = require('./transaction.model');
const Invoice = require('./invoice.model');
const Models = require('../users/user.model');
const Users = Models.default || Models; // MongoDB User Model to sync balance
const { v4: uuidv4 } = require('uuid');

class FinanceService {
    /**
     * Get user transactions history
     */
    static async getTransactionHistory(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        return await Transaction.findAndCountAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });
    }

    /**
     * Process a Deposit
     * @param {string} userId - MongoDB User ID
     * @param {number} amount - Amount to deposit (positive)
     * @param {string} currency - 'CHF', 'EUR', etc.
     * @param {string} method - 'STRIPE', 'PAYPAL' (Payment Method)
     */
    static async deposit(userId, amount, currency, method = 'CREDIT_CARD') {
        const t = await sequelize.transaction();

        try {
            // 1. Create Transaction Record in Postgres
            const transaction = await Transaction.create({
                userId,
                amount,
                currency,
                type: 'DEPOSIT',
                status: 'COMPLETED', // Auto-complete for now (mock)
                description: `Deposit via ${method}`,
                referenceId: uuidv4(), // Mock payment gateway ID
                metadata: { method }
            }, { transaction: t });

            // 2. Create Invoice Record
            await Invoice.create({
                userId,
                transactionId: transaction.id,
                invoiceNumber: `INV-${Date.now()}`,
                amount,
                currency,
                billingDetails: { method }
            }, { transaction: t });

            // 3. Update User Balance in MongoDB (Source of Truth for Frontend)
            // We do this *outside* the SQL transaction, or if it fails we roll back SQL.
            // But since Mongo doesn't share the transaction, we do it last.
            await Users.incrementBalance(userId, currency, amount);

            await t.commit();
            return transaction;

        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Process a Withdrawal
     */
    static async withdraw(userId, amount, currency, method = 'BANK_TRANSFER') {
        const t = await sequelize.transaction();

        try {
            // 2. Atomic Deduct Balance in MongoDB (Check & Deduct)
            // We do this BEFORE the SQL transaction to ensure funds exist and are locked.
            // If SQL fails, we must refund (Compensating Transaction).
            const hasFunds = await Users.decrementBalanceIfSufficient(userId, currency, amount);

            if (!hasFunds) {
                // Rollback not needed as we haven't done anything yet
                // But we need to ensure we don't proceed
                await t.rollback(); // Close unused transaction
                throw new Error('Insufficient funds');
            }

            try {
                // 3. Create Transaction Record
                const transaction = await Transaction.create({
                    userId,
                    amount: -amount,
                    currency,
                    type: 'WITHDRAWAL',
                    status: 'COMPLETED',
                    description: `Withdrawal to ${method}`,
                    metadata: { method }
                }, { transaction: t });

                // 4. Create Invoice
                await Invoice.create({
                    userId,
                    transactionId: transaction.id,
                    invoiceNumber: `INV-${Date.now()}`,
                    amount: amount,
                    currency
                }, { transaction: t });

                await t.commit();
                return transaction;

            } catch (sqlError) {
                // If SQL fails, Refund the User
                await Users.incrementBalance(userId, currency, amount);
                await t.rollback();
                throw sqlError;
            }

        } catch (error) {
            // This catch block handles errors from the initial setup or the try/catch above
            // If t is not finished, rollback
            if (!t.finished) {
                await t.rollback();
            }
            throw error;
        }
    }
}

module.exports = FinanceService;
