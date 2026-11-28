async (page) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForFunction(() => Boolean(window.__introCanvasReady), { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);

  const downloadPromise = page.waitForEvent('download', { timeout: 120000 });
  await page.evaluate(() => window.__startCanvasRecording());
  const download = await downloadPromise;
  await download.saveAs('.playwright-cli/intro-raw.webm');
}
