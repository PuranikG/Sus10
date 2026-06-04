"""
Email service for Sus10 AI
==========================
Sends transactional emails via Gmail SMTP (App Password auth).

Required env vars:
  GMAIL_SENDER        — the Gmail address used to send (e.g. noreply@sus10.ai)
  GMAIL_APP_PASSWORD  — 16-char Gmail App Password (not the account password)
  GMAIL_ADMIN_EMAIL   — recipient for admin notifications (defaults to GMAIL_SENDER)
  PUBLIC_APP_URL      — base URL for report links (default: https://sus10.ai)
"""

import os
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

_TIER_COLOR = {
    "Explorer":               "#f87171",
    "Getting Ready":          "#fbbf24",
    "Action Ready":           "#4ade80",
    "Sustainability Champion":"#00c96e",
}
_TIER_EMOJI = {
    "Explorer":               "🌱",
    "Getting Ready":          "⚡",
    "Action Ready":           "🚀",
    "Sustainability Champion":"🌟",
}


def _smtp_send(sender: str, password: str, to: str, msg: MIMEMultipart) -> bool:
    """Shared SMTP send helper using STARTTLS on port 587.

    Port 587 + STARTTLS is used instead of port 465 (SSL) because cloud /
    container hosts commonly block outbound port 465 while leaving 587 open.
    A 15-second timeout prevents silent hangs that would cause nginx 502s.
    """
    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()
            smtp.login(sender, password)
            smtp.sendmail(sender, to, msg.as_string())
        return True
    except Exception as exc:
        logger.error(
            f"SMTP send failed — type={type(exc).__name__} "
            f"message={exc} (to={to})"
        )
        return False


def send_report_email(
    to_email: str,
    first_name: str,
    assessment_id: str,
    overall_score,
    readiness_tier: str,
    solar_kwh,
    rainwater_kl,
    food_kg,
    co2_tonnes,
) -> bool:
    """
    Send the Sus10 sustainability report link to the user.
    Returns True on success, False on any failure (including missing creds).
    """
    sender   = os.environ.get("GMAIL_SENDER")
    password = os.environ.get("GMAIL_APP_PASSWORD")
    app_url  = os.environ.get("PUBLIC_APP_URL", "https://sus10.ai")

    if not sender or not password:
        logger.warning("Report email skipped — GMAIL_SENDER / GMAIL_APP_PASSWORD not set")
        return False
    if not to_email:
        logger.warning("Report email skipped — no recipient email")
        return False

    tier_color = _TIER_COLOR.get(readiness_tier, "#4ade80")
    tier_emoji = _TIER_EMOJI.get(readiness_tier, "🌱")
    report_url = f"{app_url}/report/{assessment_id}"

    # ── Build metric rows ──────────────────────────────────────────────────
    def _fmt_num(n):
        try:
            return f"{int(round(float(n or 0))):,}"
        except (TypeError, ValueError):
            return "—"

    solar_kwh_str   = _fmt_num(solar_kwh)
    rainwater_str   = _fmt_num(rainwater_kl)
    food_str        = _fmt_num(food_kg)
    co2_str         = str(co2_tonnes) if co2_tonnes else "—"

    subject = f"{tier_emoji} Your Sus10 Sustainability Report is ready, {first_name or 'there'}!"

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7f4;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">

        <!-- Header band -->
        <tr><td style="background:#0d1710;padding:20px 32px">
          <span style="font-size:20px;font-weight:700;color:#4ade80;letter-spacing:-0.3px">Sus10 AI</span>
          <span style="font-size:13px;color:rgba(255,255,255,0.45);margin-left:8px">· Home Sustainability Report</span>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding:28px 32px 0">
          <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111">
            Hi {first_name or 'there'} 👋
          </p>
          <p style="margin:0;font-size:15px;color:#444;line-height:1.6">
            Your Sus10 Sustainability Report is ready. Here's a quick summary of your rooftop's potential:
          </p>
        </td></tr>

        <!-- Tier pill -->
        <tr><td style="padding:20px 32px 0">
          <span style="display:inline-block;background:{tier_color}22;border:1.5px solid {tier_color}55;border-radius:20px;padding:6px 16px;font-size:13px;font-weight:600;color:{tier_color}">
            {tier_emoji} {readiness_tier} &nbsp;·&nbsp; {overall_score}/100
          </span>
        </td></tr>

        <!-- Metrics grid -->
        <tr><td style="padding:20px 32px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="25%" style="padding:12px 8px;text-align:center;background:#f9faf9;border-radius:8px">
                <div style="font-size:22px;font-weight:700;color:#fbbf24">{solar_kwh_str}</div>
                <div style="font-size:11px;color:#888;margin-top:2px">kWh/yr Solar</div>
              </td>
              <td width="4%"></td>
              <td width="25%" style="padding:12px 8px;text-align:center;background:#f9faf9;border-radius:8px">
                <div style="font-size:22px;font-weight:700;color:#60a5fa">{rainwater_str}</div>
                <div style="font-size:11px;color:#888;margin-top:2px">kL/yr Rainwater</div>
              </td>
              <td width="4%"></td>
              <td width="25%" style="padding:12px 8px;text-align:center;background:#f9faf9;border-radius:8px">
                <div style="font-size:22px;font-weight:700;color:#a3e635">{food_str}</div>
                <div style="font-size:11px;color:#888;margin-top:2px">kg/yr Food</div>
              </td>
              <td width="4%"></td>
              <td width="25%" style="padding:12px 8px;text-align:center;background:#f9faf9;border-radius:8px">
                <div style="font-size:22px;font-weight:700;color:#4ade80">{co2_str}</div>
                <div style="font-size:11px;color:#888;margin-top:2px">tonnes CO₂/yr</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- CTA button -->
        <tr><td style="padding:8px 32px 32px;text-align:center">
          <a href="{report_url}"
             style="display:inline-block;background:#4ade80;color:#0a1a0e;font-size:15px;font-weight:700;padding:14px 36px;border-radius:100px;text-decoration:none;letter-spacing:-0.2px">
            View Your Full Report →
          </a>
          <p style="margin:16px 0 0;font-size:12px;color:#aaa">
            Or copy this link: <a href="{report_url}" style="color:#4ade80">{report_url}</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9faf9;padding:16px 32px;border-top:1px solid #eee">
          <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6">
            These estimates use MNRE solar data, IMD rainfall data, and CPCB waste norms.
            They are indicative — actual potential can only be confirmed after a professional site assessment.
            Questions? Write to <a href="mailto:gp@sus10.ai" style="color:#4ade80">gp@sus10.ai</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"Sus10 AI <{sender}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html"))

    ok = _smtp_send(sender, password, to_email, msg)
    if ok:
        logger.info(f"Report email sent → {to_email} (assessment={assessment_id})")
    return ok


def send_admin_notification(
    first_name,
    last_name,
    email,
    phone,
    phone_digits,
    city,
    overall_score,
    readiness_tier,
    assessment_id,
) -> bool:
    """Send a new-lead notification to the Sus10 admin inbox."""
    sender   = os.environ.get("GMAIL_SENDER")
    password = os.environ.get("GMAIL_APP_PASSWORD")
    admin    = os.environ.get("GMAIL_ADMIN_EMAIL", sender)
    app_url  = os.environ.get("PUBLIC_APP_URL", "https://sus10.ai")

    if not sender or not password:
        logger.warning("Admin notification skipped — Gmail creds missing")
        return False

    subject = (
        f"New Sus10 lead — {first_name} {last_name} · "
        f"{city} · {readiness_tier}"
    )

    html = f"""
<div style="font-family:sans-serif;max-width:480px;padding:20px">
  <h2 style="color:#1a3a0a">New Assessment Submitted</h2>
  <table style="border-collapse:collapse;width:100%">
    <tr><td style="padding:6px;color:#666">Name</td>
        <td style="padding:6px"><b>{first_name} {last_name}</b></td></tr>
    <tr><td style="padding:6px;color:#666">Email</td>
        <td style="padding:6px">{email}</td></tr>
    <tr><td style="padding:6px;color:#666">Phone</td>
        <td style="padding:6px">{phone}</td></tr>
    <tr><td style="padding:6px;color:#666">City</td>
        <td style="padding:6px">{city}</td></tr>
    <tr><td style="padding:6px;color:#666">Score</td>
        <td style="padding:6px">
          <b>{overall_score}/100 — {readiness_tier}</b>
        </td></tr>
  </table>
  <div style="margin-top:20px;display:flex;gap:12px">
    <a href="{app_url}/report/{assessment_id}"
       style="background:#22c55e;color:#fff;padding:10px 18px;
              border-radius:6px;text-decoration:none;font-size:14px">
      View Report
    </a>
    <a href="https://wa.me/91{phone_digits}"
       style="background:#25d366;color:#fff;padding:10px 18px;
              border-radius:6px;text-decoration:none;font-size:14px">
      WhatsApp
    </a>
  </div>
</div>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"Sus10 AI <{sender}>"
    msg["To"]      = admin
    msg.attach(MIMEText(html, "html"))

    ok = _smtp_send(sender, password, admin, msg)
    if ok:
        logger.info(f"Admin notification sent for assessment={assessment_id}")
    return ok
