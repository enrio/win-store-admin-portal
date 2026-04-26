import React from "react";
import { useList } from "@refinedev/core";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { ShopeeConnectCard } from "../../components";
import type { IMarketplaceConnection } from "../../interfaces/integration";

export const IntegrationList: React.FC = () => {
  const { data: listResponse, isLoading, isError } = useList<IMarketplaceConnection>({
    resource: "marketplace_connection_status",
    pagination: {
      mode: "off",
    },
  }) as any;

  const connections = listResponse?.data || [];

  // Find shopee connection if it exists
  const shopeeConnection = connections.find((c: IMarketplaceConnection) => c.marketplace === "shopee");

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="error">Failed to load marketplace connections.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Channels & Integrations
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Connect your store to external marketplaces to automatically sync orders,
          inventory, and products.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          {/* We only have Shopee for now, but we can easily add more cards here */}
          <ShopeeConnectCard connection={shopeeConnection} />
        </Grid>
      </Grid>
    </Box>
  );
};
