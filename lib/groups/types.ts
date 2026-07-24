export type GroupPrivacy = "public" | "private";
export type GroupRole = "owner" | "admin" | "moderator" | "member";
export type MembershipStatus = "active" | "pending" | "rejected" | "banned";
export type GroupListMode = "discover" | "mine" | "pending";
export type GroupSort = "newest" | "members" | "active";

export type ProfileSummary = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  city_name?: string | null;
  country_name?: string | null;
};

export type MembershipSummary = {
  id: string;
  role: GroupRole;
  status: MembershipStatus;
};

export type Group = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sport: string;
  city: string | null;
  country: string;
  privacy: GroupPrivacy;
  cover_image_url: string | null;
  avatar_url: string | null;
  owner_id: string;
  member_count: number;
  post_count: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  owner?: ProfileSummary | null;
  viewer_membership?: MembershipSummary | null;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupRole;
  status: MembershipStatus;
  joined_at: string;
  updated_at: string;
  profile: ProfileSummary | null;
  sports: string[];
};

export type GroupComment = {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  content: string;
  like_count: number;
  created_at: string;
  updated_at: string;
  author: ProfileSummary | null;
  viewer_has_liked: boolean;
  replies?: GroupComment[];
};

export type GroupPost = {
  id: string;
  group_id: string;
  author_id: string;
  content: string;
  image_url: string | null;
  comment_count: number;
  like_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author: ProfileSummary | null;
  author_role: GroupRole | null;
  viewer_has_liked: boolean;
};

export type PaginatedResponse<T> = {
  items: T[];
  nextCursor: string | null;
};

export type GroupFilters = {
  mode: GroupListMode;
  search: string;
  sport: string;
  city: string;
  country: string;
  privacy: "all" | GroupPrivacy;
  sort: GroupSort;
};

export type CreateGroupInput = {
  name: string;
  description: string;
  sport: string;
  city: string;
  country: string;
  privacy: GroupPrivacy;
  avatarUrl: string | null;
  coverImageUrl: string | null;
};
