const { z } = require('zod');

const validate = (schema) => (req, res, next) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation Error',
                details: error.errors.map((e) => ({
                    path: e.path.join('.'),
                    message: e.message,
                })),
            });
        }
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = validate;
