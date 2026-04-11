#!/usr/bin/env node
/**
 * Decision Record Validator - JavaScript Version
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function parseYamlFrontmatter(content) {
  if (!content.startsWith('---')) {
    return { frontmatter: {}, body: content };
  }

  const endMatch = content.match(/\n---\n/);
  if (!endMatch) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterContent = content.substring(3, endMatch.index);
  const body = content.substring(endMatch.index + 4);

  const frontmatter = {};
  const lines = frontmatterContent.split('\n');

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      frontmatter[key] = value.trim();
    }
  }

  return { frontmatter, body };
}

function validateDecisionRecord(record, index) {
  const errors = [];
  const warnings = [];

  const requiredFields = ['title', 'decision'];

  for (const field of requiredFields) {
    if (!record[field]) {
      errors.push(`Missing required field: ${field}`);
    } else if (typeof record[field] !== 'string' || record[field].trim() === '') {
      errors.push(`Field '${field}' must be a non-empty string`);
    }
  }

  const recommendedFields = ['date', 'context', 'rationale'];

  for (const field of recommendedFields) {
    if (!record[field]) {
      warnings.push(`Missing recommended field: ${field}`);
    }
  }

  if (record.date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}/;
    if (!dateRegex.test(record.date)) {
      warnings.push(`Date '${record.date}' should be in ISO 8601 format`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateFile(filePath) {
  const result = {
    filePath,
    valid: true,
    records: [],
    errors: [],
    warnings: [],
  };

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const documents = content.split(/\n---\n/);

    let recordIndex = 0;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i].trim();
      if (doc === '') continue;

      const { frontmatter, body } = parseYamlFrontmatter(doc);

      const record = {
        title: frontmatter.title,
        date: frontmatter.date,
        decision: frontmatter.decision,
        context: frontmatter.context,
        alternatives: frontmatter.alternatives,
        rationale: frontmatter.rationale,
        consequences: frontmatter.consequences,
        related: frontmatter.related,
      };

      const validation = validateDecisionRecord(record, recordIndex);

      if (!validation.valid) {
        result.valid = false;
        result.errors.push(...validation.errors);
      }

      result.warnings.push(...validation.warnings);

      if (Object.keys(record).length > 0) {
        result.records.push(record);
        recordIndex++;
      }
    }

    if (result.records.length === 0) {
      result.errors.push('No decision records found in file');
      result.valid = false;
    }

  } catch (error) {
    result.errors.push(`Failed to read file: ${error.message}`);
    result.valid = false;
  }

  return result;
}

function generateReport(results) {
  const lines = [];

  lines.push('='.repeat(80));
  lines.push('DECISION RECORD VALIDATION REPORT');
  lines.push('='.repeat(80));
  lines.push('');

  for (const result of results) {
    lines.push(`File: ${path.basename(result.filePath)}`);
    lines.push('-'.repeat(80));
    lines.push(`Status: ${result.valid ? 'VALID' : 'INVALID'}`);
    lines.push(`Records Found: ${result.records.length}`);
    lines.push('');

    if (result.errors.length > 0) {
      lines.push('Errors:');
      for (const error of result.errors) {
        lines.push(`  ❌ ${error}`);
      }
      lines.push('');
    }

    if (result.warnings.length > 0) {
      lines.push('Warnings:');
      for (const warning of result.warnings) {
        lines.push(`  ⚠️  ${warning}`);
      }
      lines.push('');
    }

    if (result.records.length > 0) {
      lines.push('Sample Records:');
      const sampleCount = Math.min(3, result.records.length);
      for (let i = 0; i < sampleCount; i++) {
        const record = result.records[i];
        lines.push(`\n--- Record ${i + 1} ---`);
        lines.push(`Title: ${record.title || '(no title)'}`);
        lines.push(`Decision: ${record.decision?.substring(0, 100) || '(no decision)'}`);
        if (record.decision?.length > 100) {
          lines.push(`  ... (${record.decision.length} characters total)`);
        }
        lines.push(`Date: ${record.date || '(no date)'}`);
      }
      if (result.records.length > 3) {
        lines.push(`\n  ... and ${result.records.length - 3} more records`);
      }
      lines.push('');
    }

    lines.push('');
  }

  const totalRecords = results.reduce((sum, r) => sum + r.records.length, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
  const allValid = results.every(r => r.valid);

  lines.push('='.repeat(80));
  lines.push('OVERALL SUMMARY');
  lines.push('='.repeat(80));
  lines.push(`Files Validated: ${results.length}`);
  lines.push(`Total Records: ${totalRecords}`);
  lines.push(`Total Errors: ${totalErrors}`);
  lines.push(`Total Warnings: ${totalWarnings}`);
  lines.push(`All Valid: ${allValid ? 'Yes' : 'No'}`);
  lines.push('');

  return lines.join('\n');
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node scripts/decision-record-validator.js <file-path>');
  console.error('  node scripts/decision-record-validator.js "logs/distills/*.yaml"');
  process.exit(1);
}

const files = [];
for (const arg of args) {
  if (arg.includes('*')) {
    const dir = path.dirname(arg);
    const pattern = path.basename(arg);

    try {
      const matchingFiles = fs.readdirSync(dir).filter(f => {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(f);
      });

      for (const file of matchingFiles) {
        files.push(path.join(dir, file));
      }
    } catch {
      console.error(`Warning: Could not find files matching: ${arg}`);
    }
  } else {
    if (fs.existsSync(arg)) {
      files.push(arg);
    } else {
      console.error(`File not found: ${arg}`);
    }
  }
}

if (files.length === 0) {
  console.error('No files found to validate');
  process.exit(1);
}

const results = [];
for (const file of files) {
  const result = validateFile(file);
  results.push(result);
}

const report = generateReport(results);
console.log('\n' + report);

const fs2 = await import('fs');
const reportPath = 'logs/tests/decision-record-validation.md';
fs2.writeFileSync(reportPath, report, 'utf-8');
console.log(`\nReport saved to: ${reportPath}`);

const hasErrors = results.some(r => !r.valid);
process.exit(hasErrors ? 1 : 0);
