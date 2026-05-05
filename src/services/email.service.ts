import { Resend } from "resend";
import { config } from "../config";

const resend = new Resend(config.email.resendApiKey);
const FROM = "Shared Tales <noreply@shared-t.online>";
export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${config.email.apiUrl}/api/auth/verify-email?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Verify your email — Shared Tales",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;">
        <h2 style="font-size:22px;margin-bottom:8px;">Verify your email</h2>
        <p style="color:#666;margin-bottom:24px;">Click the button below to verify your email address and start writing.</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#C9A96E;color:#1a2318;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Verify email</a>
        <p style="color:#999;font-size:12px;margin-top:24px;">If you didn't create an account, you can ignore this email.</p>
      </div>
    `,
  });
}
