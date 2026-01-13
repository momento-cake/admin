#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */

/**
 * Test Runner Script for Ingredients Management E2E Tests
 *
 * Usage:
 * node scripts/run-tests.js [options]
 *
 * Options:
 * --suite=<suite>    Run specific test suite (crud, stock, suppliers, search, errors)
 * --browser=<name>   Run on specific browser (chromium, firefox, webkit)
 * --headed           Run tests in headed mode
 * --debug            Run tests in debug mode
 * --ui               Run tests in UI mode
 * --smoke            Run smoke tests only
 * --full             Run full test suite
 * --parallel         Run tests in parallel
 * --serial           Run tests in serial mode
 * --report           Generate and open test report
 * --help             Show this help message
 */

const { spawn } = require('child_process');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};
const flags = [];

args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    if (value) {
      options[key] = value;
    } else {
      flags.push(key);
    }
  }
});

// Show help
if (flags.includes('help')) {
  console.log(`
🧪 Ingredients Management E2E Test Runner

Usage: node scripts/run-tests.js [options]

Test Suites:
  --suite=crud        Run CRUD operations tests
  --suite=stock       Run stock management tests
  --suite=suppliers   Run supplier management tests
  --suite=search      Run search and filtering tests
  --suite=errors      Run error handling tests

Browser Options:
  --browser=chromium  Run on Chrome/Chromium
  --browser=firefox   Run on Firefox
  --browser=webkit    Run on Safari/WebKit

Execution Modes:
  --headed           Show browser during execution
  --debug            Debug mode with step-through
  --ui               Interactive UI mode
  --smoke            Run critical tests only
  --full             Run complete test suite
  --parallel         Run tests in parallel (default)
  --serial           Run tests one at a time

Reporting:
  --report           Generate and open HTML report

Examples:
  node scripts/run-tests.js --suite=crud --headed
  node scripts/run-tests.js --browser=firefox --smoke
  node scripts/run-tests.js --full --report
  node scripts/run-tests.js --debug --suite=stock
`);
  process.exit(0);
}

// Build Playwright command
let command = ['npx', 'playwright', 'test'];

// Add test suite filter
if (options.suite) {
  const suiteMap = {
    crud: 'tests/ingredients/ingredients-crud.spec.ts',
    stock: 'tests/ingredients/stock-management.spec.ts',
    suppliers: 'tests/ingredients/supplier-management.spec.ts',
    search: 'tests/ingredients/search-and-filters.spec.ts',
    errors: 'tests/ingredients/error-handling.spec.ts'
  };
  
  if (suiteMap[options.suite]) {
    command.push(suiteMap[options.suite]);
  } else {
    console.error(`❌ Unknown test suite: ${options.suite}`);
    console.error('Available suites: crud, stock, suppliers, search, errors');
    process.exit(1);
  }
}

// Add browser filter
if (options.browser) {
  command.push('--project', options.browser);
}

// Add execution flags
if (flags.includes('headed')) {
  command.push('--headed');
}

if (flags.includes('debug')) {
  command.push('--debug');
}

if (flags.includes('ui')) {
  command.push('--ui');
}

if (flags.includes('serial')) {
  command.push('--workers', '1');
}

// Handle special modes
if (flags.includes('smoke')) {
  // Run smoke tests (critical functionality only)
  command.push('--grep', '(create.*successfully|display.*ingredients|search.*name|add.*stock.*successfully)');
  console.log('🚨 Running smoke tests (critical functionality)');
}

if (flags.includes('full')) {
  // Run all tests
  command = ['npx', 'playwright', 'test', 'tests/ingredients/'];
  console.log('🔄 Running full test suite');
}

// Add common flags
if (!flags.includes('debug') && !flags.includes('ui')) {
  command.push('--reporter=list');
}

console.log(`🚀 Running command: ${command.join(' ')}`);
console.log(`📍 Test environment: ${process.env.TEST_BASE_URL || 'http://localhost:3000'}`);
console.log('');

// Execute tests
const testProcess = spawn(command[0], command.slice(1), {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Tests completed successfully!');
    
    // Generate report if requested
    if (flags.includes('report')) {
      console.log('📊 Generating test report...');
      const reportProcess = spawn('npx', ['playwright', 'show-report'], {
        stdio: 'inherit',
        shell: process.platform === 'win32'
      });
    }
  } else {
    console.log(`\n❌ Tests failed with exit code ${code}`);
    
    // Show helpful debug information
    console.log('\n🔍 Debugging tips:');
    console.log('1. Check if the application is running on http://localhost:3000');
    console.log('2. Verify admin credentials are correctly configured');
    console.log('3. Run with --headed flag to see browser interaction');
    console.log('4. Run with --debug flag to step through tests');
    console.log('5. Check test-results/ folder for screenshots and traces');
  }
  
  process.exit(code);
});

testProcess.on('error', (error) => {
  console.error('❌ Failed to start test process:', error);
  process.exit(1);
});