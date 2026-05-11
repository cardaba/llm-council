import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QualityToggle from './QualityToggle';

describe('QualityToggle', () => {
  it('renders all 3 profile options with their labels', () => {
    render(<QualityToggle value="fast" onChange={() => {}} />);
    expect(screen.getByText('Fast')).toBeInTheDocument();
    expect(screen.getByText('Quality')).toBeInTheDocument();
    expect(screen.getByText('Quality+Research')).toBeInTheDocument();
  });

  it('renders the cost band footnote for each option', () => {
    render(<QualityToggle value="fast" onChange={() => {}} />);
    expect(screen.getByText('~$0.001')).toBeInTheDocument();
    expect(screen.getByText('~$0.05 typical')).toBeInTheDocument();
    expect(screen.getByText('~$0.45 typical')).toBeInTheDocument();
  });

  it('exposes a radiogroup with 3 radios', () => {
    render(<QualityToggle value="fast" onChange={() => {}} />);
    const group = screen.getByRole('radiogroup', { name: /quality profile/i });
    expect(group).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
  });

  it('value prop controls which radio is checked', () => {
    render(<QualityToggle value="quality" onChange={() => {}} />);
    // Radios are identified by their `value` attribute — the accessible name
    // would conflate "Quality" and "Quality+Research" because of the cost-band
    // suffix in the label.
    const radios = screen.getAllByRole('radio');
    const fast = radios.find((r) => r.value === 'fast');
    const quality = radios.find((r) => r.value === 'quality');
    const qr = radios.find((r) => r.value === 'quality_research');
    expect(fast).not.toBeChecked();
    expect(quality).toBeChecked();
    expect(qr).not.toBeChecked();
  });

  it('clicking the Quality radio fires onChange with "quality"', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QualityToggle value="fast" onChange={onChange} />);

    const quality = screen.getAllByRole('radio').find((r) => r.value === 'quality');
    await user.click(quality);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('quality');
  });

  it('clicking the Quality+Research radio fires onChange with "quality_research"', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QualityToggle value="fast" onChange={onChange} />);

    const qr = screen
      .getAllByRole('radio')
      .find((r) => r.value === 'quality_research');
    await user.click(qr);

    expect(onChange).toHaveBeenCalledWith('quality_research');
  });

  it('disabled prop disables all 3 radios', () => {
    render(<QualityToggle value="fast" onChange={() => {}} disabled />);
    const radios = screen.getAllByRole('radio');
    radios.forEach((radio) => {
      expect(radio).toBeDisabled();
    });
  });
});
