export interface XApiUser {
  id: string;
  name?: string;
  username?: string;
}

export interface XApiPost {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  public_metrics?: Record<string, number>;
}

export interface XRecentSearchResponse {
  data?: XApiPost[];
  includes?: {
    users?: XApiUser[];
  };
  meta?: {
    newest_id?: string;
    oldest_id?: string;
    result_count?: number;
    next_token?: string;
  };
}
