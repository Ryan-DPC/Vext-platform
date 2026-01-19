import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IFriendship extends Document {
  user_id: mongoose.Types.ObjectId;
  friend_id: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const friendshipSchema = new Schema<IFriendship>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    friend_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

friendshipSchema.index({ user_id: 1, friend_id: 1 }, { unique: true });

export const FriendshipModel: Model<IFriendship> =
  mongoose.models.Friend || mongoose.model<IFriendship>('Friend', friendshipSchema);
