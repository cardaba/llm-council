/**
 * Download helpers for exporting council deliberations as markdown files.
 */

const MAX_FILE_BYTES = 500 * 1024;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;

export const ATTACHMENT_LIMITS = {
  perFile: MAX_FILE_BYTES,
  total: MAX_TOTAL_BYTES,
};

export function triggerDownload(filename, content, mimeType = 'text/markdown') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slugify(s, maxLen = 40) {
  return (s || 'untitled')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, maxLen) || 'untitled';
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/**
 * Build markdown for the chairman's final answer only.
 */
export function buildFinalAnswerMarkdown({ question, finalResponse }) {
  const lines = [
    '# LLM Council — Final Answer',
    '',
    `**Question**: ${question || '_(unknown)_'}`,
    '',
    `**Chairman**: \`${finalResponse?.model || 'unknown'}\``,
    '',
    '---',
    '',
    finalResponse?.response || '_(no response)_',
    '',
  ];
  return lines.join('\n');
}

/**
 * Build markdown for the entire deliberation: question + Stage 1 + Stage 2 + aggregates + Stage 3.
 */
export function buildFullDeliberationMarkdown({ question, stage1, stage2, stage3, metadata }) {
  const lines = [
    '# LLM Council Deliberation',
    '',
    `**Question**: ${question || '_(unknown)_'}`,
    '',
    `**Exported**: ${new Date().toISOString()}`,
    '',
    '---',
    '',
    '## Stage 1 — Individual Responses',
    '',
  ];

  (stage1 || []).forEach((r) => {
    lines.push(`### \`${r.model}\``, '', r.response || '_(no response)_', '');
  });

  lines.push('## Stage 2 — Peer Rankings', '');
  (stage2 || []).forEach((r) => {
    lines.push(`### Ranking by \`${r.model}\``, '', r.ranking || '_(no ranking)_', '');
    if (r.parsed_ranking?.length) {
      lines.push(`*Parsed*: ${r.parsed_ranking.join(' → ')}`, '');
    }
  });

  const agg = metadata?.aggregate_rankings;
  if (agg?.length) {
    lines.push('### Aggregate Rankings', '', '| # | Model | Avg Rank | Votes |', '|---|---|---|---|');
    agg.forEach((row, i) => {
      lines.push(`| ${i + 1} | \`${row.model}\` | ${row.average_rank} | ${row.rankings_count} |`);
    });
    lines.push('');
  }

  lines.push('## Stage 3 — Chairman Synthesis', '');
  lines.push(`**Chairman**: \`${stage3?.model || 'unknown'}\``, '');
  lines.push(stage3?.response || '_(no synthesis)_', '');

  return lines.join('\n');
}

export function buildFinalAnswerFilename(question) {
  return `council-answer-${slugify(question)}-${timestamp()}.md`;
}

export function buildDeliberationFilename(question) {
  return `council-deliberation-${slugify(question)}-${timestamp()}.md`;
}

/**
 * Read a File object as UTF-8 text, returning a Promise.
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Render the user's prompt with attached files prepended in clearly-marked blocks.
 */
export function buildPromptWithAttachments(prompt, attachments) {
  if (!attachments?.length) return prompt;
  const parts = attachments.map(
    (att) => `--- FILE: ${att.name} ---\n${att.content}\n--- END FILE ---`
  );
  parts.push('', prompt);
  return parts.join('\n\n');
}
