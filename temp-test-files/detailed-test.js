const { chromium } = require('playwright');

async function detailedPageAnalysis() {
  console.log('🔍 Detailed Momento Cake Admin Analysis');
  console.log('=======================================');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the application
    console.log('🌐 Navigating to application...');
    await page.goto('https://momentocake-admin.web.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ Page loaded successfully');
    
    // Take full page screenshot
    await page.screenshot({ 
      path: 'screenshots/full-page-analysis.png',
      fullPage: true 
    });
    
    // Get page content analysis
    console.log('\n📋 PAGE CONTENT ANALYSIS');
    console.log('-------------------------');
    
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyText: document.body.innerText.substring(0, 500),
        htmlStructure: document.body.innerHTML.substring(0, 1000),
        allButtons: Array.from(document.querySelectorAll('button')).map(btn => ({
          text: btn.textContent?.trim(),
          type: btn.type,
          classes: btn.className,
          id: btn.id,
          disabled: btn.disabled
        })),
        allInputs: Array.from(document.querySelectorAll('input')).map(input => ({
          type: input.type,
          name: input.name,
          placeholder: input.placeholder,
          classes: input.className,
          id: input.id
        })),
        allLinks: Array.from(document.querySelectorAll('a')).map(link => ({
          text: link.textContent?.trim(),
          href: link.href,
          classes: link.className
        })),
        headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
          tag: h.tagName.toLowerCase(),
          text: h.textContent?.trim()
        })),
        formElements: Array.from(document.querySelectorAll('form')).length,
        hasReact: !!window.React || !!document.querySelector('[data-reactroot]') || document.body.innerHTML.includes('react'),
        hasNextjs: document.body.innerHTML.includes('next') || document.body.innerHTML.includes('_next'),
        scripts: Array.from(document.querySelectorAll('script')).map(script => script.src).filter(src => src)
      };
    });
    
    console.log(`📄 Title: ${pageInfo.title}`);
    console.log(`🔗 URL: ${pageInfo.url}`);
    console.log(`⚛️  React detected: ${pageInfo.hasReact}`);
    console.log(`🔺 Next.js detected: ${pageInfo.hasNextjs}`);
    console.log(`📝 Forms found: ${pageInfo.formElements}`);
    
    console.log('\n🔘 BUTTONS FOUND:');
    pageInfo.allButtons.forEach((btn, index) => {
      console.log(`  ${index + 1}. "${btn.text}" (type: ${btn.type}, classes: ${btn.classes})`);
    });
    
    console.log('\n📝 INPUTS FOUND:');
    pageInfo.allInputs.forEach((input, index) => {
      console.log(`  ${index + 1}. Type: ${input.type}, Name: ${input.name}, Placeholder: ${input.placeholder}`);
    });
    
    console.log('\n🔗 LINKS FOUND:');
    pageInfo.allLinks.forEach((link, index) => {
      if (link.text && link.text.length > 0) {
        console.log(`  ${index + 1}. "${link.text}" -> ${link.href}`);
      }
    });
    
    console.log('\n📋 HEADINGS:');
    pageInfo.headings.forEach((heading, index) => {
      console.log(`  ${index + 1}. ${heading.tag.toUpperCase()}: "${heading.text}"`);
    });
    
    console.log('\n📄 BODY TEXT (first 500 chars):');
    console.log(`"${pageInfo.bodyText}"`);
    
    // Test for specific Portuguese terms
    console.log('\n🇧🇷 PORTUGUESE CONTENT DETECTION:');
    const portugueseTerms = [
      'Primeiro Acesso',
      'primeiro acesso', 
      'Login',
      'Entrar',
      'Email',
      'Senha',
      'senha',
      'Momento Cake',
      'momentocake'
    ];
    
    for (const term of portugueseTerms) {
      const found = await page.locator(`text=${term}`).count();
      console.log(`  ${found > 0 ? '✅' : '❌'} "${term}": ${found} occurrences`);
    }
    
    // Look for any clickable elements that might be the first access button
    console.log('\n🔍 SEARCHING FOR CLICKABLE ELEMENTS WITH RELEVANT TEXT:');
    const clickableSelectors = [
      '*:has-text("primeiro")',
      '*:has-text("Primeiro")',
      '*:has-text("acesso")',
      '*:has-text("Acesso")',
      '*:has-text("cadastro")',
      '*:has-text("Cadastro")',
      '*:has-text("registro")',
      '*:has-text("Registro")'
    ];
    
    for (const selector of clickableSelectors) {
      try {
        const elements = await page.locator(selector).all();
        if (elements.length > 0) {
          console.log(`  ✅ Found ${elements.length} elements matching "${selector}"`);
          for (let i = 0; i < elements.length; i++) {
            const text = await elements[i].textContent();
            const tagName = await elements[i].evaluate(el => el.tagName);
            console.log(`    ${i + 1}. ${tagName}: "${text?.trim()}"`);
          }
        }
      } catch (e) {
        // Ignore selector errors
      }
    }
    
    // Check if this might be a Single Page Application that hasn't loaded yet
    console.log('\n⏳ CHECKING FOR SPA LOADING:');
    await page.waitForTimeout(3000); // Wait 3 seconds for potential JS loading
    
    const afterWaitInfo = await page.evaluate(() => {
      return {
        bodyText: document.body.innerText.substring(0, 500),
        buttonCount: document.querySelectorAll('button').length,
        inputCount: document.querySelectorAll('input').length,
        hasLoadingIndicator: !!document.querySelector('[class*="loading"], [class*="spinner"], [class*="loader"]')
      };
    });
    
    console.log(`  Buttons after wait: ${afterWaitInfo.buttonCount}`);
    console.log(`  Inputs after wait: ${afterWaitInfo.inputCount}`);
    console.log(`  Loading indicator: ${afterWaitInfo.hasLoadingIndicator}`);
    
    if (afterWaitInfo.bodyText !== pageInfo.bodyText) {
      console.log('  ✅ Page content changed after waiting - SPA detected');
      console.log(`  New content preview: "${afterWaitInfo.bodyText}"`);
    } else {
      console.log('  ℹ️  Page content unchanged after waiting');
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'screenshots/after-wait-analysis.png',
      fullPage: true 
    });
    
    // Check console errors
    const consoleMessages = [];
    page.on('console', message => {
      if (message.type() === 'error') {
        consoleMessages.push(message.text());
      }
    });
    
    // Wait a bit more and check for errors
    await page.waitForTimeout(2000);
    
    if (consoleMessages.length > 0) {
      console.log('\n❌ CONSOLE ERRORS DETECTED:');
      consoleMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. ${msg}`);
      });
    } else {
      console.log('\n✅ No console errors detected');
    }
    
    // Save detailed analysis
    const analysis = {
      timestamp: new Date().toISOString(),
      pageInfo,
      afterWait: afterWaitInfo,
      consoleErrors: consoleMessages,
      screenshots: ['full-page-analysis.png', 'after-wait-analysis.png']
    };
    
    require('fs').writeFileSync('detailed-analysis.json', JSON.stringify(analysis, null, 2));
    console.log('\n📄 Detailed analysis saved to: detailed-analysis.json');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    await browser.close();
  }
}

// Create screenshots directory
require('fs').mkdirSync('screenshots', { recursive: true });

// Run the analysis
detailedPageAnalysis().then(() => {
  console.log('\n🏁 Analysis completed!');
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});