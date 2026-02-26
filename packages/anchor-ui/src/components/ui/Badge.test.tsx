import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Badge } from './Badge';

describe('Badge Component', () => {
    describe('Rendering', () => {
        it('renders with default props', () => {
            render(<Badge label="Test Badge" />);
            const badge = screen.getByText('Test Badge');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('badge', 'badge-external');
            expect(badge).not.toHaveClass('active');
        });

        it('renders sovereign variant', () => {
            render(<Badge label="Sovereign" variant="sovereign" />);
            const badge = screen.getByText('Sovereign');
            expect(badge).toHaveClass('badge', 'badge-sovereign');
        });

        it('renders external variant', () => {
            render(<Badge label="External" variant="external" />);
            const badge = screen.getByText('External');
            expect(badge).toHaveClass('badge', 'badge-external');
        });

        it('renders bucket variant with # prefix', () => {
            render(<Badge label="inbox" variant="bucket" />);
            const badge = screen.getByText('#inbox');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('badge');
            expect(badge).not.toHaveClass('badge-external', 'badge-sovereign');
        });

        it('renders tag variant with # prefix', () => {
            render(<Badge label="urgent" variant="tag" />);
            const badge = screen.getByText('#urgent');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('badge');
            expect(badge).not.toHaveClass('badge-external', 'badge-sovereign');
        });
    });

    describe('Styling', () => {
        it('applies default bucket styles', () => {
            render(<Badge label="inbox" variant="bucket" />);
            const badge = screen.getByText('#inbox');

            // Convert rgba colors to rgb for comparison as browsers/jsdom normalize them
            expect(badge).toHaveStyle({
                backgroundColor: 'rgba(100, 108, 255, 0.2)',
                color: 'rgb(165, 180, 252)', // #a5b4fc
                fontSize: '0.65rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '8px'
            });
        });

        it('applies active bucket styles', () => {
            render(<Badge label="inbox" variant="bucket" active />);
            const badge = screen.getByText('#inbox');

            expect(badge).toHaveClass('active');
            expect(badge).toHaveStyle({
                backgroundColor: 'rgba(100, 108, 255, 0.4)',
                color: 'rgb(199, 210, 254)' // #c7d2fe
            });
        });

        it('applies default tag styles', () => {
            render(<Badge label="urgent" variant="tag" />);
            const badge = screen.getByText('#urgent');

            expect(badge).toHaveStyle({
                backgroundColor: 'rgba(236, 72, 153, 0.15)',
                color: 'rgb(249, 168, 212)', // #f9a8d4
                fontSize: '0.65rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '8px'
            });
        });

        it('applies active tag styles', () => {
            render(<Badge label="urgent" variant="tag" active />);
            const badge = screen.getByText('#urgent');

            expect(badge).toHaveClass('active');
            expect(badge).toHaveStyle({
                backgroundColor: 'rgba(236, 72, 153, 0.3)',
                color: 'rgb(251, 207, 232)' // #fbcfe8
            });
        });

        it('merges custom className', () => {
            render(<Badge label="Custom Class" className="my-custom-class" />);
            const badge = screen.getByText('Custom Class');
            expect(badge).toHaveClass('my-custom-class');
        });

        it('merges custom styles', () => {
            render(<Badge label="Custom Style" style={{ fontWeight: 'bold' }} />);
            const badge = screen.getByText('Custom Style');
            expect(badge).toHaveStyle({ fontWeight: 'bold' });
        });
    });

    describe('Interactions', () => {
        it('handles onClick', async () => {
            const handleClick = vi.fn();
            const user = userEvent.setup();

            render(<Badge label="Clickable" onClick={handleClick} />);
            const badge = screen.getByText('Clickable');

            expect(badge).toHaveStyle({ cursor: 'pointer' });

            await user.click(badge);
            expect(handleClick).toHaveBeenCalledTimes(1);
        });

        it('has default cursor when not clickable', () => {
            render(<Badge label="Not Clickable" />);
            const badge = screen.getByText('Not Clickable');
            expect(badge).toHaveStyle({ cursor: 'default' });
        });
    });
});
