import 'dotenv/config';

const secret = process.env.JWT_SECRET;

if (!secret || secret.length < 32 || secret === 'default_secret') {
    throw new Error(
        'JWT_SECRET est absent ou trop faible (32 caractères minimum). Définissez-le dans l\'environnement avant de démarrer.'
    );
}

export const JWT_SECRET: string = secret;
