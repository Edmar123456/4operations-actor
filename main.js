import { Actor } from 'apify';
import { PuppeteerCrawler } from 'crawlee';
import { createTransport } from 'nodemailer';

// ── CONFIGURAÇÃO ──────────────────────────────────────────
const CONFIG = {
    maxPages:       20,
    resultsPerPage: 50,
    emailTo:        'recrutamento@4operations.pt',   // email do cliente
    emailFrom:      'leads@4operations-monitor.com',
    seenIdsKey:     'SEEN_JOB_IDS',
};

const EMAIL_RE = /[a-zA-Z0-9_.+\-]+@[a-zA-Z0-9\-]+\.[a-zA-Z0-9\-.]+/g;
const BL_EMAIL = ['noreply','no-reply','donotreply','example','privacy','test@'];

function cleanEmails(raw) {
    return [...new Set(
        (raw || [])
            .map(e => e.toLowerCase().trim())
            .filter(e => !BL_EMAIL.some(b => e.includes(b)) && e.split('@')[1]?.includes('.'))
    )];
}

function extractEmails(text) {
    if (!text) return [];
    return cleanEmails((text.match(EMAIL_RE) || []));
}

function parseJob(job) {
    const texts = [
        job.email, job.contactEmail,
        job.description, job.howToApply, job.body
    ].filter(Boolean).join(' ');

    const emails = cleanEmails([
        ...[job.email, job.contactEmail].filter(Boolean),
        ...extractEmails(texts)
    ]);

    return {
        id:       String(job.id || job.jobId || ''),
        title:    job.title || job.jobTitle || job.position || '',
        company:  job.company || job.employer || job.companyName || '',
        country:  job.country || job.countryCode || '',
        city:     job.city || job.location || '',
        emails:   emails,
        phone:    job.phone || job.telephone || '',
        website:  job.website || job.companyWebsite || '',
        contract: job.contractType || job.contract || '',
        url:      job.url || job.jobUrl || job.detailUrl || '',
        date:     new Date().toISOString().slice(0, 10),
    };
}

// ── EMAIL HTML ────────────────────────────────────────────
function buildEmailHTML(leads, date) {
    const withEmail = leads.filter(l => l.emails.length);
    const rows = leads.map(l => `
        <tr style="border-bottom:1px solid #eee">
            <td style="padding:12px 8px">
                <strong style="color:#1a1a2e">${l.company || '—'}</strong><br>
                <span style="font-size:12px;color:#666">${l.title}</span>
            </td>
            <td style="padding:12px 8px">
                ${l.emails.length
                    ? l.emails.map(e => `<span style="background:#e8f5e9;color:#1b5e20;border-radius:4px;padding:2px 8px;font-size:12px;display:inline-block;margin:1px">${e}</span>`).join('')
                    : '<span style="color:#999;font-size:12px;font-style:italic">sem email</span>'
                }
            </td>
            <td style="padding:12px 8px;font-size:12px;color:#666">${l.phone || '—'}</td>
            <td style="padding:12px 8px">
                <span style="background:#f0f4ff;color:#1565c0;border-radius:4px;padding:2px 8px;font-size:11px">${l.country}</span>
                <span style="font-size:11px;color:#999"> ${l.city}</span>
            </td>
            <td style="padding:12px 8px">
                ${l.url ? `<a href="${l.url}" style="color:#e8500a;font-size:12px;text-decoration:none">ver vaga ↗</a>` : '—'}
            </td>
        </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:900px;margin:0 auto">

  <!-- HEADER -->
  <div style="background:linear-gradient(135deg,#1a1a2e,#e8500a);border-radius:12px 12px 0 0;padding:28px 32px">
    <div style="font-size:22px;font-weight:700;color:#fff">4Operations</div>
    <div style="font-size:13px;color:rgba(255,255,255,.7);margin-top:4px">Lead Monitor — Relatório Diário</div>
    <div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:8px">${date}</div>
  </div>

  <!-- STATS -->
  <div style="background:#fff;padding:24px 32px;display:flex;gap:24px;border-bottom:1px solid #eee">
    <div style="text-align:center;flex:1">
      <div style="font-size:32px;font-weight:700;color:#1a1a2e">${leads.length}</div>
      <div style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.05em">Vagas Novas</div>
    </div>
    <div style="text-align:center;flex:1">
      <div style="font-size:32px;font-weight:700;color:#22c55e">${withEmail.length}</div>
      <div style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.05em">Com Email</div>
    </div>
    <div style="text-align:center;flex:1">
      <div style="font-size:32px;font-weight:700;color:#e8500a">${leads.length ? Math.round(withEmail.length/leads.length*100) : 0}%</div>
      <div style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.05em">Taxa Captura</div>
    </div>
    <div style="text-align:center;flex:1">
      <div style="font-size:32px;font-weight:700;color:#3b82f6">${new Set(leads.map(l=>l.country).filter(Boolean)).size}</div>
      <div style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.05em">Países</div>
    </div>
  </div>

  <!-- TABLE -->
  <div style="background:#fff;padding:0 0 24px 0;border-radius:0 0 12px 12px;overflow:hidden">
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f8f9fa">
          <th style="padding:12px 8px;text-align:left;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.05em">Empresa / Título</th>
          <th style="padding:12px 8px;text-align:left;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.05em">Email</th>
          <th style="padding:12px 8px;text-align:left;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.05em">Telefone</th>
          <th style="padding:12px 8px;text-align:left;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.05em">País</th>
          <th style="padding:12px 8px;text-align:left;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.05em">Link</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <!-- FOOTER -->
  <div style="text-align:center;padding:20px;color:#999;font-size:12px">
    4Operations Lead Monitor · Gerado automaticamente às 7h00<br>
    <a href="https://4operations.pt" style="color:#e8500a">4operations.pt</a>
  </div>

</div>
</body>
</html>`;
}

// ── ENVIAR EMAIL ──────────────────────────────────────────
async function sendEmail(leads, smtpConfig) {
    if (!smtpConfig?.host) {
        console.log('SMTP não configurado — a saltar email.');
        return;
    }

    const transporter = createTransport({
        host:   smtpConfig.host,
        port:   smtpConfig.port || 587,
        secure: false,
        auth: {
            user: smtpConfig.user,
            pass: smtpConfig.pass,
        },
    });

    const date     = new Date().toLocaleDateString('pt-PT', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const withEmail= leads.filter(l => l.emails.length).length;

    await transporter.sendMail({
        from:    CONFIG.emailFrom,
        to:      smtpConfig.to || CONFIG.emailTo,
        subject: `📋 ${leads.length} novas vagas EURES — ${withEmail} com email | ${new Date().toLocaleDateString('pt-PT')}`,
        html:    buildEmailHTML(leads, date),
    });

    console.log(`✅ Email enviado para ${smtpConfig.to || CONFIG.emailTo}`);
}

// ── ACTOR PRINCIPAL ───────────────────────────────────────
await Actor.init();

const input = await Actor.getInput() || {};
const {
    maxPages       = CONFIG.maxPages,
    resultsPerPage = CONFIG.resultsPerPage,
    smtpHost       = '',
    smtpPort       = 587,
    smtpUser       = '',
    smtpPass       = '',
    emailTo        = CONFIG.emailTo,
    keywords       = [],
    countries      = [],
} = input;

// Carregar IDs já vistos
const store   = await Actor.openKeyValueStore();
const seenRaw = await store.getValue(CONFIG.seenIdsKey);
const seenIds = new Set(Array.isArray(seenRaw) ? seenRaw : []);
console.log(`IDs já vistos: ${seenIds.size}`);

const newLeads  = [];
const newIds    = new Set();

// Scraping do EURES via API interna
const EURES_API = 'https://europa.eu/eures/portal/jv-se/api/jv-search/search';
const DETAIL_API= 'https://europa.eu/eures/portal/jv-se/api/jv-search/jv/';

const crawler = new PuppeteerCrawler({
    maxRequestsPerCrawl: maxPages,
    async requestHandler({ page, request }) {
        const pageNum = request.userData.page || 1;
        console.log(`A processar página ${pageNum}...`);

        // Chamar API interna via fetch dentro da página
        const result = await page.evaluate(async (url, payload) => {
            const r = await fetch(url, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });
            return r.json();
        }, EURES_API, {
            selectedPage:  pageNum,
            pageSize:      resultsPerPage,
            sortSearch:    'MOST_RECENT',
            lang:          'pt',
            keywords,
            countries,
        });

        const jobs = result.jobVacancyList || result.jobs || result.results || [];
        console.log(`  Página ${pageNum}: ${jobs.length} vagas`);

        for (const job of jobs) {
            const jid = String(job.id || job.header?.id || '');
            if (!jid || seenIds.has(jid)) continue;

            // Buscar detalhes
            const detail = await page.evaluate(async (url, id) => {
                const r = await fetch(url + id);
                return r.json();
            }, DETAIL_API, jid);

            if (detail) {
                const jv      = detail.jobVacancy || detail;
                const parsed  = parseJob({
                    ...jv,
                    ...jv.header,
                    ...jv.employer,
                    ...jv.contactInfo,
                    ...(jv.positions?.[0] || {}),
                    description: jv.description,
                    howToApply:  jv.howToApply,
                });
                parsed.id = jid;

                newLeads.push(parsed);
                newIds.add(jid);

                if (parsed.emails.length) {
                    console.log(`  ✉ ${parsed.company} → ${parsed.emails.join(', ')}`);
                }

                await new Promise(r => setTimeout(r, 300));
            }
        }
    },
});

// Gerar URLs para cada página
const requests = Array.from({ length: maxPages }, (_, i) => ({
    url:      'https://europa.eu/eures/portal/jv-se/search',
    userData: { page: i + 1 },
}));

await crawler.run(requests);

console.log(`\n✅ Total de leads novos: ${newLeads.length}`);
console.log(`   Com email: ${newLeads.filter(l => l.emails.length).length}`);

// Guardar leads no dataset
await Actor.pushData(newLeads);

// Actualizar IDs vistos
const allSeen = [...seenIds, ...newIds];
await store.setValue(CONFIG.seenIdsKey, allSeen);
console.log(`IDs guardados: ${allSeen.length}`);

// Enviar email se houver leads novos
if (newLeads.length > 0 && smtpHost) {
    await sendEmail(newLeads, {
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        pass: smtpPass,
        to:   emailTo,
    });
}

await Actor.exit();
