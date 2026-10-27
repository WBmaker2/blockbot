import { expect, test, type Page } from '@playwright/test';

async function prepare(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('.blocklySvg')).toBeVisible();
}

async function switchToText(page: Page, code: string): Promise<void> {
  await page.getByRole('tab', { name: '텍스트' }).click();
  await expect(page.locator('#code-input')).toBeVisible();
  await page.locator('#code-input').fill(code);
  await expect(page.locator('#text-error')).toHaveText('');
}

async function ensurePaletteOpen(page: Page): Promise<void> {
  const flyout = page.locator('.blocklyFlyout:not(.blocklyTrashcanFlyout)');
  if (!(await flyout.isVisible())) {
    await page.locator('#palette-toggle').click();
  }
  await expect(flyout).toBeVisible();
  await expect(page.locator('#palette-toggle')).toHaveAttribute('aria-expanded', 'true');
}

async function dragMoveBlock(page: Page, x: number, y: number): Promise<void> {
  await ensurePaletteOpen(page);
  const block = page.locator('.blocklyFlyout .blocklyDraggable').first();
  const box = await block.boundingBox();
  if (!box) throw new Error('Flyout block has no bounding box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 18 });
  await page.mouse.up();
  await page.waitForTimeout(180);
}

async function tabTo(page: Page, selector: string): Promise<void> {
  for (let i = 0; i < 90; i += 1) {
    const focused = await page.evaluate(
      (target) => document.activeElement?.matches(target) ?? false,
      selector
    );
    if (focused) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Could not tab to ${selector}`);
}

test.describe('BlockBot play flow', () => {
  test.beforeEach(async ({ page }) => {
    await prepare(page);
  });

  test('shows coding blocks by default and toggles the palette', async ({ page }) => {
    const flyout = page.locator('.blocklyFlyout:not(.blocklyTrashcanFlyout)');
    await expect(flyout).toBeVisible();
    await expect(page.locator('.blocklyFlyoutLabelText')).toHaveText('동작');
    await expect(page.locator('.blocklyFlyout .blocklyDraggable')).toHaveCount(1);
    await expect(page.locator('#palette-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#palette-toggle')).toContainText('블록 숨기기');

    await page.locator('#palette-toggle').click();
    await expect(flyout).toBeHidden();
    await expect(page.locator('#palette-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#palette-toggle')).toContainText('블록 펼치기');

    await page.locator('#palette-toggle').click();
    await expect(flyout).toBeVisible();
    await expect(page.locator('.blocklyFlyout .blocklyDraggable')).toHaveCount(1);
  });

  test('shows repeat and condition blocks without an editor error', async ({ page }) => {
    await page.locator('#open-challenges').click();
    await page.locator('.challenge-card', { hasText: '마지막 미로' }).click();

    await expect(page.locator('#challenge-title')).toHaveText('마지막 미로');
    await expect(page.locator('#block-count')).toContainText('블록 0 · 기준 11');
    await expect(page.locator('.blocklyFlyoutLabelText')).toHaveText(['동작', '반복', '조건']);
    await expect(page.locator('.blocklyFlyout .blocklyDraggable')).toHaveCount(6);
    await expect(page.locator('.toast')).toHaveCount(0);
  });

  test('drags move blocks into the workspace and solves the first challenge', async ({ page }) => {
    await dragMoveBlock(page, 420, 330);
    await dragMoveBlock(page, 420, 410);
    await dragMoveBlock(page, 420, 490);

    await expect(page.locator('#block-count')).toContainText('블록 3');

    await page.locator('#run-button').click();
    await expect(page.locator('.blocklyHighlighted').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#success-card')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#success-stars')).toHaveText('★★★');
    await expect(page.locator('#status-result')).toHaveText('성공!');
    await expect(page.locator('#status-position')).toHaveText('(3, 2)');

    const state = await page.evaluate(() => window.blockbot?.getState());
    expect(state?.actions).toHaveLength(3);
    expect(state?.stars).toBe(3);
  });

  test('steps one action at a time and finishes with success', async ({ page }) => {
    await switchToText(page, 'move\nmove\nmove');

    for (let step = 1; step <= 3; step += 1) {
      await page.locator('#step-button').click();
      await expect
        .poll(async () => (await page.evaluate(() => window.blockbot?.getState()))?.index)
        .toBe(step);
    }

    await expect(page.locator('#success-card')).toBeVisible({ timeout: 10_000 });
    const state = await page.evaluate(() => window.blockbot?.getState());
    expect(state?.status).toBe('success');
    expect(state?.robot).toEqual({ x: 3, z: 2, dir: 'E' });
  });

  test('pauses and resumes a running program', async ({ page }) => {
    await switchToText(page, 'move\nmove\nmove');
    await page.locator('#run-button').click();
    await page.waitForTimeout(280);
    await page.locator('#pause-button').click();
    await expect(page.locator('#status-result')).toHaveText('일시정지');

    await page.waitForTimeout(400);
    const paused = await page.evaluate(() => window.blockbot?.getState());
    expect(paused?.status).toBe('paused');

    await page.locator('#run-button').click();
    await expect(page.locator('#success-card')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#status-result')).toHaveText('성공!');
  });

  test('shows a clear wall collision error and unlocks a hint', async ({ page }) => {
    await page.locator('#open-challenges').click();
    await page.locator('.challenge-card', { hasText: '벽을 만나면' }).click();
    await expect(page.locator('#challenge-title')).toHaveText('벽을 만나면');
    await expect(page.locator('#hint-button')).toBeDisabled();

    await switchToText(page, 'move\nmove');
    await page.locator('#run-button').click();

    await expect(page.locator('#world-message')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#world-message')).toContainText('벽');
    await expect(page.locator('#status-result')).toHaveText('오류');
    await expect(page.locator('#hint-button')).toBeEnabled();

    await page.locator('#hint-button').click();
    await expect(page.locator('#hint-text')).toBeVisible();
    await expect(page.locator('#hint-text')).toContainText('오른쪽');
  });

  test('solves the first challenge with the keyboard only', async ({ page }) => {
    await tabTo(page, '[data-mode="blocks"]');
    await page.keyboard.press('ArrowRight');
    await tabTo(page, '#code-input');
    await page.keyboard.type('move\nmove\nmove');
    await page.keyboard.press('Control+Enter');

    await expect(page.locator('#success-card')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#success-stars')).toHaveText('★★★');
  });

  test('persists stars after reload and resets progress in teacher mode', async ({ page }) => {
    await switchToText(page, 'move\nmove\nmove');
    await page.locator('#run-button').click();
    await expect(page.locator('#success-card')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#progress-count')).toHaveText('1 / 10');

    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('#progress-count')).toHaveText('1 / 10');

    await page.locator('#open-challenges').click();
    await expect(
      page.locator('.challenge-card').first().locator('.challenge-card__stars')
    ).toHaveText('★★★');
    await page.locator('#challenges-close').click();

    page.on('dialog', (dialog) => void dialog.accept());
    await page.locator('#open-teacher').click();
    await page.locator('[data-teacher="reset"]').click();
    await expect(page.locator('#progress-count')).toHaveText('0 / 10');
    await expect(page.locator('.toast')).toContainText('초기화');
  });

  test('generates a printable teacher worksheet', async ({ page }) => {
    await page.evaluate(() => {
      window.print = () => undefined;
    });
    await page.locator('#open-teacher').click();
    await page.locator('[data-teacher="print"]').click();
    await expect(page.locator('#worksheet-print')).toContainText('BlockBot 학습지');
    await expect(page.locator('#worksheet-print')).toContainText('첫걸음');
    await expect(page.locator('#worksheet-print .worksheet-grid td')).toHaveCount(25);
  });

  test('switches to reduced motion and high contrast settings', async ({ page }) => {
    await page.locator('#open-settings').click();
    await page.locator('.settings-row', { hasText: '애니메이션 줄이기' }).locator('input').check();
    await page.locator('.settings-row', { hasText: '고대비 화면' }).locator('input').check();

    await expect(page.locator('html')).toHaveClass(/reduced-motion/);
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
    await page.locator('#settings-close').click();

    await switchToText(page, 'move\nmove\nmove');
    await page.locator('#run-button').click();
    await expect(page.locator('#success-card')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Responsive and accessibility', () => {
  test('phone layout keeps controls visible and fits horizontally', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');

    await expect(page.locator('[data-mobile-panel="world"]')).toBeVisible();
    await page.locator('[data-mobile-panel="world"]').click();
    await expect(page.locator('#world-panel')).toBeVisible();
    await expect(page.locator('#editor-panel')).toBeHidden();
    await expect(page.locator('#run-button')).toBeInViewport();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('passes an axe-core scan on the play screen', async ({ page }) => {
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    await page.goto('/');
    await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious'
    );
    expect(serious).toEqual([]);
  });
});
