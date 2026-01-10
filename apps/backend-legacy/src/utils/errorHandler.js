const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const code = err.code || 'INTERNAL_ERROR';

    res.status(statusCode).json({
        success: false,
        message: message,
        code: code
    });
};

module.exports = errorHandler;
