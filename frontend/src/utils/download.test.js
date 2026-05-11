import {
  buildFinalAnswerMarkdown,
  buildFullDeliberationMarkdown,
  buildFinalAnswerFilename,
  buildDeliberationFilename,
  buildPromptWithAttachments,
} from './download';

describe('buildFinalAnswerMarkdown', () => {
  it('produces a markdown document with the question and the chairman response when stage4 is absent', () => {
    const md = buildFinalAnswerMarkdown({
      question: 'What is the capital of France?',
      finalResponse: { model: 'anthropic/claude-opus-4.7', response: 'Paris.' },
      stage4: null,
    });

    expect(md).toContain('# LLM Council — Final Answer');
    expect(md).not.toContain('(refined)');
    expect(md).toContain('What is the capital of France?');
    expect(md).toContain('Paris.');
    expect(md).toContain('anthropic/claude-opus-4.7');
  });

  it('uses the refined stage4 response (not the original) when stage4.response is truthy', () => {
    const md = buildFinalAnswerMarkdown({
      question: 'Q',
      finalResponse: { model: 'm1', response: 'ORIGINAL' },
      stage4: { response: 'REFINED', critic_score: 5, primary_concern: 'unclear scope' },
    });

    expect(md).toContain('(refined)');
    expect(md).toContain('REFINED');
    expect(md).not.toContain('ORIGINAL');
    expect(md).toContain('with Stage 4 refinement');
    expect(md).toContain('5/10');
    expect(md).toContain('unclear scope');
  });

  it('falls back to "_(no response)_" when finalResponse is missing', () => {
    const md = buildFinalAnswerMarkdown({
      question: 'Q',
      finalResponse: null,
      stage4: null,
    });
    expect(md).toContain('_(no response)_');
  });
});

describe('buildFullDeliberationMarkdown', () => {
  it('includes all stages and the profile footer when messageMetadata.profile is set', () => {
    const md = buildFullDeliberationMarkdown({
      question: 'Q',
      stage1: [{ model: 'm1', response: 'r1' }],
      stage2: [{ model: 'm1', ranking: 'rk1', parsed_ranking: ['Response A'] }],
      stage3: { model: 'm1', response: 'final' },
      stage4: null,
      metadata: null,
      critic: null,
      messageMetadata: { profile: 'quality', models: ['m1'], chairman: 'm1' },
    });

    expect(md).toContain('Stage 1 — Individual Responses');
    expect(md).toContain('Stage 2 — Peer Rankings');
    expect(md).toContain('Stage 3 — Chairman Synthesis');
    expect(md).toContain('Profile: **Quality**');
  });

  it('appends a Stage 4 section when stage4 is present', () => {
    const md = buildFullDeliberationMarkdown({
      question: 'Q',
      stage1: [],
      stage2: [],
      stage3: { model: 'm1', response: 'final' },
      stage4: { response: 'refined-final', critic_score: 4, primary_concern: 'thin' },
      metadata: null,
      critic: null,
    });

    expect(md).toContain('Stage 4 — Refinement');
    expect(md).toContain('refined-final');
    expect(md).toContain('## Critic');
  });
});

describe('buildFinalAnswerFilename', () => {
  it('slugifies the question (lowercase, dashes, no special chars)', () => {
    const name = buildFinalAnswerFilename('What is the BEST answer?!');
    expect(name).toMatch(/^council-answer-what-is-the-best-answer-\d{8}-\d{4}\.md$/);
  });

  it('falls back to "untitled" for an empty question', () => {
    const name = buildFinalAnswerFilename('');
    expect(name).toMatch(/^council-answer-untitled-\d{8}-\d{4}\.md$/);
  });

  it('truncates very long questions to keep the filename bounded', () => {
    const longQ = 'lorem ipsum '.repeat(20);
    const name = buildFinalAnswerFilename(longQ);
    // Slug portion is capped at 40 chars; the full filename still ends in .md
    expect(name.endsWith('.md')).toBe(true);
    expect(name.length).toBeLessThan(120);
  });
});

describe('buildDeliberationFilename', () => {
  it('uses the deliberation prefix', () => {
    const name = buildDeliberationFilename('hello world');
    expect(name).toMatch(/^council-deliberation-hello-world-\d{8}-\d{4}\.md$/);
  });
});

describe('buildPromptWithAttachments', () => {
  it('returns the prompt unchanged when there are no attachments', () => {
    expect(buildPromptWithAttachments('hello', [])).toBe('hello');
    expect(buildPromptWithAttachments('hello', null)).toBe('hello');
    expect(buildPromptWithAttachments('hello', undefined)).toBe('hello');
  });

  it('prepends each attachment in a fenced FILE block before the prompt', () => {
    const out = buildPromptWithAttachments('my question', [
      { name: 'a.txt', content: 'AAA' },
      { name: 'b.txt', content: 'BBB' },
    ]);
    expect(out).toContain('--- FILE: a.txt ---');
    expect(out).toContain('AAA');
    expect(out).toContain('--- END FILE ---');
    expect(out).toContain('--- FILE: b.txt ---');
    expect(out).toContain('BBB');
    expect(out).toContain('my question');
    // Prompt comes AFTER the attachments
    expect(out.indexOf('my question')).toBeGreaterThan(out.indexOf('BBB'));
  });

  it('preserves attachment order', () => {
    const out = buildPromptWithAttachments('p', [
      { name: 'first.txt', content: 'one' },
      { name: 'second.txt', content: 'two' },
    ]);
    expect(out.indexOf('first.txt')).toBeLessThan(out.indexOf('second.txt'));
  });
});
