import { render, screen } from '@testing-library/react';
import MessageHeader from './MessageHeader';

describe('MessageHeader', () => {
  it('renders "Quality (legacy)" when metadata is undefined', () => {
    render(<MessageHeader metadata={undefined} />);
    expect(screen.getByText(/quality \(legacy\)/i)).toBeInTheDocument();
  });

  it('renders "Quality (legacy)" when metadata is an empty object (no profile)', () => {
    render(<MessageHeader metadata={{}} />);
    expect(screen.getByText(/quality \(legacy\)/i)).toBeInTheDocument();
  });

  it('renders "Fast" label when profile=fast', () => {
    render(
      <MessageHeader
        metadata={{
          profile: 'fast',
          models: ['openai/gpt-5.1'],
          chairman: 'openai/gpt-5.1',
        }}
      />
    );
    expect(screen.getByText('Fast')).toBeInTheDocument();
  });

  it('renders "Quality" label when profile=quality', () => {
    render(
      <MessageHeader
        metadata={{
          profile: 'quality',
          models: ['openai/gpt-5.1', 'anthropic/claude-sonnet-4.5'],
          chairman: 'anthropic/claude-sonnet-4.5',
        }}
      />
    );
    expect(screen.getByText('Quality')).toBeInTheDocument();
  });

  it('renders "Quality+Research" label when profile=quality_research', () => {
    render(
      <MessageHeader
        metadata={{
          profile: 'quality_research',
          models: ['openai/gpt-5.1', 'anthropic/claude-opus-4.7'],
          chairman: 'anthropic/claude-opus-4.7',
        }}
      />
    );
    expect(screen.getByText('Quality+Research')).toBeInTheDocument();
  });

  it('uses singular "model" for count=1 and plural for count>1', () => {
    const { rerender } = render(
      <MessageHeader
        metadata={{
          profile: 'fast',
          models: ['openai/gpt-5.1'],
          chairman: 'openai/gpt-5.1',
        }}
      />
    );
    expect(screen.getByText(/1 model$/)).toBeInTheDocument();

    rerender(
      <MessageHeader
        metadata={{
          profile: 'quality',
          models: ['m1', 'm2', 'm3'],
          chairman: 'm1',
        }}
      />
    );
    expect(screen.getByText(/3 models$/)).toBeInTheDocument();
  });

  it('renders Stage 4 refinement suffix when stage4_triggered=true', () => {
    render(
      <MessageHeader
        metadata={{
          profile: 'quality_research',
          models: ['m1'],
          chairman: 'm1',
          stage4_triggered: true,
        }}
      />
    );
    expect(screen.getByText(/stage 4 refinement/i)).toBeInTheDocument();
  });

  it('omits Stage 4 refinement suffix when stage4_triggered is falsy', () => {
    render(
      <MessageHeader
        metadata={{
          profile: 'quality',
          models: ['m1'],
          chairman: 'm1',
          stage4_triggered: false,
        }}
      />
    );
    expect(screen.queryByText(/stage 4 refinement/i)).not.toBeInTheDocument();
  });

  it('drops publisher prefix and :online suffix from chairman short name', () => {
    render(
      <MessageHeader
        metadata={{
          profile: 'quality',
          models: ['anthropic/claude-opus-4.7'],
          chairman: 'anthropic/claude-opus-4.7:online',
        }}
      />
    );
    expect(screen.getByText(/Chairman: claude-opus-4\.7/)).toBeInTheDocument();
  });

  it('shows cost line when cost.total >= 0.001', () => {
    render(
      <MessageHeader
        metadata={{
          profile: 'quality',
          models: ['m1'],
          chairman: 'm1',
          cost: { total: 0.002, upstream_total: 0.05 },
        }}
      />
    );
    expect(screen.getByText(/0\.050 upstream/)).toBeInTheDocument();
    expect(screen.getByText(/0\.002 fee/)).toBeInTheDocument();
  });

  it('hides cost line when cost.total is below the $0.001 threshold', () => {
    render(
      <MessageHeader
        metadata={{
          profile: 'fast',
          models: ['m1'],
          chairman: 'm1',
          cost: { total: 0.0001, upstream_total: 0.001 },
        }}
      />
    );
    expect(screen.queryByText(/upstream/)).not.toBeInTheDocument();
    expect(screen.queryByText(/fee/)).not.toBeInTheDocument();
  });

  it('hides cost line when cost is missing entirely', () => {
    render(
      <MessageHeader
        metadata={{
          profile: 'fast',
          models: ['m1'],
          chairman: 'm1',
        }}
      />
    );
    expect(screen.queryByText(/upstream/)).not.toBeInTheDocument();
  });
});
