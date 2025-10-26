import * as fs from 'fs'
import * as path from 'path'

interface TestResult {
  name: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  error?: string
}

interface TestReport {
  totalTests: number
  passed: number
  failed: number
  skipped: number
  duration: number
  tests: TestResult[]
  screenshots: string[]
  timestamp: string
}

export function generateReport(results: any): string {
  const report: TestReport = {
    totalTests: results.length,
    passed: results.filter((r: any) => r.status === 'passed').length,
    failed: results.filter((r: any) => r.status === 'failed').length,
    skipped: results.filter((r: any) => r.status === 'skipped').length,
    duration: results.reduce((sum: number, r: any) => sum + (r.duration || 0), 0),
    tests: results,
    screenshots: [],
    timestamp: new Date().toISOString()
  }

  const md = `# Momento Cake Admin - Client Management E2E Test Report

**Generated:** ${report.timestamp}

## Executive Summary

- **Total Tests:** ${report.totalTests}
- **Passed:** ✓ ${report.passed} (${((report.passed / report.totalTests) * 100).toFixed(1)}%)
- **Failed:** ✗ ${report.failed} (${((report.failed / report.totalTests) * 100).toFixed(1)}%)
- **Skipped:** - ${report.skipped}
- **Total Duration:** ${(report.duration / 1000).toFixed(2)}s

## Test Results by Category

### 1. Authentication & Navigation
${formatCategoryResults(results.filter((r: any) => r.name.includes('1. Authentication')))}

### 2. Client List & Filtering
${formatCategoryResults(results.filter((r: any) => r.name.includes('2. Client List')))}

### 3. Create Personal Client (Pessoa Física)
${formatCategoryResults(results.filter((r: any) => r.name.includes('3. Create Personal')))}

### 4. Create Business Client (Pessoa Jurídica)
${formatCategoryResults(results.filter((r: any) => r.name.includes('4. Create Business')))}

### 5. Phase 7 Advanced Features
${formatCategoryResults(results.filter((r: any) => r.name.includes('5. Phase 7')))}

### 6. Client Detail Page
${formatCategoryResults(results.filter((r: any) => r.name.includes('6. Client Detail')))}

### 7. Edit Client
${formatCategoryResults(results.filter((r: any) => r.name.includes('7. Edit Client')))}

### 8. Delete and Restore Client
${formatCategoryResults(results.filter((r: any) => r.name.includes('8. Delete')))}

## Screenshots

Screenshots have been captured for key test scenarios in \`test-results/clients/\`.

## Recommendations

Based on the test results:
- Review failed tests for implementation gaps
- Check authentication session management
- Verify form validation is working correctly
- Ensure Phase 7 features are fully implemented

`

  return md
}

function formatCategoryResults(tests: TestResult[]): string {
  if (tests.length === 0) return '- No tests in this category\n'

  return tests.map(t => {
    const icon = t.status === 'passed' ? '✓' : t.status === 'failed' ? '✗' : '-'
    const duration = t.duration ? `(${(t.duration / 1000).toFixed(2)}s)` : ''
    return `- ${icon} ${t.name} ${duration}`
  }).join('\n')
}
