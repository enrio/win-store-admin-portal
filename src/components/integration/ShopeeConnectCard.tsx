import React, { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import StorefrontIcon from "@mui/icons-material/Storefront";
import CircularProgress from "@mui/material/CircularProgress";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";

import { useShopeeConnect } from "../../hooks/useShopeeConnect";
import { useShopeeTokenManager } from "../../hooks/useShopeeTokenManager";
import type { IMarketplaceConnection } from "../../interfaces/integration";
import { useNotification, useInvalidate } from "@refinedev/core";

interface ShopeeConnectCardProps {
  connection?: IMarketplaceConnection | null;
}

export const ShopeeConnectCard: React.FC<ShopeeConnectCardProps> = ({ connection }) => {
  const isConnected = connection && connection.status === "connected";
  const invalidate = useInvalidate();
  const { open: notify } = useNotification();

  const handleConnectSuccess = () => {
    invalidate({
      resource: "integrations",
      invalidates: ["list"],
    });
  };

  const { connect, isConnecting } = useShopeeConnect({
    onSuccess: handleConnectSuccess,
  });

  const { forceRefresh, isLoading: isRefreshing } = useShopeeTokenManager({
    onSuccess: () => {
      invalidate({
        resource: "integrations",
        invalidates: ["list"],
      });
    },
  });

  const handleRefresh = async () => {
    if (!connection) return;
    try {
      await forceRefresh(
        connection.external_shop_id || undefined,
        connection.main_account_id || undefined
      );
    } catch (e) {
      // error handled in hook
    }
  };

  const getStatusChip = () => {
    if (!connection) {
      return <Chip label="Not Connected" size="small" />;
    }
    switch (connection.status) {
      case "connected":
        return <Chip label="Connected" size="small" color="success" icon={<CheckCircleIcon />} />;
      case "expired":
        return <Chip label="Expired" size="small" color="error" icon={<ErrorIcon />} />;
      case "error":
        return <Chip label="Connection Error" size="small" color="error" icon={<ErrorIcon />} />;
      default:
        return <Chip label={connection.status} size="small" />;
    }
  };

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                bgcolor: "#ee4d2d", // Shopee Orange
                color: "white",
                p: 1.5,
                borderRadius: 2,
                display: "flex",
              }}
            >
              <StorefrontIcon fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Shopee
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Marketplace Integration
              </Typography>
            </Box>
          </Box>
          {getStatusChip()}
        </Box>

        {isConnected && connection && (
          <Box sx={{ mt: 3, mb: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Connected Shop:</strong> {connection.shop_name || "Unknown"} 
              {connection.external_shop_id && ` (${connection.external_shop_id})`}
              {connection.main_account_id && ` [Main Account: ${connection.main_account_id}]`}
            </Typography>
            {connection.expires_in && (
              <Typography variant="body2" color="text.secondary">
                <strong>Token valid for:</strong> {Math.round(connection.expires_in / 60)} minutes
              </Typography>
            )}
            {connection.refresh_failed_count > 0 && (
              <Typography variant="caption" color="error">
                Failed refresh attempts: {connection.refresh_failed_count}/5
              </Typography>
            )}
          </Box>
        )}
        {!isConnected && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Connect your Shopee store to sync orders, products, and inventory automatically.
            </Typography>
        )}
      </CardContent>
      
      <CardActions sx={{ p: 2, pt: 0, justifyContent: "flex-end" }}>
        {isConnected ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={handleRefresh}
            disabled={isRefreshing || isConnecting}
          >
            Force Refresh
          </Button>
        ) : (
          <Button
            size="medium"
            variant="contained"
            sx={{ bgcolor: "#ee4d2d", "&:hover": { bgcolor: "#d73d20" } }}
            onClick={connect}
            disabled={isConnecting}
            startIcon={isConnecting && <CircularProgress size={16} color="inherit" />}
          >
            {isConnecting ? "Connecting..." : "Connect Shopee"}
          </Button>
        )}
      </CardActions>
    </Card>
  );
};
