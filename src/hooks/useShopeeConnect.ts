import { useState, useCallback, useEffect } from "react";
import { useNotification } from "@refinedev/core";
import { supabaseClient } from "../supabaseClient";
import type {
  IShopeeAuthLinkResponse,
  IShopeeExchangeCodePayload,
  IShopeeExchangeCodeResponse,
} from "../interfaces/integration";

interface ShopeeConnectOptions {
  onSuccess?: (data: IShopeeExchangeCodeResponse["data"]) => void;
  onError?: (error: any) => void;
}

export const useShopeeConnect = (options?: ShopeeConnectOptions) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { open: notify } = useNotification();

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      // Security check: Ensure origin matches current window origin (popup acts on same origin generically, though Shopee redirects to our callback page which is on same origin)
      if (event.origin !== window.location.origin) {
        return;
      }

      const data = event.data;
      if (data?.source !== "win-store-shopee-oauth") {
        return;
      }

      // We received the callback
      setIsConnecting(true);
      setError(null);

      try {
        if (data.error) {
          throw new Error(`OAuth Error: ${data.error}`);
        }

        const payload: IShopeeExchangeCodePayload = {
          code: data.code,
          state: data.state,
        };

        if (data.shopId) {
          payload.shopId = data.shopId;
        } else if (data.mainAccountId) {
          payload.mainAccountId = data.mainAccountId;
        } else {
          throw new Error("Missing shopId or mainAccountId from OAuth callback");
        }

        const { data: exchangeData, error: exchangeError } =
          await supabaseClient.functions.invoke<IShopeeExchangeCodeResponse>(
            "shopee-exchange-code",
            {
              body: payload,
            }
          );

        if (exchangeError) {
          throw new Error(exchangeError.message);
        }

        if (!exchangeData?.success) {
          throw new Error(exchangeData?.error?.message || "Exchange code failed");
        }

        notify?.({
          type: "success",
          message: "Shopee Connected successfully!",
          description: "Your store is now linked to Shopee.",
        });

        options?.onSuccess?.(exchangeData.data);
      } catch (err: any) {
        console.error("Shopee Connect Error:", err);
        setError(err);
        notify?.({
          type: "error",
          message: "Failed to connect Shopee",
          description: err.message || "An unexpected error occurred.",
        });
        options?.onError?.(err);
      } finally {
        setIsConnecting(false);
      }
    },
    [notify, options]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [handleMessage]);

  const connect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabaseClient.functions.invoke<IShopeeAuthLinkResponse>(
        "shopee-auth-link",
        {
          method: "POST",
        }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data?.success || !data?.data?.auth_url) {
        throw new Error("Failed to generate Shopee Auth Link");
      }

      // Open Popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      window.open(
        data.data.auth_url,
        "Shopee Connect",
        `width=${width},height=${height},top=${top},left=${left}`
      );
    } catch (err: any) {
      console.error("Shopee Auth Link Error:", err);
      setError(err);
      setIsConnecting(false);
      notify?.({
        type: "error",
        message: "Failed to start connection",
        description: err.message || "Could not retrieve authorization link",
      });
      options?.onError?.(err);
    }
  };

  return { connect, isConnecting, error };
};
