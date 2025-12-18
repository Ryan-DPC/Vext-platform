const FinanceService = require('./finance.service');

class FinanceController {
    static async getHistory(req, res) {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const { count, rows } = await FinanceService.getTransactionHistory(userId, page, limit);

        res.json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    }

    static async deposit(req, res) {
        const userId = req.user.id;
        const { amount, currency, method } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        const transaction = await FinanceService.deposit(userId, amount, currency || 'CHF', method);
        res.json({ success: true, message: 'Deposit successful', transaction });
    }

    static async withdraw(req, res) {
        const userId = req.user.id;
        const { amount, currency, method } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        try {
            const transaction = await FinanceService.withdraw(userId, amount, currency || 'CHF', method);
            res.json({ success: true, message: 'Withdrawal successful', transaction });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = FinanceController;
