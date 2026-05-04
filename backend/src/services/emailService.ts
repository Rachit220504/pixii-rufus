import { config } from "../utils/config";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface ResendEmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private apiKey: string | null = null;
  private fromEmail: string = "onboarding@resend.dev";

  constructor() {
    this.apiKey = config.email?.resendApiKey || null;
    this.fromEmail = config.email?.from || "onboarding@resend.dev";
    
    console.log("[EmailService] Resend API initialized:", {
      apiKey: this.apiKey ? "set (length: " + this.apiKey.length + ")" : "missing",
      fromEmail: this.fromEmail,
    });

    if (!this.apiKey) {
      console.error("[EmailService] RESEND_API_KEY not configured - email service disabled");
    }
  }

  /**
   * Send email via Resend API with automatic retry
   */
  async sendEmail(options: EmailOptions, retryCount: number = 0): Promise<{ success: boolean; error?: string }> {
    if (!this.apiKey) {
      console.error("[EmailService] Cannot send email: RESEND_API_KEY not configured");
      return { success: false, error: "Email service not configured - missing RESEND_API_KEY" };
    }

    const payload: ResendEmailPayload = {
      from: this.fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    try {
      console.log(`[EmailService] Sending email to: ${options.to} (attempt ${retryCount + 1})`);
      
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log("[EmailService] Email sent successfully:", {
        id: result.id,
        to: options.to,
      });

      return { success: true };
    } catch (error: any) {
      console.error("[EmailService] Email sending error:", {
        message: error.message,
        code: error.code,
        retryCount,
      });

      // Retry once if first attempt failed
      if (retryCount === 0) {
        console.log("[EmailService] Retrying email send...");
        return this.sendEmail(options, retryCount + 1);
      }

      return { success: false, error: `Email failed: ${error.message}` };
    }
  }

  /**
   * Send password reset email with clean HTML template
   */
  async sendResetEmail(email: string, resetLink: string): Promise<{ success: boolean; error?: string }> {
    const html = this.getPasswordResetTemplate(resetLink);
    const text = this.getPasswordResetText(resetLink);

    return this.sendEmail({
      to: email,
      subject: "Reset Your Password - Rufus AI Shopper",
      html,
      text,
    });
  }

  /**
   * Send password reset email (legacy compatibility)
   */
  async sendPasswordResetEmail(to: string, token: string): Promise<{ success: boolean; error?: string }> {
    const resetUrl = `${config.frontendUrl || "http://localhost:3000"}/forgot-password?token=${token}`;
    return this.sendResetEmail(to, resetUrl);
  }

  /**
   * Clean HTML email template for password reset
   */
  private getPasswordResetTemplate(resetLink: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .logo { text-align: center; margin-bottom: 24px; }
    .logo-text { font-size: 24px; font-weight: bold; color: #131921; }
    .logo-highlight { color: #febd69; }
    h1 { color: #131921; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; text-align: center; }
    p { color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center; }
    .button-container { text-align: center; margin: 32px 0; }
    .button { display: inline-block; background-color: #febd69; color: #131921; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.2s; }
    .button:hover { background-color: #f5b057; }
    .link-container { text-align: center; margin: 24px 0; }
    .link { color: #007185; font-size: 14px; word-break: break-all; }
    .divider { border-top: 1px solid #e5e7eb; margin: 32px 0; }
    .footer { text-align: center; color: #9ca3af; font-size: 14px; }
    .expiry { background-color: #fef3c7; border-radius: 8px; padding: 12px 16px; margin: 24px 0; text-align: center; color: #92400e; font-size: 14px; }
    @media (max-width: 480px) {
      .card { padding: 24px; }
      h1 { font-size: 20px; }
      p { font-size: 14px; }
      .button { padding: 12px 24px; font-size: 14px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <span class="logo-text">Rufus<span class="logo-highlight">AI</span></span>
      </div>
      
      <h1>Reset Your Password</h1>
      
      <p>We received a request to reset your password. Click the button below to create a new password for your account.</p>
      
      <div class="button-container">
        <a href="${resetLink}" class="button">Reset Password</a>
      </div>
      
      <div class="expiry">
        This link will expire in 1 hour for security reasons.
      </div>
      
      <p style="font-size: 14px; color: #6b7280;">If the button doesn't work, copy and paste this link into your browser:</p>
      
      <div class="link-container">
        <span class="link">${resetLink}</span>
      </div>
      
      <div class="divider"></div>
      
      <p class="footer">
        Didn't request this reset? You can safely ignore this email.<br>
        Your password won't be changed.
      </p>
      
      <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px;">
        Rufus AI Shopper - Your AI Shopping Assistant
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Plain text version for email clients that don't support HTML
   */
  private getPasswordResetText(resetLink: string): string {
    return `
Rufus AI Shopper - Reset Your Password

We received a request to reset your password. Click the link below to create a new password:

${resetLink}

This link will expire in 1 hour for security reasons.

If you didn't request this reset, you can safely ignore this email. Your password won't be changed.

---
Rufus AI Shopper - Your AI Shopping Assistant
    `.trim();
  }
}

export const emailService = new EmailService();

