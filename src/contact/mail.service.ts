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

export type MailState = 'non-configure' | 'verification' | 'pret' | 'erreur';

/** Nettoie une variable saisie dans hPanel (espaces, guillemets autour). */
const clean = (v: unknown): string => {
  let s = String(v ?? '').trim();
  if (s.length >= 2 && ((s[0] === '"' && s.endsWith('"')) || (s[0] === "'" && s.endsWith("'")))) {
    s = s.slice(1, -1);
  }
  return s;
};

const mask = (email: string): string =>
  email.replace(/^(.)([^@]*)(@.*)$/, (_m, a: string, b: string, c: string) => a + '*'.repeat(Math.min(b.length, 6)) + c);

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;
  private state: MailState = 'non-configure';
  private lastError = '';
  private lastSuccessAt = '';
  private active = { host: '', port: 0, secure: false, user: '' };

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    void this.setup();
  }

  /** État de l'envoi d'emails, sans aucun secret, pour /api/health. */
  status() {
    const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter((k) => !clean(this.config.get(k)));
    return {
      etat: this.state,
      variablesManquantes: missing,
      serveur: this.active.host ? `${this.active.host}:${this.active.port}${this.active.secure ? ' (SSL)' : ' (STARTTLS)'}` : null,
      compte: this.active.user ? mask(this.active.user) : null,
      destinataire: mask(this.recipient()),
      derniereErreur: this.lastError || null,
      dernierEnvoiReussi: this.lastSuccessAt || null,
    };
  }

  private recipient(): string {
    return clean(this.config.get('MAIL_TO')) || clean(this.config.get('CONTACT_EMAIL')) || clean(this.config.get('SMTP_USER'));
  }

  private build(host: string, port: number, secure: boolean, user: string, pass: string): Transporter {
    return createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 20_000,
    });
  }

  private async setup(): Promise<void> {
    const host = clean(this.config.get('SMTP_HOST')) || 'smtp.hostinger.com';
    const user = clean(this.config.get('SMTP_USER'));
    const pass = clean(this.config.get('SMTP_PASS'));
    if (!user || !pass) {
      this.state = 'non-configure';
      this.logger.warn('SMTP non configuré (SMTP_USER / SMTP_PASS manquant).');
      return;
    }
    const port = Number(clean(this.config.get('SMTP_PORT')) || 465);
    const secureRaw = clean(this.config.get('SMTP_SECURE')).toLowerCase();
    const secure = secureRaw ? secureRaw === 'true' : port === 465;

    // Essai avec la configuration demandée, puis repli automatique 465 SSL <-> 587 STARTTLS.
    const attempts: Array<[number, boolean]> = [[port, secure]];
    if (!(port === 465 && secure)) attempts.push([465, true]);
    if (!(port === 587 && !secure)) attempts.push([587, false]);

    this.state = 'verification';
    for (const [p, s] of attempts) {
      const t = this.build(host, p, s, user, pass);
      try {
        await t.verify();
        this.transporter = t;
        this.active = { host, port: p, secure: s, user };
        this.state = 'pret';
        this.lastError = '';
        this.logger.log(`SMTP prêt (${host}:${p}, ${s ? 'SSL' : 'STARTTLS'})`);
        return;
      } catch (e) {
        const msg = (e as Error).message;
        this.lastError = `${host}:${p} → ${msg}`;
        this.logger.error(`Connexion SMTP impossible (${host}:${p}) : ${msg}`);
        // Identifiants refusés : inutile d'essayer un autre port.
        if (/auth|535|credentials|password|login/i.test(msg)) break;
      }
    }
    this.state = 'erreur';
    this.active = { host, port, secure, user };
  }

  isConfigured(): boolean {
    return !!this.transporter;
  }

  async sendLead(lead: Lead): Promise<void> {
    if (!this.transporter) return;
    const user = this.active.user;
    const from = clean(this.config.get('MAIL_FROM')) || `ImmoFilms.ch <${user}>`;
    const to = this.recipient();

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

    try {
      await this.transporter.sendMail({
        from,
        to,
        replyTo: `${lead.nom} <${lead.email}>`,
        subject: `Démo gratuite — ${lead.nom}${lead.formule ? ` (${lead.formule})` : ''}`,
        text,
        html,
      });
      this.lastSuccessAt = new Date().toISOString();
      this.lastError = '';
    } catch (e) {
      this.lastError = `envoi → ${(e as Error).message}`;
      this.state = 'erreur';
      throw e;
    }
  }
}
