/**
 * A+B Component Tests for IngestPage
 * Tests both basic text ingestion (A) and file ingestion (B) capabilities
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IngestPage } from '../pages/IngestPage';

describe('IngestPage - A+B Component Tests', () => {
  describe('A: Text Ingestion', () => {
    it('should render text input area', () => {
      render(<IngestPage />);
      
      expect(screen.getByPlaceholderText(/enter text/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ingest/i })).toBeInTheDocument();
    });

    it('should ingest text content', async () => {
      render(<IngestPage />);
      
      const textarea = screen.getByPlaceholderText(/enter text/i);
      const button = screen.getByRole('button', { name: /ingest/i });
      
      fireEvent.change(textarea, { 
        target: { value: 'This is test content to ingest.' } 
      });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      });
    });

    it('should show character count', async () => {
      render(<IngestPage />);
      
      const textarea = screen.getByPlaceholderText(/enter text/i);
      fireEvent.change(textarea, { 
        target: { value: 'Test content with 30 characters!' } 
      });
      
      expect(screen.getByText(/30/i)).toBeInTheDocument();
    });

    it('should allow bucket selection', () => {
      render(<IngestPage />);
      
      const select = screen.getByLabelText(/bucket/i);
      fireEvent.change(select, { target: { value: 'external-inbox' } });
      
      expect(select).toHaveValue('external-inbox');
    });
  });

  describe('B: File Ingestion', () => {
    it('should render file upload area', () => {
      render(<IngestPage />);
      
      expect(screen.getByText(/upload file/i)).toBeInTheDocument();
      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });

    it('should accept file drop', async () => {
      render(<IngestPage />);
      
      const dropzone = screen.getByTestId('file-upload');
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file]
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument();
      });
    });

    it('should show file metadata', async () => {
      render(<IngestPage />);
      
      const dropzone = screen.getByTestId('file-upload');
      const file = new File(['test content'], 'document.pdf', { 
        type: 'application/pdf',
        size: 1024 * 1024 // 1MB
      });
      
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file]
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/1 MB/i)).toBeInTheDocument();
        expect(screen.getByText('document.pdf')).toBeInTheDocument();
      });
    });

    it('should validate file size', async () => {
      render(<IngestPage />);
      
      const dropzone = screen.getByTestId('file-upload');
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.txt', { 
        type: 'text/plain',
        size: 11 * 1024 * 1024 // 11MB (over limit)
      });
      
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [largeFile]
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/file too large/i)).toBeInTheDocument();
      });
    });
  });

  describe('Paste & Ingest (New v4.8.0 Feature)', () => {
    it('should support clipboard paste', async () => {
      render(<IngestPage />);
      
      const textarea = screen.getByPlaceholderText(/enter text/i);
      
      // Simulate paste event
      fireEvent.paste(textarea, {
        clipboardData: {
          getData: () => 'Pasted content from clipboard'
        }
      });
      
      expect(textarea).toHaveValue('Pasted content from clipboard');
    });
  });
});
