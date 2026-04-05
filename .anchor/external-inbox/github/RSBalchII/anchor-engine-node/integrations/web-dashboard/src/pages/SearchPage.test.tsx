/**
 * A+B Component Tests for SearchPage
 * Tests both basic search (A) and advanced search (B) capabilities
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchPage } from '../pages/SearchPage';

describe('SearchPage - A+B Component Tests', () => {
  describe('A: Basic Search Functionality', () => {
    it('should render search input and button', () => {
      render(<SearchPage />);
      
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    });

    it('should display search results', async () => {
      render(<SearchPage />);
      
      const input = screen.getByPlaceholderText(/search/i);
      const button = screen.getByRole('button', { name: /search/i });
      
      fireEvent.change(input, { target: { value: 'test query' } });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/results/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during search', async () => {
      render(<SearchPage />);
      
      const input = screen.getByPlaceholderText(/search/i);
      const button = screen.getByRole('button', { name: /search/i });
      
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.click(button);
      
      // Should show loading indicator
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });
  });

  describe('B: Advanced Search Features', () => {
    it('should expand advanced options panel', () => {
      render(<SearchPage />);
      
      const toggleButton = screen.getByRole('button', { name: /advanced/i });
      fireEvent.click(toggleButton);
      
      expect(screen.getByText(/max results/i)).toBeInTheDocument();
      expect(screen.getByText(/buckets/i)).toBeInTheDocument();
    });

    it('should apply filters to search', async () => {
      render(<SearchPage />);
      
      // Expand advanced options
      const toggleButton = screen.getByRole('button', { name: /advanced/i });
      fireEvent.click(toggleButton);
      
      // Set filters
      const maxResultsInput = screen.getByLabelText(/max results/i);
      fireEvent.change(maxResultsInput, { target: { value: '20' } });
      
      const bucketSelect = screen.getByLabelText(/bucket/i);
      fireEvent.change(bucketSelect, { target: { value: 'external-inbox' } });
      
      // Perform search
      const input = screen.getByPlaceholderText(/search/i);
      const button = screen.getByRole('button', { name: /search/i });
      
      fireEvent.change(input, { target: { value: 'filtered search' } });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/filtered/i)).toBeInTheDocument();
      });
    });

    it('should display result metadata (scores, tags, source)', async () => {
      render(<SearchPage />);
      
      const input = screen.getByPlaceholderText(/search/i);
      const button = screen.getByRole('button', { name: /search/i });
      
      fireEvent.change(input, { target: { value: 'metadata test' } });
      fireEvent.click(button);
      
      await waitFor(() => {
        // Should show relevance scores
        expect(screen.getByText(/score:/i)).toBeInTheDocument();
        // Should show tags
        expect(screen.getByText(/tags:/i)).toBeInTheDocument();
        // Should show source
        expect(screen.getByText(/source:/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on search failure', async () => {
      render(<SearchPage />);
      
      const input = screen.getByPlaceholderText(/search/i);
      const button = screen.getByRole('button', { name: /search/i });
      
      // Trigger error (empty query or network error)
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });
});
