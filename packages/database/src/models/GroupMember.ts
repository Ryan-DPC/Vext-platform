import mongoose from 'mongoose';
import { IGroup } from './Group';

// GroupMember in the current schema is just a User ObjectId in the 'members' array of a Group.
// However, to satisfy the export verify structure, we provide a type definition.
// If future schema evolution adds roles (admin, moderator), this file will expand.

export interface IGroupMember {
  group_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  joined_at?: Date; // Placeholder for future expansion
}

// Since members are currently just IDs in Group, there is no separate collection/model.
// We export a helper object or just the interface.

export const GroupMemberHelpers = {
  isMember: (group: IGroup, userId: string): boolean => {
    return group.members.some((m) => m.toString() === userId);
  },
};
