import type { AuthProvider } from "@refinedev/core";
import { supabaseClient } from "./supabaseClient";

export const authProvider: AuthProvider = {
  login: async ({ email, password, providerName }) => {
    // OAuth providers (Google, etc.)
    if (providerName) {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: providerName,
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        return {
          success: false,
          error: { message: error.message, name: "OAuthError" },
        };
      }

      // OAuth redirects the browser — return success (won't be reached)
      return { success: true };
    }

    // Email/password
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: { message: error.message, name: "LoginError" },
      };
    }

    return { success: true, redirectTo: "/" };
  },

  register: async ({ email, password }) => {
    const { error } = await supabaseClient.auth.signUp({ email, password });

    if (error) {
      return {
        success: false,
        error: { message: error.message, name: "RegisterError" },
      };
    }

    return { success: true, redirectTo: "/" };
  },

  forgotPassword: async ({ email }) => {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      return {
        success: false,
        error: { message: error.message, name: "ForgotPasswordError" },
      };
    }

    return { success: true };
  },

  updatePassword: async ({ password }) => {
    const { error } = await supabaseClient.auth.updateUser({ password });

    if (error) {
      return {
        success: false,
        error: { message: error.message, name: "UpdatePasswordError" },
      };
    }

    return { success: true, redirectTo: "/" };
  },

  logout: async () => {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      return {
        success: false,
        error: { message: error.message, name: "LogoutError" },
      };
    }

    return { success: true, redirectTo: "/login" };
  },

  onError: async (error) => {
    if (error?.status === 401 || error?.message === "Invalid JWT") {
      return { logout: true };
    }

    return { error };
  },

  check: async () => {
    const { data } = await supabaseClient.auth.getSession();

    if (data?.session) {
      return { authenticated: true };
    }

    return {
      authenticated: false,
      error: { message: "Session not found", name: "Unauthorized" },
      logout: true,
      redirectTo: "/login",
    };
  },

  getPermissions: async () => {
    const { data } = await supabaseClient.auth.getUser();
    return data?.user?.role ?? null;
  },

  getIdentity: async () => {
    const { data } = await supabaseClient.auth.getUser();
    const user = data?.user;

    if (!user) {
      return null;
    }

    const { email, user_metadata } = user;

    return {
      id: user.id,
      name: user_metadata?.full_name || user_metadata?.name || email,
      email,
      avatar: user_metadata?.avatar_url || user_metadata?.picture,
    };
  },
};
