const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
    const start = Date.now();
    const { method, originalUrl, ip } = req;

    logger.info(`Incoming Request: ${method} ${originalUrl} from ${ip}`);

    res.on('finish', () => {
        const duration = Date.now() - start;
        const { statusCode } = res;
        
        if (statusCode >= 400) {
            logger.error(`Request Failed: ${method} ${originalUrl} ${statusCode} ${duration}ms`);
        } else {
            logger.info(`Request Completed: ${method} ${originalUrl} ${statusCode} ${duration}ms`);
        }
    });

    next();
};

module.exports = requestLogger;
