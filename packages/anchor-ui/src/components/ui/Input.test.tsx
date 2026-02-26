import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input Component', () => {
    describe('Default (Glass) Variant', () => {
        it('renders with default class', () => {
            render(<Input />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('input-glass');
        });

        it('applies custom className', () => {
            render(<Input className="custom-test" />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('input-glass');
            expect(input).toHaveClass('custom-test');
        });

        it('passes through props', () => {
            render(<Input placeholder="Enter text" type="email" />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveAttribute('placeholder', 'Enter text');
            expect(input).toHaveAttribute('type', 'email');
        });

        it('handles onChange events', async () => {
            const handleChange = vi.fn();
            const user = userEvent.setup();
            render(<Input onChange={handleChange} />);

            const input = screen.getByRole('textbox');
            await user.type(input, 'hello');

            expect(handleChange).toHaveBeenCalled();
            expect(input).toHaveValue('hello');
        });

        it('applies styles', () => {
            render(<Input style={{ color: 'red' }} />);
            const input = screen.getByRole('textbox');
            expect(input.style.color).toBe('red');
        });
    });

    describe('Range Variant', () => {
        it('renders range input', () => {
            render(<Input variant="range" />);
            // range inputs don't have implicit role="slider" in all implementations/queries,
            // but we can find by type or specific role if supported.
            // Often getByRole('slider') works for <input type="range">.
            const input = screen.getByRole('slider');
            expect(input).toBeInTheDocument();
            expect(input).toHaveAttribute('type', 'range');
        });

        it('renders with label', () => {
            render(<Input variant="range" label="Volume" />);
            expect(screen.getByText('Volume')).toBeInTheDocument();
        });

        it('passes style to inner input', () => {
            render(<Input variant="range" style={{ width: '100px' }} />);
            const input = screen.getByRole('slider');
            expect(input.style.width).toBe('100px');
        });
    });

    describe('Checkbox Variant', () => {
        it('renders checkbox input', () => {
            render(<Input variant="checkbox" />);
            const input = screen.getByRole('checkbox');
            expect(input).toBeInTheDocument();
        });

        it('renders with label', () => {
            render(<Input variant="checkbox" label="Agree to terms" />);
            expect(screen.getByText('Agree to terms')).toBeInTheDocument();
        });

        it('toggles checked state', async () => {
            const handleChange = vi.fn();
            const user = userEvent.setup();
            render(<Input variant="checkbox" onChange={handleChange} />);

            const input = screen.getByRole('checkbox');
            await user.click(input);

            expect(handleChange).toHaveBeenCalled();
            expect(input).toBeChecked();

            await user.click(input);
            expect(input).not.toBeChecked();
        });

        it('changes label style based on checked prop', () => {
            const { rerender } = render(<Input variant="checkbox" label="Option" checked={false} onChange={() => {}} />);
            const labelText = screen.getByText('Option');

            // Check unchecked style (normal font weight, dim color)
            expect(labelText.style.fontWeight).toBe('normal');
            expect(labelText.style.color).toBe('var(--text-dim)');

            // Rerender with checked=true
            rerender(<Input variant="checkbox" label="Option" checked={true} onChange={() => {}} />);

            // Check checked style (bold font weight, accent color)
            expect(labelText.style.fontWeight).toBe('bold');
            expect(labelText.style.color).toBe('var(--accent-primary)');
        });

        it('applies wrapper style', () => {
            render(<Input variant="checkbox" style={{ marginTop: '10px' }} />);
            // The style prop for checkbox variant is applied to the label wrapper
            // We can find the label element (which wraps the checkbox)
            const checkbox = screen.getByRole('checkbox');
            const wrapper = checkbox.parentElement;
            expect(wrapper?.style.marginTop).toBe('10px');
        });
    });
});
