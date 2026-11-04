import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { App } from './App';

test('renders the published components in jsdom', () => {
  render(<App />);
  expect(screen.getByTestId('primary-button')).toHaveTextContent(
    'Open side panel'
  );
  expect(screen.getByRole('table')).toBeInTheDocument();
  expect(screen.getByLabelText('Name')).toBeInTheDocument();
});

test('opens the side panel migrated from @carbon/ibm-products', async () => {
  render(<App />);
  await userEvent.click(screen.getByTestId('primary-button'));
  expect(await screen.findByText('Side panel content')).toBeVisible();
});
