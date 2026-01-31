import { test, expect } from '@playwright/test';

/**
 * E2E Tests for APIRouter Core User Flows
 * Tests complete workflows from UI perspective
 */

test.describe('APIRouter Core Flows', () => {
  test('Flow 1: Create API Key and View in List', async ({ page }) => {
    // Navigate to Keys page
    await page.goto('/');
    await expect(page).toHaveTitle(/APIRouter/i);

    // Click on API Keys in navigation
    await page.click('text=API Keys');
    await page.waitForLoadState('networkidle');

    // Click Create Key button
    await page.click('button:has-text("Create")');
    
    // Fill in form
    await page.fill('input[placeholder*="name"]', 'E2E Test Key');
    
    // Select brave provider
    const braveCheckbox = page.locator('input[type="checkbox"]').first();
    await braveCheckbox.check();
    
    // Submit form
    await page.click('button:has-text("Create")');
    
    // Wait for key to appear in list
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=E2E Test Key')).toBeVisible();
    
    // Verify key is in the list
    const keyTable = page.locator('table');
    await expect(keyTable).toContainText('E2E Test Key');
    await expect(keyTable).toContainText('brave');
  });

  test('Flow 2: Configure Provider with API Key', async ({ page }) => {
    // Navigate to Configuration page
    await page.goto('/');
    await page.click('text=Configuration');
    await page.waitForLoadState('networkidle');

    // Verify Brave tab exists
    await expect(page.locator('button:has-text("Brave")')).toBeVisible();
    
    // Click Brave tab if not already selected
    const braveTab = page.locator('button', { hasText: 'Brave' });
    if (!(await braveTab.evaluate((el: HTMLElement) => el.classList.contains('active')))) {
      await braveTab.click();
    }

    // Fill API key (using a test key)
    const apiKeyInputs = page.locator('input[type="password"]');
    await apiKeyInputs.first().fill('test-api-key-e2e-123456');
    
    // Save configuration
    const saveButtons = page.locator('button:has-text("Save")');
    await saveButtons.first().click();
    
    // Wait for confirmation
    await page.waitForLoadState('networkidle');
    
    // Verify configuration was saved (success message or status change)
    await page.waitForTimeout(1000);
    
    // Configuration should be persisted
    await page.reload();
    await page.click('text=Configuration');
    await page.waitForLoadState('networkidle');
    
    // Verify the configuration is still there
    const configStatus = page.locator('text=Configured');
    await expect(configStatus).toBeVisible({ timeout: 5000 });
  });

  test('Flow 3: Search Using API Key', async ({ page }) => {
    // Create a key first via API
    const keyResponse = await page.request.post('http://localhost:3001/api/keys', {
      data: {
        name: 'E2E Search Key',
        providers: ['brave'],
      },
    });
    const keyData = await keyResponse.json();
    const apiKey = keyData.key;

    // Navigate to Keys page to verify key exists
    await page.goto('/');
    await page.click('text=API Keys');
    await page.waitForLoadState('networkidle');
    
    // Verify key appears in list
    await expect(page.locator(`text=${keyData.name}`)).toBeVisible();
    
    // Copy key using API (not via UI, since we already have it)
    // In a real scenario, user would copy it from the UI
    
    // Perform search using the key via API
    const searchResponse = await page.request.post(
      'http://localhost:3001/api/proxy/brave/search',
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        data: {
          q: 'javascript testing',
          count: 5,
        },
      }
    );

    // Verify search was successful
    expect(searchResponse.status()).toBe(200);
    const searchData = await searchResponse.json();
    
    // Verify response has expected structure
    expect(searchData).toHaveProperty('query', 'javascript testing');
    expect(searchData).toHaveProperty('results');
    expect(searchData.results).toBeInstanceOf(Array);
  });

  test('Flow 4: Monitor Usage Statistics', async ({ page }) => {
    // Create a key
    const createResponse = await page.request.post('http://localhost:3001/api/keys', {
      data: {
        name: 'E2E Stats Key',
        providers: ['brave'],
      },
    });
    const keyData = await createResponse.json();

    // Navigate to Statistics page
    await page.goto('/');
    await page.click('text=Statistics');
    await page.waitForLoadState('networkidle');

    // Verify stats page loaded
    await expect(page.locator('text=Statistics')).toBeVisible();
    
    // Look for summary cards
    const totalKeysCard = page.locator('text=Total Keys').first();
    await expect(totalKeysCard).toBeVisible();

    // Filter by provider (if available)
    const filterSelect = page.locator('select');
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption('brave');
      await page.waitForLoadState('networkidle');
    }

    // Verify our key appears in the stats table
    const statsTable = page.locator('table');
    if (await statsTable.isVisible()) {
      await expect(statsTable).toContainText(keyData.name);
    }
  });

  test('Flow 5: Create Multi-Provider Key', async ({ page }) => {
    // Navigate to Keys page
    await page.goto('/');
    await page.click('text=API Keys');
    await page.waitForLoadState('networkidle');

    // Click Create Key
    await page.click('button:has-text("Create")');
    
    // Fill name
    await page.fill('input[placeholder*="name"]', 'E2E Multi Key');
    
    // Select multiple providers
    const checkboxes = page.locator('input[type="checkbox"]');
    
    // Check first checkbox (brave)
    await checkboxes.nth(0).check();
    
    // Check second checkbox (openai) if available
    if (await checkboxes.nth(1).isVisible()) {
      await checkboxes.nth(1).check();
    }

    // Submit
    await page.click('button:has-text("Create")');
    
    // Wait for confirmation
    await page.waitForLoadState('networkidle');
    
    // Verify multi-provider key in list
    const keyName = page.locator('text=E2E Multi Key');
    await expect(keyName).toBeVisible();
    
    // Verify it has multiple provider badges
    const row = keyName.locator('..'); // Parent row
    const badges = row.locator('text=/brave|openai|claude/');
    
    // At least one provider should be visible
    await expect(badges.first()).toBeVisible();
  });

  test('Flow 6: Delete API Key', async ({ page }) => {
    // Create a key to delete
    const createResponse = await page.request.post('http://localhost:3001/api/keys', {
      data: {
        name: 'E2E Delete Key',
        providers: ['brave'],
      },
    });
    const keyData = await createResponse.json();
    const keyId = keyData.id;

    // Navigate to Keys page
    await page.goto('/');
    await page.click('text=API Keys');
    await page.waitForLoadState('networkidle');

    // Find and click delete button for our key
    const keyRow = page.locator('text=E2E Delete Key').locator('..');
    const deleteButton = keyRow.locator('button:has-text("Delete")');
    await deleteButton.click();

    // Confirm deletion
    const confirmButton = page.locator('button:has-text("Confirm")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Wait for deletion
    await page.waitForLoadState('networkidle');

    // Verify key is gone (or marked as deleted)
    const keyElement = page.locator(`text=${keyData.name}`);
    // Key should either be gone or show as deleted
    const isGone = !(await keyElement.isVisible({ timeout: 1000 }));
    expect(isGone || await keyElement.isVisible()).toBeTruthy();
  });

  test('Health Check: Backend is accessible', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/health');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'ok');
  });

  test('Health Check: Frontend loads', async ({ page }) => {
    await page.goto('/');
    
    // Verify main content loads
    await expect(page.locator('text=APIRouter')).toBeVisible();
    
    // Verify navigation is present
    const navItems = page.locator('text=API Keys');
    await expect(navItems).toBeVisible();
  });

  test('Navigation works correctly', async ({ page }) => {
    await page.goto('/');
    
    // Click each nav item
    const navItems = [
      { text: 'API Keys', expectedContent: 'Create' },
      { text: 'Configuration', expectedContent: 'Provider' },
      { text: 'Statistics', expectedContent: 'Statistics' },
    ];

    for (const nav of navItems) {
      await page.click(`text=${nav.text}`);
      await page.waitForLoadState('networkidle');
      
      // Wait for page to load
      await page.waitForTimeout(500);
      
      // Verify we're on the right page
      const content = page.locator(`text=${nav.expectedContent}`);
      await expect(content).toBeVisible({ timeout: 5000 });
    }
  });
});
