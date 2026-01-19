import { IFriendship, FriendshipModel } from './Friendship';

// FriendRequest is conceptually a Friendship with status 'pending'
// We export an alias to FriendshipModel to satisfy the user request for a "FriendRequest" model
// and provide specific interfaces if needed.

export type IFriendRequest = IFriendship & { status: 'pending' };

// Alias the model for clarity in imports
export const FriendRequestModel = FriendshipModel;

// Helper to find pending requests
export const FriendRequestHelpers = {
  findPendingRequests: async (userId: string) => {
    return FriendshipModel.find({
      $or: [{ user_id: userId }, { friend_id: userId }],
      status: 'pending',
    });
  },
};
