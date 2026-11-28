async (page) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Dismiss intro splash if present
  const skipBtn = page.getByRole('button', { name: /skip|continue|get started/i });
  if (await skipBtn.first().isVisible().catch(() => false)) {
    await skipBtn.first().click();
    await page.waitForTimeout(300);
  }

  // Click Select button in filter bar
  const selectBtn = page.getByRole('button', { name: /^Select$/i });
  await selectBtn.scrollIntoViewIfNeeded();
  await selectBtn.click();
  await page.waitForTimeout(250);

  // Select first two reminders via their checkboxes
  const checkboxes = page.getByRole('checkbox');
  const cbCount = await checkboxes.count();
  if (cbCount < 2) throw new Error('Expected at least 2 starter reminders, got ' + cbCount);
  await checkboxes.nth(0).click();
  await checkboxes.nth(1).click();
  await page.waitForTimeout(250);

  // Verify floating dock shows "2 selected"
  const dock = page.getByRole('region', { name: 'Bulk reminder actions' });
  const dockText = await dock.textContent();
  if (!dockText || !dockText.includes('2 selected')) {
    throw new Error('Expected "2 selected" in dock, got: ' + dockText);
  }
  await page.screenshot({ path: '.playwright-cli/verify-select-desktop.png' });

  // Open Delete confirmation modal
  await dock.getByRole('button', { name: /Delete 2 selected/i }).click();
  await page.waitForTimeout(250);
  const dialog = page.getByRole('dialog');
  const dialogText = await dialog.textContent();
  if (!dialogText || !dialogText.includes('Delete 2 reminders?')) {
    throw new Error('Expected Delete 2 reminders? modal, got: ' + dialogText);
  }
  await page.screenshot({ path: '.playwright-cli/verify-delete-modal.png' });

  // Cancel modal and verify selection preserved
  await dialog.getByRole('button', { name: /^Cancel$/i }).click();
  await page.waitForTimeout(200);
  const stillText = await dock.textContent();
  if (!stillText || !stillText.includes('2 selected')) {
    throw new Error('Selection not preserved after cancel: ' + stillText);
  }

  // Bulk complete both reminders
  await dock.getByRole('button', { name: /Mark 2 selected/i }).click();
  await page.waitForTimeout(300);
  const dockVisibleAfterComplete = await dock.isVisible().catch(() => false);
  if (dockVisibleAfterComplete) {
    throw new Error('Expected dock to close after bulk complete');
  }

  // Test mobile layout (390x844) with Select All active
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  const mobileSelectBtn = page.getByRole('button', { name: /^Select$/i });
  await mobileSelectBtn.scrollIntoViewIfNeeded();
  await mobileSelectBtn.click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: /Select all visible reminders/i }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: '.playwright-cli/verify-select-mobile.png' });

  // Confirm bulk delete works cleanly
  await page.getByRole('button', { name: /Delete 3 selected/i }).click();
  await page.waitForTimeout(200);
  await page.getByRole('dialog').getByRole('button', { name: /^Delete 3$/i }).click();
  await page.waitForTimeout(300);

  return 'VERIFIED_ALL_FLOWS_OK';
}
