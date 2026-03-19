const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Navigate to mock page
  const filePath = 'file://' + path.resolve('mock_youtube.html');
  console.log('Navigating to:', filePath);
  await page.goto(filePath);

  // Wait for script to initialize and inject UI
  await page.waitForSelector('#evts-mini-btn', { timeout: 5000 });
  console.log('✓ Mini button injected');

  // Test opening the container
  await page.click('#evts-mini-btn');
  const isVisible = await page.isVisible('#evts-container');
  console.log('✓ Container visible after click:', isVisible);

  // Check if chapters were loaded from description
  const textareaContent = await page.inputValue('#evts-container textarea');
  console.log('✓ Textarea content:', textareaContent.replace(/\n/g, ' | '));
  if (textareaContent.includes('01:30 Introduction')) {
    console.log('✓ Chapters auto-loaded successfully');
  } else {
    console.log('✗ Chapters NOT auto-loaded');
  }

  // Check for settings gear
  const gear = await page.$('span[title="Turso Settings"]');
  if (gear) {
    console.log('✓ Settings gear found');
    await gear.click();
    const modalVisible = await page.evaluate(() => {
        const modals = Array.from(document.querySelectorAll('div')).filter(d => d.innerText.includes('Turso HTTP URL'));
        return modals.some(m => m.style.display === 'flex');
    });
    console.log('✓ Settings modal visible:', modalVisible);
  }

  await browser.close();
})();
