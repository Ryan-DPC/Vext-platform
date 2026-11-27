import { allow, clientIp } from '../../utils/rateLimit';
import { t, Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { JWT_SECRET } from '../../config/jwt';
import { Users, UserModel } from '@vext/database';
import { issueVerificationCode, verifySubmittedCode } from '../../services/mailer.service';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
    .use(jwt({
        name: 'jwt',
        secret: JWT_SECRET
    }))
    .post('/register', async ({ body, set, headers }) => {
        if (!allow(`register:${clientIp(headers)}`, 10, 60 * 60_000)) {
            set.status = 429;
            return { success: false, message: 'Trop de tentatives. Réessayez plus tard.' };
        }
        const { username, email, password, tag } = body as any;

        if (!tag || !/^[a-zA-Z0-9]{3,4}$/.test(tag)) {
            set.status = 400;
            return { success: false, message: 'Le tag doit comporter entre 3 et 4 caractères alphanumériques.' };
        }

        const fullUsername = `${username}#${tag}`;
        const cleanEmail = email.toLowerCase().trim();

        // Parallel checks
        const [existingUser, existingEmail] = await Promise.all([
            Users.getUserByUsername(fullUsername),
            Users.getUserByEmail(cleanEmail)
        ]);

        if (existingUser) {
            set.status = 409;
            return { success: false, message: 'Ce nom d\'utilisateur avec ce tag est déjà pris.' };
        }
        if (existingEmail) {
            set.status = 409;
            return { success: false, message: 'Cette adresse e-mail est déjà utilisée.' };
        }

        // Random avatar logic
        const defaultAvatars = ['avatar_blue.svg', 'avatar_green.svg', 'avatar_red.svg'];
        const randomAvatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
        const backendUrl = process.env.BACKEND_URL || 'https://hoopslive.ch/vext/storage/avatars';
        const profile_pic = `${backendUrl}/${randomAvatar}`;

        const hashedPassword = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 10 });
        const newUser = await Users.createUser({
            username: fullUsername,
            email: cleanEmail,
            password: hashedPassword,
            profile_pic,
            is_verified: false
        } as any);

        // Envoyer le code à 6 chiffres par email via Infomaniak SMTP
        try {
            await issueVerificationCode(newUser.id, cleanEmail, fullUsername, 'email_verify');
        } catch (err) {
            console.error('[VEXT Auth] Erreur lors de l\'envoi de l\'email de vérification:', err);
        }

        return {
            success: true,
            requiresVerification: true,
            email: cleanEmail,
            message: 'Compte créé avec succès ! Un code de vérification à 6 chiffres a été envoyé à votre adresse e-mail.'
        };
    }, {
        body: t.Object({
            username: t.String(),
            email: t.String(),
            password: t.String(),
            tag: t.String()
        })
    })
    .post('/login', async ({ body, jwt, set, headers }) => {
        const { username: identifier, password } = body as any;
        if (!allow(`login:${clientIp(headers)}:${String(identifier).toLowerCase()}`, 10, 15 * 60_000)) {
            set.status = 429;
            return { success: false, message: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.' };
        }

        let user: any;
        if (identifier.includes('@')) {
            user = await Users.getUserByEmail(identifier.toLowerCase().trim());
        } else {
            if (identifier.includes('#')) {
                user = await Users.getUserByUsername(identifier);
            } else {
                user = await Users.getUserByBaseUsername(identifier);
            }
        }

        if (!user) {
            set.status = 401;
            return { success: false, message: 'Utilisateur introuvable.' };
        }

        if (!user.password) {
            set.status = 400;
            return { success: false, message: 'Ce compte n\'a pas de mot de passe défini.' };
        }

        const isPasswordValid = await Bun.password.verify(password, user.password);
        if (!isPasswordValid) {
            set.status = 401;
            return { success: false, message: 'Mot de passe incorrect.' };
        }

        // Vérification de l'email : Si le compte n'a pas encore validé son e-mail
        if (user.is_verified === false) {
            try {
                await issueVerificationCode(user.id, user.email, user.username, 'email_verify');
            } catch (err) {
                console.error('[VEXT Auth] Erreur renvoi code vérification:', err);
            }

            set.status = 403;
            return {
                success: false,
                requiresVerification: true,
                email: user.email,
                message: 'Veuillez vérifier votre adresse e-mail. Un nouveau code à 6 chiffres vous a été envoyé.'
            };
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
    .post('/verify-code', async ({ body, jwt, set, headers }) => {
        const { email, code, purpose } = body as any;
        if (!allow(`verify:${clientIp(headers)}:${String(email).toLowerCase()}`, 10, 15 * 60_000)) {
            set.status = 429;
            return { success: false, message: 'Trop de tentatives. Réessayez dans quelques minutes.' };
        }

        if (!email || !code || String(code).length !== 6) {
            set.status = 400;
            return { success: false, message: 'Veuillez fournir une adresse e-mail et un code valide à 6 chiffres.' };
        }

        const result = await verifySubmittedCode(email, code, purpose || 'email_verify');
        if (!result.success) {
            set.status = 400;
            return { success: false, message: result.message };
        }

        // Valider l'utilisateur en base
        await UserModel.updateOne({ _id: result.userId }, { $set: { is_verified: true } });
        const user = await UserModel.findById(result.userId).lean();

        if (!user) {
            set.status = 404;
            return { success: false, message: 'Utilisateur introuvable.' };
        }

        const token = await jwt.sign({
            id: (user as any)._id.toString(),
            username: user.username,
            isAdmin: user.isAdmin
        });

        return {
            success: true,
            message: 'Votre adresse e-mail a été vérifiée avec succès !',
            token,
            user: { ...user, id: (user as any)._id.toString() }
        };
    }, {
        body: t.Object({
            email: t.String(),
            code: t.String(),
            purpose: t.Optional(t.String())
        })
    })
    .post('/resend-code', async ({ body, set, headers }) => {
        if (!allow(`resend:${clientIp(headers)}`, 5, 15 * 60_000)) {
            set.status = 429;
            return { success: false, message: 'Trop de demandes. Réessayez plus tard.' };
        }
        const { email, purpose } = body as any;

        if (!email) {
            set.status = 400;
            return { success: false, message: 'Adresse e-mail requise.' };
        }

        const user = await Users.getUserByEmail(email.toLowerCase().trim());
        if (!user) {
            set.status = 404;
            return { success: false, message: 'Aucun compte associé à cette adresse e-mail.' };
        }

        try {
            await issueVerificationCode(user.id, user.email, user.username, (purpose as any) || 'email_verify');
            return {
                success: true,
                message: 'Un nouveau code de vérification à 6 chiffres vous a été envoyé par e-mail.'
            };
        } catch (err: any) {
            set.status = 500;
            return { success: false, message: 'Erreur lors de l\'envoi de l\'e-mail: ' + err.message };
        }
    }, {
        body: t.Object({
            email: t.String(),
            purpose: t.Optional(t.String())
        })
    });
