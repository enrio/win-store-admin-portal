import * as React from "react";
import { AuthPage as MUIAuthPage, type AuthProps } from "./AuthPage";
import { Link } from "react-router";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import { useLogin } from "@refinedev/core";
import GoogleIcon from "@mui/icons-material/Google";
import {
  FinefoodsLogoIcon,
  FinefoodsLogoText,
} from "../../components/icons/finefoods-logo";

const authWrapperProps = {
  style: {
    background:
      "radial-gradient(50% 50% at 50% 50%,rgba(255, 255, 255, 0) 0%,rgba(0, 0, 0, 0.5) 100%),url('images/login-bg.png')",
    backgroundSize: "cover",
  },
};

const renderAuthContent = (content: React.ReactNode) => {
  return (
    <div>
      <Link to="/">
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap="12px"
          marginBottom="16px"
        >
          <FinefoodsLogoIcon
            style={{
              width: 64,
              height: 64,
              color: "#fff",
            }}
          />
          <FinefoodsLogoText
            style={{
              color: "#fff",
              width: "300px",
              height: "auto",
            }}
          />
        </Box>
      </Link>
      {content}
    </div>
  );
};

const GoogleLoginButton: React.FC = () => {
  const { mutate: login } = useLogin();

  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ mb: 2, color: "text.secondary", fontSize: "0.875rem" }}>
        or
      </Divider>
      <Button
        fullWidth
        variant="outlined"
        startIcon={<GoogleIcon />}
        onClick={() => login({ providerName: "google" })}
        sx={{
          textTransform: "none",
          borderColor: "divider",
          color: "text.primary",
          py: 1,
          "&:hover": {
            borderColor: "primary.main",
            backgroundColor: "action.hover",
          },
        }}
      >
        Sign in with Google
      </Button>
    </Box>
  );
};

export const AuthPage: React.FC<AuthProps> = ({ type, formProps }) => {
  const showGoogleButton = type === "login" || type === "register";

  const renderContent = (content: React.ReactNode) => {
    return renderAuthContent(
      <>
        {content}
        {showGoogleButton && <GoogleLoginButton />}
      </>,
    );
  };

  return (
    <MUIAuthPage
      type={type}
      wrapperProps={authWrapperProps}
      renderContent={renderContent}
      formProps={formProps}
    />
  );
};
