// Contact form → e-mail to the infrastructure team (via Resend). Reply-To is the visitor, so "Antworten" in Outlook
// goes straight back to them. Secrets (set by the team): RESEND_API_KEY, CONTACT_FROM (address on a verified domain).
const TO = 'infrastructure@l-mobile.com';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  let f: Record<string, unknown>;
  try { f = await req.json(); } catch { return json({ error: 'invalid' }, 400); }
  if (f.website) return json({ ok: true }); // honeypot: bots fill the hidden field

  const d = {
    name: clip(f.name, 120), company: clip(f.company, 160), email: clip(f.email, 200),
    phone: clip(f.phone, 60), topic: clip(f.topic, 80), message: clip(f.message, 5000), page: clip(f.page, 200),
  };
  if (!d.name || !d.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return json({ error: 'invalid' }, 400);

  const key = Deno.env.get('RESEND_API_KEY'), from = Deno.env.get('CONTACT_FROM');
  if (!key || !from) return json({ error: 'not_configured' }, 503);

  const rows: [string, string][] = [
    ['Name', d.name], ['Firma / Schule', d.company || '–'], ['E-Mail', d.email], ['Telefon', d.phone || '–'], ['Thema', d.topic || '–'],
  ];
  const html = `<!doctype html><html><body style="margin:0;background:#f3f5f8;font-family:Segoe UI,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0">
<tr><td style="background:#009acd;color:#fff;padding:18px 24px;font-size:18px;font-weight:600">Neue Anfrage über die Website</td></tr>
<tr><td style="padding:20px 24px 8px;font-size:15px"><strong>${esc(d.topic || 'Anfrage')}</strong> von ${esc(d.name)}${d.company ? ` (${esc(d.company)})` : ''}</td></tr>
<tr><td style="padding:8px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#64748b;width:140px;vertical-align:top">${k}</td><td style="padding:6px 0">${
    k === 'E-Mail' ? `<a href="mailto:${esc(v)}" style="color:#007ea8">${esc(v)}</a>` : k === 'Telefon' && v !== '–' ? `<a href="tel:${esc(v.replace(/[^\d+]/g, ''))}" style="color:#007ea8">${esc(v)}</a>` : esc(v)
  }</td></tr>`).join('')}
</table></td></tr>
<tr><td style="padding:12px 24px 4px;color:#64748b;font-size:13px">Nachricht</td></tr>
<tr><td style="padding:0 24px 20px"><div style="background:#f8fafc;border-left:3px solid #009acd;padding:12px 14px;font-size:14px;line-height:1.55;white-space:pre-wrap">${esc(d.message)}</div></td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px">Gesendet über das Kontaktformular${d.page ? ` auf ${esc(d.page)}` : ''}. „Antworten“ geht direkt an ${esc(d.email)}.</td></tr>
</table></td></tr></table></body></html>`;
  const text = [...rows.map(([k, v]) => `${k}: ${v}`), '', 'Nachricht:', d.message, '', d.page ? `Seite: ${d.page}` : ''].join('\n');

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [TO], reply_to: d.email, subject: `Website-Anfrage: ${d.topic || 'Allgemein'} – ${d.name}${d.company ? ` (${d.company})` : ''}`, html, text }),
  });
  if (!r.ok) { console.error('resend', r.status, await r.text()); return json({ error: 'send_failed' }, 502); }
  return json({ ok: true });
});
