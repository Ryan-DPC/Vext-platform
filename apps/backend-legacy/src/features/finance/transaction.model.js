const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Transaction = sequelize.define('Transaction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.STRING, // Linked to MongoDB User._id (string representation)
        allowNull: false,
        comment: 'MongoDB User ID'
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    currency: {
        type: DataTypes.ENUM('CHF', 'EUR', 'USD', 'GBP'),
        defaultValue: 'CHF'
    },
    type: {
        type: DataTypes.ENUM('DEPOSIT', 'WITHDRAWAL', 'PURCHASE', 'REFUND', 'TRANSFER'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'),
        defaultValue: 'PENDING'
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    referenceId: {
        type: DataTypes.STRING, // External payment gateway ID (Stripe, PayPal, etc.)
        allowNull: true
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    tableName: 'transactions',
    timestamps: true,
    indexes: [
        {
            fields: ['userId']
        },
        {
            fields: ['status']
        },
        {
            fields: ['type']
        }
    ]
});

module.exports = Transaction;
