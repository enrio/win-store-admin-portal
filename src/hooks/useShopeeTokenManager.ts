import { useState } from "react";
import { useNotification } from "@refinedev/core";
import { supabaseClient } from "../supabaseClient";
import type { IShopeeTokenManagerPayload, IShopeeTokenManagerResponse } from "../interfaces/integration";

interface ShopeeTokenManagerOptions {
  onSuccess?: (data: IShopeeTokenManagerResponse["data"]) => void;
  onError?: (error: any) => void;
}

export const useShopeeTokenManager = (options?: ShopeeTokenManagerOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { open: notify } = useNotification();

  const manageToken = async (payload: IShopeeTokenManagerPayload) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabaseClient.functions.invoke<IShopeeTokenManagerResponse>(
        "shopee-token-manager",
        {
          body: payload,
        }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error?.message || "Token management operation failed");
      }

      if (payload.operation === "refresh") {
        notify?.({
          type: "success",
          message: "Token Refreshed",
          description: "Shopee access token has been manually refreshed successfully.",
        });
      }

      options?.onSuccess?.(data.data);
      return data.data;
    } catch (err: any) {
      console.error("Shopee Token Manager Error:", err);
      setError(err);
      notify?.({
        type: "error",
        message: "Token Operation Failed",
        description: err.message || "An unexpected error occurred while managing the token.",
      });
      options?.onError?.(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getStatus = (shopId?: string | number, mainAccountId?: string | number) => {
    return manageToken({ operation: "get", shopId, mainAccountId });
  };

  const forceRefresh = (shopId?: string | number, mainAccountId?: string | number) => {
    return manageToken({ operation: "refresh", shopId, mainAccountId });
  };

  return { manageToken, getStatus, forceRefresh, isLoading, error };
};
