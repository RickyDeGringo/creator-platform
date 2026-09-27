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

export type Goal = {
  id: string;
  page_id: string;
  title: string;
  description: string | null;
  target_amount: number | string;
  current_amount_raised: number | string;
  created_at: string;
};

export type FeedPost = {
  id: string;
  page_id: string;
  content: string | null;
  image_url: string | null;
  is_paywalled: boolean;
  is_locked: boolean;
  created_at: string;
};

export type ManagedPost = {
  id: string;
  page_id: string;
  content: string | null;
  image_url: string | null;
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
