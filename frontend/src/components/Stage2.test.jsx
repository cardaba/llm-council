// deAnonymizeText is the pure helper that Stage2 imports from utils/.
// Tests live next to Stage2.jsx because the helper exists in service of
// the Stage 2 rendering UX (de-anonymized peer-ranking display).
import { deAnonymizeText } from '../utils/deAnonymizeText';

describe('deAnonymizeText', () => {
  it('replaces "Response A" with the bold model short name', () => {
    const out = deAnonymizeText('Response A is great.', {
      'Response A': 'openai/gpt-5.1',
    });
    expect(out).toBe('**gpt-5.1** is great.');
  });

  it('replaces multiple occurrences of the same label', () => {
    const out = deAnonymizeText('Response A wins. Response A again.', {
      'Response A': 'openai/gpt-5.1',
    });
    expect(out).toBe('**gpt-5.1** wins. **gpt-5.1** again.');
  });

  it('replaces every distinct label from the mapping', () => {
    const out = deAnonymizeText(
      'Response A beats Response B but Response C ties.',
      {
        'Response A': 'openai/gpt-5.1',
        'Response B': 'anthropic/claude-sonnet-4.5',
        'Response C': 'google/gemini-3-pro-preview',
      }
    );
    expect(out).toContain('**gpt-5.1**');
    expect(out).toContain('**claude-sonnet-4.5**');
    expect(out).toContain('**gemini-3-pro-preview**');
    expect(out).not.toContain('Response A');
    expect(out).not.toContain('Response B');
    expect(out).not.toContain('Response C');
  });

  it('returns the text unchanged when labelToModel is null', () => {
    const out = deAnonymizeText('Response A is here.', null);
    expect(out).toBe('Response A is here.');
  });

  it('returns the text unchanged when labelToModel is undefined', () => {
    const out = deAnonymizeText('Response A is here.', undefined);
    expect(out).toBe('Response A is here.');
  });

  it('handles a model id without a slash by using the full id', () => {
    const out = deAnonymizeText('Response A wins.', {
      'Response A': 'some-model',
    });
    expect(out).toBe('**some-model** wins.');
  });

  it('returns the text unchanged when the mapping is empty', () => {
    const out = deAnonymizeText('Response A is here.', {});
    expect(out).toBe('Response A is here.');
  });
});
