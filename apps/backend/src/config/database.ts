import { Sequelize, Options } from 'sequelize';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const sequelizeOptions: Options = {
    host: process.env.POSTGRES_HOST || 'localhost', // Fallback if no URL
    dialect: 'postgres',
    logging: false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
};

let sequelize: Sequelize;

// Support for connection string (Render standard or user custom)
const connectionString = process.env.PostgreSQL_URL || process.env.DATABASE_URL;

if (connectionString) {
    sequelize = new Sequelize(connectionString, sequelizeOptions);
} else {
    sequelize = new Sequelize(
        process.env.POSTGRES_DB || 'ether_finance',
        process.env.POSTGRES_USER || 'postgres',
        process.env.POSTGRES_PASSWORD || 'postgres',
        sequelizeOptions
    );
}

const connectDatabase = async (): Promise<Sequelize | undefined> => {
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL Connection established successfully.');
        return sequelize;
    } catch (error) {
        console.error('❌ Unable to connect to PostgreSQL:', error);
        console.error('DEBUG Info:', {
            host: process.env.POSTGRES_HOST || 'localhost',
            port: process.env.POSTGRES_PORT || 5432,
            user: process.env.POSTGRES_USER || 'postgres',
            db: process.env.POSTGRES_DB || 'ether_finance'
        });
    }
};

export { sequelize, connectDatabase };
