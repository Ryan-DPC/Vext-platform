import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IEmailVerificationCode extends Document {
    userId: mongoose.Types.ObjectId;
    email: string;
    purpose: 'email_verify' | 'password_reset' | 'email_change';
    codeHash: string;
    expiresAt: Date;
    attempts: number;
    maxAttempts: number;
    consumedAt?: Date | null;
    createdAt: Date;
}

const emailVerificationCodeSchema = new Schema<IEmailVerificationCode>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        email: { type: String, required: true, lowercase: true, trim: true, index: true },
        purpose: {
            type: String,
            enum: ['email_verify', 'password_reset', 'email_change'],
            default: 'email_verify',
            index: true
        },
        codeHash: { type: String, required: true },
        expiresAt: { type: Date, required: true, index: { expires: 0 } },
        attempts: { type: Number, default: 0 },
        maxAttempts: { type: Number, default: 5 },
        consumedAt: { type: Date, default: null }
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export const EmailVerificationCodeModel: Model<IEmailVerificationCode> =
    mongoose.models.EmailVerificationCode || mongoose.model<IEmailVerificationCode>('EmailVerificationCode', emailVerificationCodeSchema);
