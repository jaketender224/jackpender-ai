/**
 * jackpender.ai — Weekly SEO + GEO Updater
 *
 * 1. Searches the web for current SEO/GEO best practices via Tavily
 * 2. Analyses jackpender.ai's <head> with Claude
 * 3. Proposes conservative HEAD-only changes (meta tags, JSON-LD, title)
 * 4. Commits changes to a seo/weekly-YYYY-MM-DD branch + opens a GitHub PR
 * 5. Emails jack@jackpender.ai a 4-paragraph summary + PR link
 *
 * REQUIRED ENV VARS:
 *   ANTHROPIC_API_KEY
 *   TAVILY_API_KEY
 *   RESEND_API_KEY
 *   GH_TOKEN            (GitHub token with contents+pull-requests write)
 *
 * OPTIONAL:
 *   RESEND_FROM         (default: "SEO Update <onboarding@resend.dev>")
 *   SITE_DIR            (default: "." — repo root)
 */

import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ─── Config ──────────────────────────────────────────────────────────────────

const anthropic  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend     = new Resend(process.env.RESEND_API_KEY);
const SITE_DIR   = path.resolve(process.env.SITE_DIR || '.');
const TODAY      = new Date().toISOString().slice(0, 10);
const BRANCH     = `seo/weekly-${TODAY}`;
const EMAIL_TO   = 'jack@jackpender.ai';
const EMAIL_FROM = process.env.RESEND_FROM || 'SEO Update <onboarding@resend.dev>';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function tavilySearch(query) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: 'basic',
      max_results: 4,
      include_answer: true,
    }),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}: ${await res.text()}`);
  return res.json();
}

function git(cmd, opts = {}) {
  return execSync(cmd, { cwd: SITE_DIR, encoding: 'utf8', ...opts });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍 Weekly SEO update — ${TODAY}\n`);

  // 1. Research: 5 targeted queries covering Google SEO + GEO
  console.log('Searching for SEO/GEO trends...');
  const queries = [
    'Google SEO best practices 2026 personal portfolio website',
    'generative engine optimization GEO LLM AI search personal website 2026',
    'B2B SaaS account executive recruiter search personal brand website SEO 2026',
    'JSON-LD schema Person professional website best practices 2026',
    'ChatGPT Perplexity answer engine optimization personal brand visibility 2026',
  ];

  const results = await Promise.allSettled(queries.map(tavilySearch));
  const searchText = results.map((r, i) => {
    if (r.status === 'rejected') return `Query: ${queries[i]}\n[Search failed: ${r.reason}]`;
    const d = r.value;
    const tops = (d.results || []).slice(0, 3)
      .map(x => `  - ${x.title} (${x.url})\n    ${(x.content || '').slice(0, 200)}`)
      .join('\n');
    return `Query: ${queries[i]}\nAI Answer: ${d.answer || 'N/A'}\nTop results:\n${tops}`;
  }).join('\n\n---\n\n');

  // Collect URLs found in research for email
  const researchLinks = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => (r.value.results || []).slice(0, 2).map(x => x.url))
    .filter(Boolean)
    .slice(0, 6);

  // 2. Read current index.html head section
  const fullHtml     = fs.readFileSync(path.join(SITE_DIR, 'index.html'), 'utf8');
  const headMatch    = fullHtml.match(/<head[\s\S]*?<\/head>/i);
  const headSection  = headMatch ? headMatch[0] : fullHtml.slice(0, 4000);

  // 3. Claude analysis
  console.log('Analysing with Claude...');

  const systemPrompt = `You are an elite SEO consultant specialising in personal portfolio websites for B2B SaaS sales professionals. You output ONLY valid JSON with no markdown fences, no prose outside the JSON object.`;

  const userPrompt = `CURRENT SITE <head> (index.html):
\`\`\`html
${headSection}
\`\`\`

ABOUT JACK:
- Account Executive at Clerk Chat (AI-powered business messaging), San Francisco
- $1.5M ARR closed | 166% avg quota attainment | 80% win rate | Top 3 largest AE deals in company history
- Target audience: recruiters + businesses seeking elite B2B SaaS sales talent
- Open to: any B2B SaaS sales role, ideally at AI-forward companies
- Keywords to rank for: "Jack Pender", "account executive San Francisco", "top B2B SaaS AE", "AI-versed sales professional"
- Site URL: https://jackpender.ai
- Tone: sharp, confident, personal, ambitious — NOT corporate or generic

THIS WEEK'S RESEARCH:
${searchText}

Return a JSON object with EXACTLY this structure:
{
  "research_summary": "2-3 sentence summary of key SEO/GEO findings this week",
  "geo_insights": "1-2 sentences specifically on AI/LLM answer engine optimisation findings",
  "proposed_changes": [
    {
      "description": "what change + why in one sentence",
      "search": "EXACT verbatim string to find in index.html — must appear exactly once",
      "replace": "full replacement string"
    }
  ],
  "email_paragraphs": {
    "p1": "What you found this week — SEO and GEO trends (max 5 sentences)",
    "p2": "What you're proposing to change and why — or 'No changes needed this week, current SEO is already optimal based on this week's research.' if proposed_changes is empty (max 5 sentences)",
    "p3": "Impact assessment — how these changes affect Google ranking and AI visibility for recruiters (max 4 sentences)",
    "p4": "Anything else noteworthy — trends to watch, upcoming considerations, competitive landscape (max 4 sentences)"
  },
  "relevant_links": ["url1", "url2", "url3"]
}

RULES (non-negotiable):
- Only propose changes to <head> content: <title>, <meta>, <link rel="canonical">, JSON-LD <script type="application/ld+json">
- Maximum 3 proposed_changes per week
- Do NOT change Jack's name, employer, job title, stats, or site personality
- Do NOT suggest changes to CSS, JavaScript, or any visible page content
- The "search" field must be verbatim text that appears EXACTLY ONCE in the HTML
- If the site's SEO is already optimal this week, return an empty proposed_changes array`;

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const rawText = msg.content[0].text;
  let analysis;
  try {
    const jsonStr = rawText.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonStr) throw new Error('No JSON object found in response');
    analysis = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`Failed to parse Claude response: ${e.message}\n\nRaw response:\n${rawText}`);
  }

  // 4. Apply changes + create PR
  let changesApplied = [];
  let prUrl = null;

  if (analysis.proposed_changes?.length > 0) {
    // Create branch (handle already-exists case if workflow runs twice)
    try {
      git(`git checkout -b ${BRANCH}`);
    } catch {
      git(`git checkout ${BRANCH}`);
    }

    let html = fullHtml;
    for (const change of analysis.proposed_changes) {
      if (!change.search || !change.replace) {
        console.warn(`⚠️  Skipping malformed change: ${change.description}`);
        continue;
      }
      const occurrences = html.split(change.search).length - 1;
      if (occurrences === 0) {
        console.warn(`⚠️  Not found — skipped: ${change.description}`);
        continue;
      }
      if (occurrences > 1) {
        console.warn(`⚠️  Not unique (${occurrences}×) — skipped: ${change.description}`);
        continue;
      }
      html = html.replace(change.search, change.replace);
      changesApplied.push(change.description);
      console.log(`✅ Applied: ${change.description}`);
    }

    if (changesApplied.length > 0) {
      fs.writeFileSync(path.join(SITE_DIR, 'index.html'), html, 'utf8');
      git('git add index.html');
      git(`git commit -m "seo: weekly update ${TODAY}\n\n${changesApplied.map(c => '- ' + c).join('\n')}"`);
      git(`git push origin ${BRANCH}`);

      // Create PR (use temp file to avoid shell escaping issues)
      const prBody = [
        `## Weekly SEO Update — ${TODAY}`,
        '',
        analysis.research_summary,
        '',
        '### Changes applied',
        ...changesApplied.map(c => `- ${c}`),
        '',
        '### GEO insights',
        analysis.geo_insights || '_None this week_',
        '',
        '---',
        '**Approve:** merge this PR, or say **"push it"** in Claude Code.',
      ].join('\n');

      fs.writeFileSync('/tmp/seo-pr-body.md', prBody);

      try {
        const prOut = execSync(
          `gh pr create --title "SEO: weekly update ${TODAY}" --body-file /tmp/seo-pr-body.md --base main`,
          { cwd: SITE_DIR, encoding: 'utf8', env: { ...process.env } }
        );
        prUrl = prOut.trim();
        console.log('🔗 PR created:', prUrl);
      } catch (e) {
        // PR may already exist — try to fetch its URL
        try {
          prUrl = execSync(
            `gh pr view ${BRANCH} --json url -q .url`,
            { cwd: SITE_DIR, encoding: 'utf8', env: { ...process.env } }
          ).trim();
        } catch { /* swallow */ }
      }
    } else {
      // No valid changes — clean up branch
      git('git checkout main');
      try { git(`git branch -D ${BRANCH}`); } catch { /* swallow */ }
    }
  }

  // 5. Send email
  console.log('Sending email...');
  const { p1, p2, p3, p4 } = analysis.email_paragraphs;
  const allLinks = [...new Set([...researchLinks, ...(analysis.relevant_links || [])])].slice(0, 6);
  const linksHtml = allLinks
    .map(l => `<li><a href="${l}" style="color:#0066cc">${l}</a></li>`)
    .join('');

  const statusBlock = changesApplied.length > 0
    ? `<div style="background:#f0f9ff;border:1px solid #bae0fd;border-radius:6px;padding:16px 20px;margin:24px 0">
        <p style="margin:0 0 8px;font-weight:600;font-size:14px">📋 Changes ready for your review</p>
        <ul style="margin:0 0 12px;padding-left:20px;font-size:14px;line-height:1.6">${changesApplied.map(c => `<li>${c}</li>`).join('')}</ul>
        ${prUrl ? `<a href="${prUrl}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:9px 18px;border-radius:5px;text-decoration:none;font-size:14px;font-weight:500">→ Review PR on GitHub</a>` : ''}
        <p style="margin:12px 0 0;font-size:13px;color:#666">Reply <strong>push it</strong> in Claude Code — or merge the PR directly — to deploy to jackpender.ai.</p>
      </div>`
    : `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:14px 20px;margin:24px 0">
        <p style="margin:0;font-size:14px;color:#166534">✓ No changes needed this week — current SEO is already optimal based on latest research.</p>
      </div>`;

  const emailHtml = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f5f5f5;font-family:system-ui,-apple-system,sans-serif">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
  <div style="background:#0a0a0a;color:#fff;padding:28px 32px">
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;color:#666;text-transform:uppercase">jackpender.ai · Weekly Report</p>
    <h1 style="margin:0;font-size:20px;font-weight:600;letter-spacing:-0.3px">SEO + AI Visibility Update</h1>
    <p style="margin:6px 0 0;font-size:13px;color:#888">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
  </div>
  <div style="padding:32px">
    <p style="margin-top:0;line-height:1.7;color:#1a1a1a">${p1}</p>
    <p style="line-height:1.7;color:#1a1a1a">${p2}</p>
    ${statusBlock}
    <p style="line-height:1.7;color:#1a1a1a">${p3}</p>
    <p style="line-height:1.7;color:#1a1a1a;margin-bottom:0">${p4}</p>
    ${linksHtml ? `
    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #eee">
      <p style="font-size:13px;color:#555;margin:0 0 8px;font-weight:500">Research sources this week:</p>
      <ul style="padding-left:20px;margin:0;font-size:13px;line-height:1.8">${linksHtml}</ul>
    </div>` : ''}
  </div>
  <div style="background:#f9f9f9;padding:14px 32px;font-size:12px;color:#aaa;border-top:1px solid #eee">
    jackpender.ai automated SEO monitor · Runs every Sunday 5 PM PST
  </div>
</div>
</body></html>`;

  await resend.emails.send({
    from: EMAIL_FROM,
    to:   EMAIL_TO,
    subject: `SEO Update — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} | jackpender.ai`,
    html: emailHtml,
  });

  console.log(`\n✅ Done. Email sent to ${EMAIL_TO}`);
  if (prUrl) console.log(`🔗 PR: ${prUrl}`);
  else if (changesApplied.length === 0) console.log('ℹ️  No changes needed this week.');
}

// ─── Error handler ────────────────────────────────────────────────────────────

main().catch(async (err) => {
  console.error('\n❌ SEO update failed:', err.message);
  try {
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.RESEND_FROM || 'SEO Update <onboarding@resend.dev>',
      to:   'jack@jackpender.ai',
      subject: `⚠️ SEO Update Failed — ${TODAY}`,
      html: `<div style="font-family:sans-serif;max-width:500px;margin:32px auto">
        <h2 style="color:#dc2626">SEO Update Script Failed</h2>
        <p>The weekly SEO update for jackpender.ai encountered an error:</p>
        <pre style="background:#f5f5f5;padding:16px;border-radius:4px;font-size:13px;overflow-x:auto">${err.message}</pre>
        <p style="color:#888;font-size:13px">Check the GitHub Actions log for the full stack trace.</p>
      </div>`,
    });
  } catch (_) { /* swallow */ }
  process.exit(1);
});
