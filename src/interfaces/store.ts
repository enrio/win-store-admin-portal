export interface IStoreAddress {
  line1?: string;
  city?: string;
  country?: string;
}

export interface IStoreContext {
  initialized: boolean;
  store_id?: string;
  slug?: string;
  name?: string;
  business_email?: string;
  phone?: string;
  address?: IStoreAddress;
  status?: string;
  role?: string;
}

export interface IStoreInitPayload {
  name: string;
  slug: string;
  businessEmail: string;
  phone?: string;
  address?: IStoreAddress;
}
