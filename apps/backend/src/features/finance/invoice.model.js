const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Invoice = sequelize.define('Invoice', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    transactionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'transactions',
            key: 'id'
        }
    },
    invoiceNumber: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'CHF'
    },
    billingDetails: {
        type: DataTypes.JSON, // { name, address, taxId, etc. }
        allowNull: true
    },
    pdfUrl: {
        type: DataTypes.STRING,
        allowNull: true // URL to stored PDF (could be on Cloudinary/S3)
    },
    issuedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'invoices',
    timestamps: true
});

module.exports = Invoice;
