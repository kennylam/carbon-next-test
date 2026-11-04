import { expect, test as base } from '@playwright/test';

const isWebComponents = (projectName) =>
  projectName.startsWith('web-components');

/** Fails the test on uncaught errors, console errors, and failed requests. */
function watchForErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      !message.text().startsWith('Failed to load resource')
    ) {
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on('response', (response) => {
    const url = response.url();
    // Font URLs are left unresolved by some bundlers; see the README.
    if (response.status() >= 400 && !/\.woff2?$/.test(url)) {
      errors.push(`${response.status()}: ${url}`);
    }
  });
  return errors;
}

const test = base.extend({
  page: async ({ page }, use) => {
    const errors = watchForErrors(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await use(page);
    expect(errors, 'page reported errors').toEqual([]);
  },
});

test('renders without errors', async ({ page }) => {
  await expect(page.getByTestId('primary-button')).toBeVisible();
  await expect(page.getByTestId('tag')).toBeVisible();
  await expect(page.getByTestId('toggle')).toBeVisible();
});

test('registers every custom element on the page', async ({
  page,
}, testInfo) => {
  test.skip(!isWebComponents(testInfo.project.name));
  const undefinedTags = await page.evaluate(() => [
    ...new Set(
      [...document.querySelectorAll('*')]
        .filter(
          (el) =>
            el.localName.includes('-') && !customElements.get(el.localName)
        )
        .map((el) => el.localName)
    ),
  ]);
  expect(undefinedTags).toEqual([]);
});

test('applies v12 tag radius by default', async ({ page }) => {
  const tag = page.getByTestId('tag');
  await expect(tag).toHaveCSS('border-top-left-radius', '4px');
});

test('opens an overlay', async ({ page }, testInfo) => {
  await page.getByTestId('primary-button').click();
  const overlay =
    {
      'web-components-webpack': page.getByText('Modal content'),
      // Slotted text sits under a zero-height host; check the panel itself.
      'web-components-vite': page.locator('cds-side-panel .cds--side-panel'),
    }[testInfo.project.name] ?? page.getByText('Side panel content');
  await expect(overlay).toBeVisible();
});

test('opens the v12 menu-based overflow menu', async ({ page }, testInfo) => {
  test.skip(
    !['react-vite', 'web-components-vite'].includes(testInfo.project.name)
  );
  await page.getByRole('button', { name: 'Actions' }).click();
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
});

test('server-renders with v12 enabled', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'react-nextjs');
  const html = await (await request.get('/')).text();
  expect(html).toContain('rendered-at:<!-- -->server<!-- --> v12:<!-- -->true');
});
