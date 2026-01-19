import { t, Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { Users } from '@vext/database';

// Helper to generate a token
// Note: We'll access the `jwt` plugin instance from the handler context
export const authRoutes: any = new Elysia({ prefix: '/api/auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'default_secret',
    })
  )
  .post(
    '/register',
    async ({ body, jwt, set }) => {
      const { username, email, password, tag } = body as any;

      if (!tag || !/^[a-zA-Z0-9]{3,4}$/.test(tag)) {
        set.status = 400;
        return { success: false, message: 'Tag must be 3-4 alphanumeric characters.' };
      }

      const fullUsername = `${username}#${tag}`;

      // Parallel checks
      const [existingUser, existingEmail] = await Promise.all([
        Users.getUserByUsername(fullUsername),
        Users.getUserByEmail(email),
      ]);

      if (existingUser) {
        if (existingUser.isVerified) {
          set.status = 409;
          return { success: false, message: 'Username with this tag is already taken.' };
        } else {
          // Cleanup unverified account to allow re-registration
          await Users.deleteUser(existingUser.id);
        }
      }

      if (existingEmail) {
        if (existingEmail.isVerified) {
          set.status = 409;
          return { success: false, message: 'Email is already used.' };
        } else {
          // Cleanup unverified account to allow re-registration (if different from above)
          // Check if we didn't already delete it by ID (in case username and email belonged to same doc)
          // But since deleteUser is by ID, it's safe to call again or check ID match.
          // However, if we deleted `existingUser`, and `existingEmail` refers to the same doc, `deleteUser` will just return false (0 deleted).
          // If they are different docs (unlikely if username unique), we delete both.
          if (!existingUser || existingUser.id !== existingEmail.id) {
            await Users.deleteUser(existingEmail.id);
          }
        }
      }

      // Random avatar logic
      const defaultAvatars = ['avatar_blue.svg', 'avatar_green.svg', 'avatar_red.svg'];
      const randomAvatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
      // Hardcoding backend URL for now or use env
      const backendUrl = process.env.BACKEND_URL;
      const profile_pic = `${backendUrl}/public/avatars/${randomAvatar}`;

      const hashedPassword = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 10 });
      const newUser = await Users.createUser({
        username: fullUsername,
        email,
        password: hashedPassword,
        profile_pic,
      });

      const token = await jwt.sign({
        id: newUser.id,
        username: newUser.username,
        isAdmin: newUser.isAdmin,
      });

      return {
        success: true,
        token,
        user: newUser,
      };
    },
    {
      body: t.Object({
        username: t.String(),
        email: t.String(),
        password: t.String(),
        tag: t.String(),
      }),
    }
  )
  .post(
    '/login',
    async ({ body, jwt, set }) => {
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
        isAdmin: user.isAdmin,
      });

      return {
        success: true,
        token,
        user,
      };
    },
    {
      body: t.Object({
        username: t.String(), // can be email or username
        password: t.String(),
      }),
    }
  )
  .post(
    '/verify-code',
    async ({ body, jwt, set }) => {
      const { email, code } = body as any;

      const isValid = await Users.verifyCode(email, code);
      if (!isValid) {
        set.status = 400;
        return { success: false, message: 'Code invalide ou expiré.' };
      }

      // Get user and generate token for auto-login
      const user = await Users.getUserByEmail(email);
      if (!user) {
        set.status = 404;
        return { success: false, message: 'Utilisateur non trouvé.' };
      }

      const token = await jwt.sign({
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      });

      return {
        success: true,
        token,
        user,
      };
    },
    {
      body: t.Object({
        email: t.String(),
        code: t.String(),
      }),
    }
  );
