export type PageRole = "owner" | "manager";

export type ActionState = {
  error?: string;
  success?: string;
  code?: string;
} | null;

export type Viewer = {
  id: string;
  email: string | null;
  username: string | null;
  isSuperadmin: boolean;
};

export type CreatorPage = {
  id: string;
  slug: string;
  display_name: string;
  bio: string | null;
  cover_image: string | null;
  paypal_link: string | null;
  created_at: string;
};

export type WishlistCategory = {
  id: string;
  page_id: string;
  name: string;
  created_at: string;
};

export type Goal = {
  id: string;
  page_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  link: string | null;
  image_url: string | null;
  image_storage_path: string | null;
  image_width: number | null;
  image_height: number | null;
  target_amount: number | string;
  current_amount_raised: number | string;
  created_at: string;
};

export type CoverImage = {
  id: string;
  url: string;
  storage_path: string | null;
  width: number | null;
  height: number | null;
};

export type PostImage = {
  url: string;
  width: number | null;
  height: number | null;
};

export type CommentAuthor = {
  id: string;
  username: string;
  tiktok: string | null;
  facebook: string | null;
  x: string | null;
  instagram: string | null;
};

export type PostComment = {
  id: string;
  body: string;
  created_at: string;
  author: CommentAuthor;
  replies: {
    id: string;
    body: string;
    created_at: string;
    author: CommentAuthor;
  }[];
};

export type CommentAccess = {
  signedIn: boolean;
  following: boolean;
  member: boolean;
  viewerId: string | null;
};

export type SocialProfiles = {
  tiktok: string | null;
  facebook: string | null;
  x: string | null;
  instagram: string | null;
};

export type PostGoal = {
  id: string;
  title: string;
  link: string | null;
  image: PostImage | null;
  target_amount: number | string;
  current_amount_raised: number | string;
};

export type FeedPost = {
  id: string;
  page_id: string;
  content: string | null;
  image_url: string | null;
  images: PostImage[];
  goals: PostGoal[];
  comments: PostComment[];
  is_paywalled: boolean;
  is_locked: boolean;
  created_at: string;
};

export type ManagedPost = {
  id: string;
  page_id: string;
  content: string | null;
  image_url: string | null;
  images: PostImage[];
  goals: { id: string; title: string }[];
  is_paywalled: boolean;
  created_at: string;
};

export type AccessCode = {
  id: string;
  page_id: string;
  code_string: string;
  duration_days: number;
  is_redeemed: boolean;
  redeemed_by_user: string | null;
  created_at: string;
};

export type Membership = {
  role: PageRole;
  page: CreatorPage;
};
