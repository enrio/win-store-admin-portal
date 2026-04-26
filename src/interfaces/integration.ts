export interface IMarketplaceConnection {
  connection_id: string;
  store_id: string;
  marketplace: string;
  grant_subject_type: string | null;
  external_shop_id: string | null;
  main_account_id: string | null;
  authorized_shop_ids: string[] | null;
  authorized_merchant_ids: string[] | null;
  status: "connected" | "expired" | "disconnected" | "error";
  shop_name: string | null;
  expires_in: number | null;
  refresh_expires_in: number | null;
  created_at: string;
  updated_at: string;
  last_refresh_attempt_at: string | null;
  refresh_failed_count: number;
}

export interface IShopeeAuthLinkResponse {
  success: boolean;
  data?: {
    marketplace: string;
    auth_url: string;
    state: string;
    store_id: string;
    store_slug: string;
  };
  error?: any;
}

export interface IShopeeExchangeCodePayload {
  code: string;
  shopId?: string | number;
  mainAccountId?: string | number;
  shopName?: string;
  state?: string;
}

export interface IShopeeExchangeCodeResponse {
  success: boolean;
  data?: {
    connection_id: string;
    store_id: string;
    marketplace: string;
    grant_subject_type: "shop" | "main_account";
    external_shop_id: string | null;
    main_account_id: string | null;
    authorized_shop_ids: string[] | null;
    authorized_merchant_ids: string[] | null;
    next_action: string;
    status: string;
    expires_in: number;
    refresh_expires_in: number;
  };
  error?: any;
}

export interface IShopeeTokenManagerPayload {
  shopId?: string | number;
  mainAccountId?: string | number;
  operation: "get" | "refresh";
}

export interface IShopeeTokenManagerResponse {
  success: boolean;
  data?: {
    refreshed: boolean;
    store_id: string;
    shop_id: string | null;
    main_account_id: string | null;
    connection_id: string;
    expires_in: number;
  };
  error?: any;
}
