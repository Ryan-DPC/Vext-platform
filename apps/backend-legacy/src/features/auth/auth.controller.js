const AuthService = require('./auth.service');

class AuthController {
    static async register(req, res) {
        try {
            const { user, token } = await AuthService.registerUser({ ...req.body, file: req.file });
            res.status(201).json({ success: true, token, user });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message, code: 'REGISTRATION_FAILED' });
        }
    }

    static async login(req, res) {
        try {
            const { username, password } = req.body;
            const { user, token } = await AuthService.login(username, password);
            res.status(200).json({ success: true, token, user });
        } catch (error) {
            res.status(401).json({ success: false, message: error.message, code: 'AUTH_FAILED' });
        }
    }

    static async logout(req, res) {
        try {
            const result = await AuthService.logout();
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erreur lors de la déconnexion.' });
        }
    }

    static async githubLogin(req, res) {
        try {
            const url = AuthService.getGithubAuthUrl();
            res.redirect(url);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async githubCallback(req, res) {
        try {
            const { code } = req.query;
            if (!code) throw new Error('Code d\'autorisation manquant.');

            const { user, token } = await AuthService.handleGithubCallback(code);

            // Redirect to frontend with token
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            res.redirect(`${frontendUrl}/login?token=${token}`);
        } catch (error) {
            console.error('GitHub Callback Error:', error);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error.message)}`);
        }
    }

    static async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            const result = await AuthService.forgotPassword(email);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async resetPassword(req, res) {
        try {
            const { token, password } = req.body;
            const result = await AuthService.resetPassword(token, password);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = AuthController;
