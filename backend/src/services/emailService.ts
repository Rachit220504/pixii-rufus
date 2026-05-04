import nodemailer from "nodemailer";
import { config } from "../utils/config";

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Initialize transporter if email credentials are available
    if (config.smtp?.host && config.smtp?.user && config.smtp?.pass) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port || 587,
        secure: config.smtp.secure || false,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      });
    }
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.transporter) {
        return { success: false, error: "Email service not configured" };
      }

      await this.transporter.sendMail({
        from: config.smtp?.from || `"Rufus AI Shopper" <${config.smtp?.user}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      return { success: true };
    } catch (error) {
      console.error("Email sending error:", error);
      return { success: false, error: "Failed to send email" };
    }
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<{ success: boolean; error?: string }> {
    const resetUrl = `${config.frontendUrl || "http://localhost:3000"}/forgot-password?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #131921; margin-bottom: 20px;">Password Reset Request</h2>
          <p style="color: #333; font-size: 16px; line-height: 1.5;">
            You requested a password reset for your Rufus AI Shopper account. Use the token below to reset your password:
          </p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <code style="font-size: 18px; font-weight: bold; color: #007185; letter-spacing: 1px;">${token}</code>
          </div>
          <p style="color: #333; font-size: 16px; line-height: 1.5;">
            Or click the link below to reset your password:
          </p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetUrl}" 
               style="background-color: #febd69; color: #131921; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px; line-height: 1.5; margin-top: 30px;">
            This token will expire in 1 hour. If you didn't request this reset, please ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Rufus AI Shopper - Your AI Shopping Assistant
          </p>
        </div>
      </div>
    `;

    const text = `
Password Reset Request

You requested a password reset for your Rufus AI Shopper account.

Your reset token: ${token}

Or use this link: ${resetUrl}

This token will expire in 1 hour.

If you didn't request this reset, please ignore this email.

Rufus AI Shopper - Your AI Shopping Assistant
    `;

    return this.sendEmail({
      to,
      subject: "Reset Your Password - Rufus AI Shopper",
      text,
      html,
    });
  }
}

export const emailService = new EmailService();
