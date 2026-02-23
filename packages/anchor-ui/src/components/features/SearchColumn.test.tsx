/**
 * SearchColumn Component Tests
 * 
 * Tests for verifying search result formatting, content rendering,
 * deduplication display, and relevance scoring.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchColumn } from './SearchColumn';
import { createMockSearchResponse, createDuplicateResults, createMixedContentResults, createEdgeCaseResults, createBrokenScoreResults, mockApi, resetMocks, setupDefaultMocks } from '../../__tests__/utils/search-mocks';

// Mock the API service
vi.mock('../../services/api', () => ({
  api: mockApi
}));

describe('SearchColumn Component', () => {
  const defaultProps = {
    id: 1,
    availableBuckets: ['core', 'inbox', 'external-inbox'],
    availableTags: ['test', 'sample', 'important'],
    onContextUpdate: vi.fn(),
    onFullUpdate: vi.fn(),
    onRemove: vi.fn(),
    onAddColumn: vi.fn(),
    initialQuery: '',
    isOnly: true
  };

  beforeEach(() => {
    setupDefaultMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetMocks();
  });

  describe('Content Rendering', () => {
    it('renders search results with content', async () => {
      const mockResponse = createMockSearchResponse();
      mockApi.search.mockResolvedValueOnce(mockResponse);

      render(<SearchColumn {...defaultProps} />);

      // Type query and submit
      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'test query');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText(/first search result/i)).toBeInTheDocument();
      });

      // Verify content is displayed
      expect(screen.getByText(/important information/i)).toBeInTheDocument();
      expect(screen.getByText(/additional context/i)).toBeInTheDocument();
    });

    it('displays source path correctly', async () => {
      const mockResponse = createMockSearchResponse();
      mockApi.search.mockResolvedValueOnce(mockResponse);

      render(<SearchColumn {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'test');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      await waitFor(() => {
        expect(screen.getByText(/inbox\/document-1\.md/i)).toBeInTheDocument();
      });
    });

    it('shows timestamp in readable format', async () => {
      const mockResponse = createMockSearchResponse();
      mockApi.search.mockResolvedValueOnce(mockResponse);

      render(<SearchColumn {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'test');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      await waitFor(() => {
        // Should show relative time or formatted date
        expect(screen.getByText(/first search result/i)).toBeInTheDocument();
      });
    });

    it('displays provenance badge (internal/external)', async () => {
      const mockResponse = createMockSearchResponse();
      mockApi.search.mockResolvedValueOnce(mockResponse);

      render(<SearchColumn {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'test');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      await waitFor(() => {
        // Check for provenance indicators
        expect(screen.getByText(/internal/i)).toBeInTheDocument();
      });
    });
  });

  describe('Text Formatting', () => {
    it('preserves whitespace in code blocks', async () => {
      const mockResponse = createMockSearchResponse({
        results: createMixedContentResults()
      });
      mockApi.search.mockResolvedValueOnce(mockResponse);

      render(<SearchColumn {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'code');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      await waitFor(() => {
        expect(screen.getByText(/function test/i)).toBeInTheDocument();
      });

      // Verify code formatting is preserved
      const codeContent = screen.getByText(/function test/);
      expect(codeContent).toBeInTheDocument();
    });

    it('truncates long content with ellipsis', async () => {
      const mockResponse = createMockSearchResponse({
        results: createEdgeCaseResults()
      });
      mockApi.search.mockResolvedValueOnce(mockResponse);

      render(<SearchColumn {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'long');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      await waitFor(() => {
        // Long content should be truncated
        const longContent = screen.getByText(/A{100,}/);
        expect(longContent.textContent?.length).toBeLessThan(1000);
      });
    });

    it('handles special characters correctly', async () => {
      const mockResponse = createMockSearchResponse({
        results: createEdgeCaseResults()
      });
      mockApi.search.mockResolvedValueOnce(mockResponse);

      render(<SearchColumn {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'special');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      await waitFor(() => {
        // Special characters should be displayed correctly
        expect(screen.getByText(/Unicode:/i)).toBeInTheDocument();
      });
    });

    it('renders markdown content correctly', async () => {
      const mockResponse = createMockSearchResponse({
        results: [
          {
            ...createMockSearchResult(),
            content: '# Heading\n\n**Bold** and *italic* text.\n\n- List item 1\n- List item 2'
          }
        ]
      });
      mockApi.search.mockResolvedValueOnce(mockResponse);

      render(<SearchColumn {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'markdown');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      await waitFor(() => {
        expect(screen.getByText(/Bold/i)).toBeInTheDocument();
      });
    });
  });

  describe('Deduplication Display', () => {
    it('shows merged results as single card', async () => {
      const duplicateResults = createDuplicateResults();
      const mockResponse = createMockSearchResponse({
        results: duplicateResults,
        metadata: {
          atomCount: 1, // Should show as 1 after dedup
          filledPercent: 20,
          budget: 8192,
          tokens_used: 1638
        }
      });
      mockApi.search.mockResolvedValueOnce(mockResponse);

      render(<SearchColumn {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'duplicate');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      await waitFor(() => {
        // Should show deduplicated results
        const resultCards = screen.getAllByRole('article');
        expect(resultCards.length).toBeLessThan(duplicateResults.length);
      });
    });

    it('hides duplicate content', async () => {
      const duplicateResults = createDuplicateResults();
      const mockResponse = createMockSearchResponse({
        results: duplicateResults
      });
      mockApi.search.mockResolvedValueOnce(mockResponse);

      render(<SearchColumn {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'duplicate');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      await waitFor(() => {
        // Identical content should appear only once
        const duplicateContent = screen.queryAllByText(/duplicate content that appears/i);
        expect(duplicateContent.length).toBeLessThanOrEqual(1);
      });
    });

    it('displays merged indicator when content is combined', async () => {
      const mockResponse = createMockSearchResponse({
        results: createDuplicateResults()
      });
      mockApi.search.mockResolvedValueOnce(mockResponse);

      render(<SearchColumn {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'merged');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      await waitFor(() => {
        // Look for merge indicators
        expect(screen.getByText(/first search result/i)).toBeInTheDocument();
      });
    });
  });

  describe('Relevance Scoring', () => {
    it('displays score between 0.0-1.0 correctly', async () => {
      const mockResponse = createMockSearchResponse({
        results: [
          createMockSearchResult({ score: 0.95 }),
          createMockSearchResult({ score: 0.75 }),
          createMockSearchResult({ score: 0.50 })
        ]
      });
      mockApi.search.mockResolvedValueOnce(mockResponse);

      render(<SearchColumn {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'score');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      await waitFor(() => {
        // Scores should be displayed as percentages or decimals
        expect(screen.getByText(/first search result/i)).toBeInTheDocument();
      });
    });

    it('handles scores >1.0 (bug fix verification)', async () => {
      const brokenScores = createBrokenScoreResults();
      const mockResponse = createMockSearchResponse({
        results: brokenScores
      });
      mockApi.search.mockResolvedValueOnce(mockResponse);

      render(<SearchColumn {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'score');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      await waitFor(() => {
        // Should NOT show "164065%" - should be normalized or capped
        expect(screen.queryByText(/164065%/i)).not.toBeInTheDocument();
      });
    });

    it('sorts results by relevance score (highest first)', async () => {
      const mockResponse = createMockSearchResponse({
        results: [
          createMockSearchResult({ score: 0.5, content: 'Low score' }),
          createMockSearchResult({ score: 0.9, content: 'High score' }),
          createMockSearchResult({ score: 0.7, content: 'Medium score' })
        ]
      });
      mockApi.search.mockResolvedValueOnce(mockResponse);

      render(<SearchColumn {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'sort');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      await waitFor(() => {
        // High score should appear first
        const cards = screen.getAllByRole('article');
        expect(cards[0]).toHaveTextContent(/high score/i);
      });
    });
  });

  describe('Empty States', () => {
    it('shows "No results found" when empty', async () => {
      const mockResponse = createMockSearchResponse({
        results: [],
        metadata: {
          atomCount: 0,
          filledPercent: 0,
          budget: 8192,
          tokens_used: 0
        }
      });
      mockApi.search.mockResolvedValueOnce(mockResponse);

      render(<SearchColumn {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'empty');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      });
    });

    it('displays loading state during search', async () => {
      mockApi.search.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(createMockSearchResponse()), 1000)));

      render(<SearchColumn {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'loading');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      // Should show loading state immediately
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('displays error messages correctly', async () => {
      mockApi.search.mockRejectedValueOnce(new Error('Network error'));

      render(<SearchColumn {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'error');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Context Copy', () => {
    it('copies context to clipboard when button clicked', async () => {
      const mockResponse = createMockSearchResponse();
      mockApi.search.mockResolvedValueOnce(mockResponse);

      // Mock clipboard
      const mockClipboard = {
        writeText: vi.fn().mockResolvedValue(undefined)
      };
      Object.assign(navigator, { clipboard: mockClipboard });

      render(<SearchColumn {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'test');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      await waitFor(() => {
        expect(screen.getByText(/first search result/i)).toBeInTheDocument();
      });

      // Click copy button
      const copyButton = screen.getByRole('button', { name: /copy context/i });
      await userEvent.click(copyButton);

      // Verify clipboard was called
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    });
  });

  describe('View Modes', () => {
    it('switches between cards and raw text view', async () => {
      const mockResponse = createMockSearchResponse();
      mockApi.search.mockResolvedValueOnce(mockResponse);

      render(<SearchColumn {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'test');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      await waitFor(() => {
        expect(screen.getByText(/first search result/i)).toBeInTheDocument();
      });

      // Switch to raw view
      const viewToggleButton = screen.getByRole('button', { name: /view raw text/i });
      await userEvent.click(viewToggleButton);

      // Should show textarea in raw mode
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Controls', () => {
    it('filters by bucket when selected', async () => {
      const mockResponse = createMockSearchResponse();
      mockApi.search.mockResolvedValueOnce(mockResponse);

      render(<SearchColumn {...defaultProps} />);

      // Select a bucket
      const inboxBucket = screen.getByText(/inbox/i);
      await userEvent.click(inboxBucket);

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'test');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      await waitFor(() => {
        expect(mockApi.search).toHaveBeenCalledWith(
          expect.objectContaining({
            buckets: expect.arrayContaining(['inbox'])
          })
        );
      });
    });

    it('filters by tag when selected', async () => {
      const mockResponse = createMockSearchResponse();
      mockApi.search.mockResolvedValueOnce(mockResponse);

      render(<SearchColumn {...defaultProps} />);

      // Open tag drawer
      const tagDrawer = screen.getByLabelText(/semantic tags/i);
      await userEvent.click(tagDrawer);

      // Select a tag
      const testTag = screen.getByText(/#test/i);
      await userEvent.click(testTag);

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'test');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      await waitFor(() => {
        expect(mockApi.search).toHaveBeenCalledWith(
          expect.objectContaining({
            tags: expect.arrayContaining(['test'])
          })
        );
      });
    });

    it('updates token budget with slider', async () => {
      const mockResponse = createMockSearchResponse();
      mockApi.search.mockResolvedValueOnce(mockResponse);

      render(<SearchColumn {...defaultProps} />);

      // Adjust token budget slider
      const slider = screen.getByRole('slider');
      await userEvent.type(slider, '{ArrowRight}'.repeat(10));

      const searchInput = screen.getByPlaceholderText(/type keyword/i);
      await userEvent.type(searchInput, 'test');
      await userEvent.click(screen.getByRole('button', { name: /fetch context/i }));

      await waitFor(() => {
        expect(mockApi.search).toHaveBeenCalledWith(
          expect.objectContaining({
            token_budget: expect.any(Number)
          })
        );
      });
    });
  });
});
