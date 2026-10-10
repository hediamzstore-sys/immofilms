import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import type { Lead } from './contact.service';

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => HTML_ENTITIES[c] ?? c);

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (!host || !user || !pass) {
      this.logger.warn('SMTP non configuré (SMTP_HOST / SMTP_USER / SMTP_PASS).');
      return;
    }
    const port = Number(this.config.get('SMTP_PORT', 465));
    this.transporter = createTransport({
      host,
      port,
      secure: String(this.config.get('SMTP_SECURE', port === 465)) === 'true',
      auth: { user, pass },
    });
    this.transporter
      .verify()
      .then(() => this.logger.log(`SMTP prêt (${host}:${port})`))
      .catch((e: Error) => this.logger.error(`Connexion SMTP impossible : ${e.message}`));
  }

  isConfigured(): boolean {
    return !!this.transporter;
  }

  async sendLead(lead: Lead): Promise<void> {
    if (!this.transporter) return;
    const user = this.config.get<string>('SMTP_USER')!;
    const from = this.config.get<string>('MAIL_FROM') || user;
    const to = this.config.get<string>('MAIL_TO') || this.config.get<string>('CONTACT_EMAIL') || user;

    const rows: [string, string][] = [
      ['Nom', lead.nom],
      ['Téléphone', lead.telephone],
      ['Email', lead.email],
      ...(lead.formule ? ([['Formule', lead.formule]] as [string, string][]) : []),
      ['Date', new Date(lead.date).toLocaleString('fr-CH', { timeZone: 'Europe/Zurich' })],
    ];

    const text =
      rows.map(([k, v]) => `${k} : ${v}`).join('\n') + `\n\nMessage :\n${lead.message || '(aucun message)'}`;

    const html = `
<div style="font-family:Arial,sans-serif;background:#07070a;padding:32px;color:#f6f3ec">
  <div style="max-width:560px;margin:0 auto;background:#111118;border:1px solid #3a3122;border-radius:14px;overflow:hidden">
    <div style="padding:22px 28px;border-bottom:1px solid #2a2a33">
      <div style="font-family:Georgia,serif;font-size:22px;letter-spacing:3px">IMMO<span style="color:#d8b86c">FILMS</span></div>
      <div style="font-size:12px;color:#a9a59b;letter-spacing:2px;text-transform:uppercase;margin-top:6px">Nouvelle demande de démo</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:12px 28px;color:#a9a59b;width:120px;border-bottom:1px solid #1d1d25">${esc(k)}</td><td style="padding:12px 28px;border-bottom:1px solid #1d1d25">${esc(v)}</td></tr>`,
        )
        .join('')}
    </table>
    <div style="padding:22px 28px;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(lead.message || '(aucun message)')}</div>
    <div style="padding:0 28px 26px">
      <a href="mailto:${esc(lead.email)}" style="display:inline-block;background:#c9a45c;color:#1a1307;padding:12px 20px;border-radius:30px;text-decoration:none;font-weight:bold;font-size:13px">Répondre à ${esc(lead.nom)}</a>
    </div>
  </div>
</div>`;

    await this.transporter.sendMail({
      from,
      to,
      replyTo: `${lead.nom} <${lead.email}>`,
      subject: `Démo gratuite — ${lead.nom}${lead.formule ? ` (${lead.formule})` : ''}`,
      text,
      html,
    });
  }
}
