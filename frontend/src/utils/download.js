/**
 * Download helpers for exporting council deliberations as markdown files.
 */

const MAX_FILE_BYTES = 500 * 1024;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;

// 750KB cap per critique slot — CONTEXT.md D-04 + 05-02 backend lock (MAX_CRITIQUE_FILE_BYTES).
// DO NOT raise the existing MAX_FILE_BYTES (fresh-prompt attachments stay at 500KB).
export const MAX_CRITIQUE_FILE_BYTES = 750 * 1024;

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
 *
 * D-18: when Stage 4 refinement fired (`stage4.response` truthy), the export
 * MUST contain the refined response, not the original chairman synthesis.
 * The title is suffixed with "(refined)" and a footnote captures the critic
 * score + concern that motivated the refinement.
 *
 * @param {string} [mode] - 'critique' switches the input label to
 *   "Critique instruction"; otherwise fresh-prompt label "Question" is used.
 */
export function buildFinalAnswerMarkdown({ question, finalResponse, stage4, mode }) {
  const isRefined = !!stage4?.response;
  const isCritique = mode === 'critique';
  const inputLabel = isCritique ? 'Critique instruction' : 'Question';
  const responseText = isRefined
    ? stage4.response
    : finalResponse?.response || '_(no response)_';

  const lines = [
    isRefined
      ? '# LLM Council — Final Answer (refined)'
      : '# LLM Council — Final Answer',
    '',
    `**${inputLabel}**: ${question || '_(unknown)_'}`,
    '',
    `**Chairman**: \`${finalResponse?.model || 'unknown'}\`${
      isRefined ? ' (with Stage 4 refinement)' : ''
    }`,
    '',
    '---',
    '',
    responseText,
    '',
  ];

  if (isRefined && stage4.critic_score != null) {
    lines.push(
      `<sub>Refined after critic scored synthesis ${stage4.critic_score}/10. Reason: ${
        stage4.primary_concern || '_(unknown)_'
      }.</sub>`,
      ''
    );
  }

  return lines.join('\n');
}

/**
 * Build markdown for the entire deliberation: question + Stage 1 + Stage 2 +
 * aggregates + Stage 3 + (optional) Critic + Stage 4.
 *
 * D-18: when Stage 4 fired, append a `## Critic` section with the score and
 * primary concern, followed by a `## Stage 4 — Refinement` section with the
 * refined response. The original Stage 3 chairman synthesis is preserved
 * above (full audit trail).
 *
 * `messageMetadata` is the persisted metadata dict from the backend's
 * `message_metadata` SSE event (profile + models + chairman + stage4_triggered);
 * when present a footer is appended documenting the run profile.
 *
 * @param {string} [mode] - 'critique' switches labels (input label and
 *   Stage 1 header); otherwise fresh-prompt labels are used.
 * @param {Object} [externalResearch] - {modelId: {filename, content,
 *   size_bytes}}; appended as a '## Source materials' section when present
 *   AND mode is critique (or dual-signal fallback: any entries imply critique).
 */
export function buildFullDeliberationMarkdown({
  question,
  stage1,
  stage2,
  stage3,
  stage4,
  metadata,
  critic,
  messageMetadata,
  mode,
  externalResearch,
}) {
  // Dual-signal: prefer explicit `mode`, fall back to presence of research
  // entries. Defends against future callers that forget to pass `mode`.
  const isCritique =
    mode === 'critique' ||
    (externalResearch && Object.keys(externalResearch).length > 0);
  const inputLabel = isCritique ? 'Critique instruction' : 'Question';
  const stage1Header = isCritique
    ? '## Stage 1 — Individual Critiques'
    : '## Stage 1 — Individual Responses';

  const lines = [
    '# LLM Council Deliberation',
    '',
    `**${inputLabel}**: ${question || '_(unknown)_'}`,
    '',
    `**Exported**: ${new Date().toISOString()}`,
    '',
    '---',
    '',
  ];

  // Source materials — only when this is a critique conversation with
  // at least one uploaded research file. Full content (no truncation): files
  // were capped at 750KB server-side per CRIT-08 / D-04, and the export is
  // an audit artifact (full inclusion is the point).
  if (isCritique && externalResearch && Object.keys(externalResearch).length > 0) {
    lines.push('## Source materials', '');
    Object.entries(externalResearch).forEach(([modelId, entry]) => {
      const sizeKb = entry?.size_bytes != null ? (entry.size_bytes / 1024).toFixed(1) : '?';
      lines.push(
        `### \`${modelId}\` — ${entry?.filename || '_(unknown)_'} (${sizeKb}KB)`,
        '',
        entry?.content || '_(no content)_',
        ''
      );
    });
    lines.push('---', '');
  }

  lines.push(stage1Header, '');

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

  // Critic section: present when EITHER the live `critic` event came in (UI)
  // or when stage4 was persisted with critic_score embedded (reload from disk).
  if (critic || stage4) {
    lines.push('## Critic', '');
    if (critic) {
      lines.push(`Score: ${critic.score ?? '?'}/10`, '');
      lines.push(`Primary concern: ${critic.concern || '_(unknown)_'}`, '');
    } else {
      lines.push(`Score: ${stage4.critic_score ?? '?'}/10`, '');
      lines.push(`Primary concern: ${stage4.primary_concern || '_(unknown)_'}`, '');
    }
    lines.push('');
  }

  if (stage4) {
    lines.push('## Stage 4 — Refinement', '');
    lines.push(stage4.response || '_(no refined answer)_', '');
  }

  // Optional profile footer — surfaces what the user actually ran.
  if (messageMetadata?.profile) {
    const profileLabel =
      { fast: 'Fast', quality: 'Quality', quality_research: 'Quality+Research' }[
        messageMetadata.profile
      ] || messageMetadata.profile;
    const count = messageMetadata.models?.length ?? 0;
    const stage4Note = messageMetadata.stage4_triggered ? ' • Stage 4 fired' : '';
    lines.push('---', '');
    lines.push(
      `<sub>Profile: **${profileLabel}** • ${count} model${
        count === 1 ? '' : 's'
      } • Chairman: \`${messageMetadata.chairman || 'unknown'}\`${stage4Note}</sub>`,
      ''
    );
  }

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
