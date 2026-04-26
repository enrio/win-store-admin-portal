import React, {
  createContext,
  useContext,
  type PropsWithChildren,
} from "react";
import { useIsAuthenticated, useGetIdentity, useList } from "@refinedev/core";
import type { IStoreContext } from "../../interfaces/store";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { StoreSetupErrorPage } from "../../pages/store-setup-error";
import { supabaseClient } from "../../supabaseClient";

interface StoreContextValue {
  store: IStoreContext | null; // active store
  stores: IStoreContext[];     // all stores user is a member of
  switchStore: (id: string) => void;
  loading: boolean;
  isError?: boolean;
  refetch: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue>({
  store: null,
  stores: [],
  switchStore: () => {},
  loading: true,
  isError: false,
  refetch: async () => {},
});

export const useStoreContext = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStoreContext must be used within StoreContextProvider");
  }
  return context;
};

export const StoreContextProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const { data: authData } = useIsAuthenticated();
  const { data: identity } = useGetIdentity<{ id: string }>();

  const fetchStores = React.useCallback(async () => {
    const { data, error } = await supabaseClient.rpc("store_get_user_stores" as any);
    if (error) throw error;
    return { data: data || [], total: data?.length || 0 };
  }, []);

  const queryOptions = React.useMemo(
    () => ({
      queryFn: fetchStores,
      enabled: !!identity?.id && !!authData?.authenticated,
      retry: 2,
    }),
    [fetchStores, identity?.id, authData?.authenticated]
  );

  const { query } = useList({
    resource: "stores",
    pagination: { mode: "off" },
    queryOptions,
  });

  const { data: storesData, isLoading, isError, refetch } = query;
  const data = storesData?.data;

  const [activeStoreId, setActiveStoreId] = React.useState<string | null>(() => {
    return localStorage.getItem("win_store_active_id");
  });

  // Use raw isLoading to avoid flickering between true/false when authentication properties load.
  const loading = isLoading;

  const stores: IStoreContext[] = React.useMemo(() => {
    if (!data) return [];
    return data.map((storeInfo: any) => ({
      initialized: true,
      store_id: storeInfo.id,
      slug: storeInfo.slug,
      name: storeInfo.name,
      business_email: storeInfo.business_email,
      phone: storeInfo.phone,
      address: storeInfo.address,
      status: storeInfo.status,
      role: storeInfo.role,
    }));
  }, [data]);

  const store = React.useMemo(() => {
    if (loading) return null;
    if (stores.length === 0) return { initialized: false };
    
    const selected = stores.find(s => s.store_id === activeStoreId);
    if (selected) return selected;
    
    return stores[0];
  }, [stores, activeStoreId, loading]);

  const switchStore = (id: string) => {
    setActiveStoreId(id);
    localStorage.setItem("win_store_active_id", id);
    // The query invalidation or reloading will be handled in the UI if needed
  };

  React.useEffect(() => {
    if (store?.store_id && !activeStoreId) {
      setActiveStoreId(store.store_id);
      localStorage.setItem("win_store_active_id", store.store_id);
    }
  }, [store?.store_id, activeStoreId]);

  return (
    <StoreContext.Provider
      value={{ store, stores, switchStore, loading, isError, refetch: refetch as any }}
    >
      {children}
    </StoreContext.Provider>
  );
};

interface OnboardingGateProps extends PropsWithChildren {
  fallback: React.ReactNode;
}

export const OnboardingGate: React.FC<OnboardingGateProps> = ({
  children,
  fallback,
}) => {
  const { store, loading, isError } = useStoreContext();

  if (isError) {
    return <StoreSetupErrorPage />;
  }

  if (loading || !store) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!store?.initialized) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
