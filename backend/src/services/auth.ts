import { createHash, randomBytes } from "crypto";
import { OAuth2Client } from "google-auth-library";
import { pool, query } from "../db/postgres";
import { config } from "../utils/config";

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
}

export interface Session {
  token: string;
  userId: number;
  expiresAt: Date;
}

export class AuthService {
  private googleClient: OAuth2Client;

  constructor() {
    this.googleClient = new OAuth2Client(config.google.clientId);
  }

  private hashPassword(password: string): string {
    return createHash("sha256").update(password).digest("hex");
  }

  private generateToken(): string {
    return randomBytes(32).toString("hex");
  }

  async verifyGoogleToken(idToken: string): Promise<{ user?: User; session?: Session; error?: string }> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: config.google.clientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return { error: "Invalid Google token" };
      }

      const email = payload.email;
      const firstName = payload.given_name || "";
      const lastName = payload.family_name || "";

      if (!email) {
        return { error: "Email not provided by Google" };
      }

      // Check if user exists
      let result = await query(
        `SELECT id, email, first_name, last_name, created_at FROM users WHERE email = $1`,
        [email]
      );

      let user: User;

      if (result.rows.length === 0) {
        // Create new user from Google data
        const randomPassword = randomBytes(32).toString("hex");
        const passwordHash = this.hashPassword(randomPassword);

        result = await query(
          `INSERT INTO users (email, password_hash, first_name, last_name)
           VALUES ($1, $2, $3, $4)
           RETURNING id, email, first_name, last_name, created_at`,
          [email, passwordHash, firstName, lastName]
        );
      }

      const row = result.rows[0];
      user = {
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        createdAt: row.created_at,
      };

      // Create session
      const token = this.generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await query(
        `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
        [user.id, token, expiresAt]
      );

      const session: Session = {
        token,
        userId: user.id,
        expiresAt,
      };

      return { user, session };
    } catch (error) {
      console.error("Google auth error:", error);
      return { error: "Google authentication failed" };
    }
  }

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<{ user: User; error?: string }> {
    try {
      const existingUser = await query("SELECT id FROM users WHERE email = $1", [email]);
      if (existingUser.rows.length > 0) {
        return { user: null as any, error: "User already exists" };
      }

      const passwordHash = this.hashPassword(password);

      const result = await query(
        `INSERT INTO users (email, password_hash, first_name, last_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, first_name, last_name, created_at`,
        [email, passwordHash, firstName, lastName]
      );

      const row = result.rows[0];
      return {
        user: {
          id: row.id,
          email: row.email,
          firstName: row.first_name,
          lastName: row.last_name,
          createdAt: row.created_at,
        },
      };
    } catch (error) {
      console.error("Registration error:", error);
      return { user: null as any, error: "Registration failed" };
    }
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user?: User; session?: Session; error?: string }> {
    try {
      const passwordHash = this.hashPassword(password);

      const result = await query(
        `SELECT id, email, first_name, last_name, created_at
         FROM users
         WHERE email = $1 AND password_hash = $2`,
        [email, passwordHash]
      );

      if (result.rows.length === 0) {
        return { error: "Invalid credentials" };
      }

      const row = result.rows[0];
      const user: User = {
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        createdAt: row.created_at,
      };

      const token = this.generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await query(
        `INSERT INTO sessions (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, token, expiresAt]
      );

      const session: Session = {
        token,
        userId: user.id,
        expiresAt,
      };

      return { user, session };
    } catch (error) {
      console.error("Login error:", error);
      return { error: "Login failed" };
    }
  }

  async logout(token: string): Promise<{ success: boolean }> {
    try {
      await query("DELETE FROM sessions WHERE token = $1", [token]);
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return { success: false };
    }
  }

  async validateSession(token: string): Promise<User | null> {
    try {
      const result = await query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.created_at
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.token = $1 AND s.expires_at > NOW()`,
        [token]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        createdAt: row.created_at,
      };
    } catch (error) {
      console.error("Session validation error:", error);
      return null;
    }
  }

  async forgotPassword(email: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const userResult = await query("SELECT id FROM users WHERE email = $1", [email]);
      
      if (userResult.rows.length === 0) {
        return { success: false, error: "User not found" };
      }

      const resetToken = this.generateToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await query(
        `UPDATE users
         SET reset_token = $1, reset_token_expires = $2
         WHERE email = $3`,
        [resetToken, expiresAt, email]
      );

      return { success: true, token: resetToken };
    } catch (error) {
      console.error("Forgot password error:", error);
      return { success: false, error: "Failed to process request" };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await query(
        `SELECT id FROM users
         WHERE reset_token = $1 AND reset_token_expires > NOW()`,
        [token]
      );

      if (result.rows.length === 0) {
        return { success: false, error: "Invalid or expired token" };
      }

      const userId = result.rows[0].id;
      const passwordHash = this.hashPassword(newPassword);

      await query(
        `UPDATE users
         SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL
         WHERE id = $2`,
        [passwordHash, userId]
      );

      await query("DELETE FROM sessions WHERE user_id = $1", [userId]);

      return { success: true };
    } catch (error) {
      console.error("Reset password error:", error);
      return { success: false, error: "Failed to reset password" };
    }
  }

  async getUserById(userId: number): Promise<User | null> {
    try {
      const result = await query(
        `SELECT id, email, first_name, last_name, created_at
         FROM users
         WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        createdAt: row.created_at,
      };
    } catch (error) {
      console.error("Get user error:", error);
      return null;
    }
  }
}

export const authService = new AuthService();
