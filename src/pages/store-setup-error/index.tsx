import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useTranslate } from "@refinedev/core";

export const StoreSetupErrorPage: React.FC = () => {
  const t = useTranslate();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        textAlign: "center",
        p: 3,
      }}
    >
      <ErrorOutlineIcon color="error" sx={{ fontSize: 80, mb: 2 }} />
      <Typography variant="h4" gutterBottom>
        Store Setup Error
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500 }}>
        An unexpected error occurred while checking your store setup. This could be due to a server issue or network problem. Please try again later.
      </Typography>
      <Button variant="contained" onClick={() => window.location.reload()}>
        {t("buttons.refresh", "Refresh Page")}
      </Button>
    </Box>
  );
};
