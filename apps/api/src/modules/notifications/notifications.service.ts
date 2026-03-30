import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Resend } from 'resend';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly baseUrl: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.EMAIL_FROM ?? 'noreply@esourcing.com';
    this.baseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';

    if (apiKey && apiKey !== 'placeholder') {
      this.resend = new Resend(apiKey);
    } else {
      this.resend = null;
      this.logger.warn('RESEND_API_KEY not configured — emails will be logged only');
    }
  }

  @OnEvent('invitation.sent')
  async handleInvitationSent(payload: {
    invitationId: string;
    eventId: string;
    orgId: string;
    supplierEmail: string;
    supplierName: string;
    eventTitle: string;
    eventRefNumber: string;
    token: string;
    message?: string;
  }) {
    const portalUrl = `${this.baseUrl}/supplier/invite/${payload.token}`;

    const html = `
      <h2>You have been invited to submit a bid</h2>
      <p>Dear ${payload.supplierName},</p>
      <p>You have been invited to participate in the following procurement event:</p>
      <p><strong>${payload.eventRefNumber} — ${payload.eventTitle}</strong></p>
      ${payload.message ? `<p><em>"${payload.message}"</em></p>` : ''}
      <p>
        <a href="${portalUrl}" style="background:#0F3557;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;">
          View Invitation &amp; Submit Bid
        </a>
      </p>
      <p style="color:#666;font-size:12px;">
        Or copy this link: ${portalUrl}
      </p>
    `;

    await this.send({
      to: payload.supplierEmail,
      subject: `Invitation to Bid: ${payload.eventRefNumber} — ${payload.eventTitle}`,
      html,
    });
  }

  @OnEvent('bid.submitted')
  async handleBidSubmitted(payload: {
    bidId: string;
    eventId: string;
    orgId: string;
    supplierId: string;
  }) {
    this.logger.log(
      `Bid submitted: bidId=${payload.bidId} eventId=${payload.eventId}`,
    );
    // Buyer notification email will be added in Sprint 4 when we have buyer email on the event
  }

  private async send(opts: { to: string; subject: string; html: string }) {
    if (!this.resend) {
      this.logger.log(`[EMAIL STUB] To: ${opts.to} | Subject: ${opts.subject}`);
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
      this.logger.log(`Email sent to ${opts.to}: ${opts.subject}`);
    } catch (err) {
      // Swallow — email failure must never break main flow (ADR-005)
      this.logger.error(`Failed to send email to ${opts.to}`, err);
    }
  }
}
