import React, { useState, useEffect } from "react";
import { useGetIdentity, useNotification } from "@refinedev/core";
import { useNavigate } from "react-router";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import StoreOutlined from "@mui/icons-material/StoreOutlined";
import { supabaseClient } from "../../supabaseClient";
import { useStoreContext } from "../../contexts/store";
import type { IStoreInitPayload } from "../../interfaces/store";

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");

const ERROR_MESSAGES: Record<string, string> = {
  store_name_required: "Store name is required.",
  store_slug_required: "Store slug is required.",
  store_slug_invalid: "Slug can only contain lowercase letters, numbers, and hyphens.",
  store_slug_already_exists: "This slug is already taken. Please choose another.",
  store_init_failed: "Something went wrong. Please try again.",
  unauthorized: "Your session has expired. Please log in again.",
};

export const StoreOnboardingPage: React.FC = () => {
  const { data: identity } = useGetIdentity<{
    id: string;
    name: string;
    email: string;
  }>();
  const navigate = useNavigate();
  const { open: notify } = useNotification();
  const { refetch } = useStoreContext();

  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<IStoreInitPayload>({
    name: "",
    slug: "",
    businessEmail: "",
    phone: "",
    address: { line1: "", city: "", country: "" },
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  useEffect(() => {
    if (identity?.email && !formData.businessEmail) {
      setFormData((prev) => ({ ...prev, businessEmail: identity.email }));
    }
  }, [identity?.email, formData.businessEmail]);

  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name: value,
      ...(!slugManuallyEdited ? { slug: slugify(value) } : {}),
    }));
  };

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setFormData((prev) => ({ ...prev, slug: slugify(value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data, error } = await supabaseClient.rpc(
        "create_store_with_membership",
        {
          p_name: formData.name,
          p_slug: formData.slug,
          p_business_email: formData.businessEmail || null,
          p_phone: formData.phone || null,
          p_address: formData.address || {},
        }
      );

      if (error) {
        notify?.({
          type: "error",
          message: "Store creation failed",
          description: error.message,
        });
        return;
      }

      notify?.({
        type: "success",
        message: "Store created!",
        description: `"${data?.[0]?.name}" is ready to go.`,
      });

      await refetch();
      navigate("/");
    } catch (err) {
      notify?.({
        type: "error",
        message: "Network error",
        description: "Could not reach the server. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: (theme) =>
          theme.palette.mode === "dark"
            ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
            : "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 520,
          width: "100%",
          borderRadius: 3,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mb: 3,
            }}
          >
            <StoreOutlined sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
            <Typography variant="h5" fontWeight={700}>
              Set up your store
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Tell us about your business to get started.
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              required
              fullWidth
              label="Store Name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              sx={{ mb: 2 }}
              autoFocus
            />
            <TextField
              required
              fullWidth
              label="Slug"
              helperText="URL-friendly identifier (e.g. my-store)"
              value={formData.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              required
              fullWidth
              label="Business Email"
              type="email"
              value={formData.businessEmail}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  businessEmail: e.target.value,
                }))
              }
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              sx={{ mb: 2 }}
            />

            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              Address (optional)
            </Typography>
            <TextField
              fullWidth
              label="Street Address"
              value={formData.address?.line1}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  address: { ...prev.address, line1: e.target.value },
                }))
              }
              sx={{ mb: 2 }}
              size="small"
            />
            <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
              <TextField
                fullWidth
                label="City"
                value={formData.address?.city}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    address: { ...prev.address, city: e.target.value },
                  }))
                }
                size="small"
              />
              <TextField
                fullWidth
                label="Country"
                value={formData.address?.country}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    address: { ...prev.address, country: e.target.value },
                  }))
                }
                size="small"
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={submitting || !formData.name || !formData.slug}
              sx={{ py: 1.5, textTransform: "none", fontWeight: 600 }}
            >
              {submitting ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Create Store"
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
