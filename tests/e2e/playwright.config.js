import { defineConfig, devices } from '@playwright/test';

export const apps = {
  'react-vite': {
    port: 4101,
    command: 'yarn workspace @carbon-next-test/react-vite preview',
  },
  'react-nextjs': {
    port: 4102,
    command: 'yarn workspace @carbon-next-test/react-nextjs start',
  },
  'web-components-vite': {
    port: 4103,
    command: 'yarn workspace @carbon-next-test/web-components-vite preview',
  },
  'web-components-webpack': {
    port: 4104,
    command: 'yarn workspace @carbon-next-test/web-components-webpack preview',
  },
};

const selected = process.env.APPS?.split(',') ?? Object.keys(apps);

export default defineConfig({
  testDir: './specs',
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { trace: 'retain-on-failure' },
  projects: selected.map((name) => ({
    name,
    use: {
      ...devices['Desktop Chrome'],
      baseURL: `http://localhost:${apps[name].port}`,
    },
  })),
  webServer: selected.map((name) => ({
    command: apps[name].command,
    port: apps[name].port,
    reuseExistingServer: !process.env.CI,
    cwd: '../..',
  })),
});
