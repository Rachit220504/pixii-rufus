import { Request, Response } from "express";
import { authService } from "../services/auth";

export async function register(req: Request, res: Response) {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    const { user, error } = await authService.register(email, password, firstName || "", lastName || "");

    if (error) {
      return res.status(400).json({
        success: false,
        error,
      });
    }

    return res.status(201).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      error: "Registration failed",
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    const { user, session, error } = await authService.login(email, password);

    if (error) {
      return res.status(401).json({
        success: false,
        error,
      });
    }

    return res.json({
      success: true,
      data: { user, session },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      error: "Login failed",
    });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No token provided",
      });
    }

    await authService.logout(token);

    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      error: "Logout failed",
    });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const { success, message, error } = await authService.forgotPassword(email);

    if (!success) {
      return res.status(400).json({
        success: false,
        error,
      });
    }

    return res.json({
      success: true,
      message: message || "Password reset email sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process request",
    });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Token and new password are required",
      });
    }

    const { success, error } = await authService.resetPassword(token, newPassword);

    if (!success) {
      return res.status(400).json({
        success: false,
        error,
      });
    }

    return res.json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to reset password",
    });
  }
}

export async function getMe(req: Request, res: Response) {
  try {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
    }

    return res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error("Get me error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get user",
    });
  }
}

export async function googleAuth(req: Request, res: Response) {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: "Google ID token is required",
      });
    }

    const { user, session, error } = await authService.verifyGoogleToken(idToken);

    if (error) {
      return res.status(401).json({
        success: false,
        error,
      });
    }

    return res.json({
      success: true,
      data: { user, session },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(500).json({
      success: false,
      error: "Google authentication failed",
    });
  }
}
