
import { t, Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { Users } from '@vext/database';
import { JWT_SECRET } from '../../config/jwt';
import crypto from 'crypto';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

// In-memory reset token store (use Redis in a real production setup)
const resetTokens = new Map<string, { userId: string; expires: number }>();

export const authRoutes = new Elysia({ prefix: '/api/auth' })
    .use(jwt({
        name: 'jwt',
        secret: JWT_SECRET
    }))
    .post('/register', async ({ body, jwt, set }) => {
        const { username, email, password, tag } = body as any;

        if (!tag || !/^[a-zA-Z0-9]{3,4}$/.test(tag)) {
            set.status = 400;
            return { success: false, message: 'Tag must be 3-4 alphanumeric characters.' };
        }

        const fullUsername = `${username}#${tag}`;

        const [existingUser, existingEmail] = await Promise.all([
            Users.getUserByUsername(fullUsername),
            Users.getUserByEmail(email)
        ]);

        if (existingUser) {
            set.status = 409;
            return { success: false, message: 'Username with this tag is already taken.' };
        }
        if (existingEmail) {
            set.status = 409;
            return { success: false, message: 'Email is already used.' };
        }

        const defaultAvatars = ['avatar_blue.svg', 'avatar_green.svg', 'avatar_red.svg'];
        const randomAvatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
        const backendUrl = process.env.BACKEND_URL;
        const profile_pic = `${backendUrl}/public/avatars/${randomAvatar}`;

        const hashedPassword = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 10 });
        const newUser = await Users.createUser({ username: fullUsername, email, password: hashedPassword, profile_pic });

        const token = await jwt.sign({
            id: newUser.id,
            username: newUser.username,
            isAdmin: false
        });

        return {
            success: true,
            token,
            user: newUser
        };
    }, {
        body: t.Object({
            username: t.String(),
            email: t.String(),
            password: t.String(),
            tag: t.String()
        })
    })
    .post('/login', async ({ body, jwt, set }) => {
        const { username: identifier, password } = body as any;

        let user: any;
        if (identifier.includes('@')) {
            user = await Users.getUserByEmail(identifier);
        } else {
            if (identifier.includes('#')) {
                user = await Users.getUserByUsername(identifier);
            } else {
                user = await Users.getUserByBaseUsername(identifier);
            }
        }

        if (!user) {
            set.status = 401;
            return { success: false, message: 'User not found.' };
        }

        if (!user.password) {
            set.status = 400;
            return { success: false, message: 'Account has no password (social login?).' };
        }

        const isPasswordValid = await Bun.password.verify(password, user.password);
        if (!isPasswordValid) {
            set.status = 401;
            return { success: false, message: 'Invalid password.' };
        }

        const token = await jwt.sign({
            id: user.id,
            username: user.username,
            isAdmin: user.isAdmin
        });

        return {
            success: true,
            token,
            user
        };
    }, {
        body: t.Object({
            username: t.String(),
            password: t.String()
        })
    })
    .post('/forgot-password', async ({ body, set }) => {
        const { email } = body as any;

        // Always return success to prevent email enumeration
        const user = await Users.getUserByEmail(email);
        if (!user) {
            return { success: true, message: 'If an account exists, a reset link has been sent.' };
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expires = Date.now() + 3600000; // 1 hour
        resetTokens.set(resetToken, { userId: user.id, expires });

        // In production, send this via email (e.g. Resend, SendGrid, Nodemailer)
        const resetUrl = `${FRONTEND_URL}/#/reset-password?token=${resetToken}`;
        console.log(`[Auth] Password reset link for ${email}: ${resetUrl}`);

        return { success: true, message: 'If an account exists, a reset link has been sent.' };
    }, {
        body: t.Object({
            email: t.String()
        })
    })
    .post('/reset-password', async ({ body, set }) => {
        const { token, password } = body as any;

        const tokenData = resetTokens.get(token);
        if (!tokenData || tokenData.expires < Date.now()) {
            resetTokens.delete(token);
            set.status = 400;
            return { success: false, message: 'Invalid or expired reset token.' };
        }

        const hashedPassword = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 10 });
        await Users.updateUser(tokenData.userId, { password: hashedPassword });
        resetTokens.delete(token);

        return { success: true, message: 'Password reset successfully.' };
    }, {
        body: t.Object({
            token: t.String(),
            password: t.String()
        })
    })
    .post('/change-password', async ({ body, jwt: jwtPlugin, headers, set }) => {
        const auth = headers['authorization'];
        if (!auth?.startsWith('Bearer ')) {
            set.status = 401;
            return { success: false, message: 'Authentication required.' };
        }
        const payload = await jwtPlugin.verify(auth.slice(7)) as any;
        if (!payload) {
            set.status = 401;
            return { success: false, message: 'Invalid token.' };
        }

        const { currentPassword, newPassword } = body as any;
        const user = await Users.getUserById(payload.id);
        if (!user || !user.password) {
            set.status = 400;
            return { success: false, message: 'Cannot change password for this account.' };
        }

        const isValid = await Bun.password.verify(currentPassword, user.password);
        if (!isValid) {
            set.status = 401;
            return { success: false, message: 'Current password is incorrect.' };
        }

        const hashedPassword = await Bun.password.hash(newPassword, { algorithm: 'bcrypt', cost: 10 });
        await Users.updateUser(payload.id, { password: hashedPassword });

        return { success: true, message: 'Password changed successfully.' };
    }, {
        body: t.Object({
            currentPassword: t.String(),
            newPassword: t.String()
        })
    })
    .get('/github', ({ set }) => {
        if (!GITHUB_CLIENT_ID) {
            set.status = 503;
            return { success: false, message: 'GitHub OAuth is not configured.' };
        }
        const redirectUri = `${process.env.BACKEND_URL || 'https://vext-backend.onrender.com'}/api/auth/github/callback`;
        const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
        set.redirect = url;
    })
    .get('/github/callback', async ({ query, jwt: jwtPlugin, set }) => {
        const { code } = query as any;

        if (!code || !GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
            set.status = 400;
            return { success: false, message: 'GitHub OAuth not configured or missing code.' };
        }

        try {
            // Exchange code for access token
            const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    client_id: GITHUB_CLIENT_ID,
                    client_secret: GITHUB_CLIENT_SECRET,
                    code
                })
            });
            const tokenData = await tokenResponse.json() as any;

            if (!tokenData.access_token) {
                set.status = 400;
                return { success: false, message: 'Failed to get GitHub access token.' };
            }

            // Get user info
            const userResponse = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            const githubUser = await userResponse.json() as any;

            // Get primary email
            const emailsResponse = await fetch('https://api.github.com/user/emails', {
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            const emails = await emailsResponse.json() as any[];
            const primaryEmail = emails.find((e: any) => e.primary)?.email || githubUser.email;

            if (!primaryEmail) {
                set.status = 400;
                return { success: false, message: 'Could not retrieve email from GitHub.' };
            }

            // Find or create user
            let user = await Users.getUserByGithubId(String(githubUser.id));

            if (!user) {
                // Check if email already used
                user = await Users.getUserByEmail(primaryEmail);
                if (user) {
                    // Link GitHub to existing account
                    await Users.updateUser(user.id, {
                        github_id: String(githubUser.id),
                        github_username: githubUser.login
                    });
                } else {
                    // Create new user
                    const tag = Math.random().toString(36).substring(2, 6).toUpperCase();
                    user = await Users.createUser({
                        username: `${githubUser.login}#${tag}`,
                        email: primaryEmail,
                        password: null,
                        profile_pic: githubUser.avatar_url,
                        github_id: String(githubUser.id),
                        github_username: githubUser.login
                    });
                }
            }

            const jwtToken = await jwtPlugin.sign({
                id: user.id,
                username: user.username,
                isAdmin: user.isAdmin || false
            });

            // Redirect to frontend with token
            set.redirect = `${FRONTEND_URL}/#/login?token=${jwtToken}&github=true`;
        } catch (error: any) {
            console.error('GitHub OAuth error:', error);
            set.status = 500;
            return { success: false, message: 'GitHub authentication failed.' };
        }
    });
