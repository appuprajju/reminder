async (page) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForFunction(() => Boolean(window.__introCanvasReady), { timeout: 15000 });
  const total = await page.evaluate(() => window.__renderAndPipeAllFrames());
  return `Rendered ${total} deterministic 30fps frames`;
}
