import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No token provided",
      });
    }

    const user = await authService.validateSession(token);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    (req as any).user = user;
    (req as any).token = token;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({
      success: false,
      error: "Authentication failed",
    });
  }
}

export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return next();
  }

  authService.validateSession(token).then((user) => {
    if (user) {
      (req as any).user = user;
      (req as any).token = token;
    }
    next();
  }).catch(() => {
    next();
  });
}
