import React from "react";
import type { BoxProps } from "@mui/material/Box";
import type { CardProps } from "@mui/material/Card";

import type { AuthPageProps, RegisterFormTypes } from "@refinedev/core";

import type { UseFormProps } from "@refinedev/react-hook-form";

import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  UpdatePasswordPage,
} from "./components";

export interface FormPropsType extends UseFormProps {
  onSubmit?: (values: RegisterFormTypes) => void;
}

export type AuthProps = AuthPageProps<BoxProps, CardProps, FormPropsType>;

export const AuthPage: React.FC<AuthProps> = (props) => {
  const { type } = props;
  const renderView = () => {
    switch (type) {
      case "register":
        return <RegisterPage {...props} />;
      case "forgotPassword":
        return <ForgotPasswordPage {...props} />;
      case "updatePassword":
        return <UpdatePasswordPage {...props} />;
      default:
        return <LoginPage {...props} />;
    }
  };

  return <>{renderView()}</>;
};
