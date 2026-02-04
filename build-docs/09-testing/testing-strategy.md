# Testing Strategy

## Overview

Project Gimbal implements a comprehensive testing strategy covering unit tests, integration tests, end-to-end tests, and performance tests to ensure quality and reliability.

## Testing Pyramid

```
                    /\
                   /  \
                  / E2E \
                 /--------\
                /          \
               / Integration\
              /--------------\
             /                \
            /   Unit Tests     \
           /____________________\

Unit Tests: 70%
Integration Tests: 20%
E2E Tests: 10%
```

## Testing Stack

### Frontend Testing
- **Unit Tests**: Jest + React Testing Library
- **Component Tests**: React Testing Library
- **E2E Tests**: Cypress
- **Visual Regression**: Percy or Chromatic (optional)
- **Performance**: Lighthouse CI

### Backend Testing
- **Database Tests**: pg-tap (PostgreSQL testing)
- **API Tests**: Supertest or Hoppscotch
- **Edge Function Tests**: Deno test framework

### Tools & Libraries
```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0",
    "@types/jest": "^29.0.0",
    "cypress": "^13.0.0",
    "vitest": "^1.0.0",
    "msw": "^2.0.0"
  }
}
```

## Unit Testing

### Configuration

#### `jest.config.js`
```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts'
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

#### `src/tests/setup.ts`
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
```

### Component Testing

#### Example: Button Component Test
```typescript
// src/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies disabled state', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant styles', () => {
    const { rerender } = render(<Button variant="primary">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');

    rerender(<Button variant="secondary">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');
  });
});
```

#### Example: Form Component Test
```typescript
// src/components/CampaignForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampaignForm } from './CampaignForm';

describe('CampaignForm', () => {
  it('validates required fields', async () => {
    const onSubmit = jest.fn();
    render(<CampaignForm onSubmit={onSubmit} />);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid form data', async () => {
    const onSubmit = jest.fn();
    render(<CampaignForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/name/i), 'Test Campaign');
    await userEvent.type(screen.getByLabelText(/content/i), 'Test content');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Test Campaign',
        content: 'Test content'
      });
    });
  });
});
```

### Custom Hook Testing

```typescript
// src/hooks/useCampaigns.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useCampaigns } from './useCampaigns';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useCampaigns', () => {
  it('fetches campaigns successfully', async () => {
    const { result } = renderHook(() => useCampaigns(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(3);
  });
});
```

### Utility Function Testing

```typescript
// src/utils/formatters.test.ts
import { formatCurrency, formatDate, formatPhoneNumber } from './formatters';

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('formats USD correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0.00');
    });
  });

  describe('formatDate', () => {
    it('formats date in correct format', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDate(date)).toBe('01/15/2024');
    });
  });

  describe('formatPhoneNumber', () => {
    it('formats US phone numbers', () => {
      expect(formatPhoneNumber('+11234567890')).toBe('(123) 456-7890');
    });
  });
});
```

## Integration Testing

### API Integration Tests

```typescript
// src/tests/integration/campaigns.test.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

describe('Campaign API', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create test user
    const { data } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'Test123!@#'
    });
    testUserId = data.user!.id;
  });

  afterAll(async () => {
    // Cleanup
    await supabase.from('campaigns').delete().eq('user_id', testUserId);
  });

  it('creates a campaign', async () => {
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        name: 'Test Campaign',
        type: 'sms',
        content: 'Test content',
        user_id: testUserId
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toMatchObject({
      name: 'Test Campaign',
      type: 'sms',
      status: 'draft'
    });
  });

  it('enforces RLS policies', async () => {
    // Try to access another user's campaign
    const { data, error } = await supabase
      .from('campaigns')
      .select()
      .eq('user_id', 'different-user-id');

    expect(data).toHaveLength(0);
  });
});
```

### Database Integration Tests

```sql
-- tests/database/test_campaigns.sql
BEGIN;
SELECT plan(5);

-- Test campaign creation
SELECT has_table('public', 'campaigns', 'campaigns table exists');

-- Test RLS is enabled
SELECT row_security_is_enabled('public', 'campaigns', 'RLS is enabled on campaigns');

-- Test default values
INSERT INTO campaigns (user_id, name, type, content)
VALUES ('test-user-id', 'Test', 'sms', 'Content');

SELECT is(status, 'draft', 'Default status is draft')
FROM campaigns
WHERE name = 'Test';

ROLLBACK;
```

## End-to-End Testing

### Cypress Configuration

#### `cypress.config.ts`
```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    env: {
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      supabaseKey: process.env.VITE_SUPABASE_ANON_KEY
    },
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true
  }
});
```

### E2E Test Examples

#### User Authentication Flow
```typescript
// cypress/e2e/auth.cy.ts
describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('logs in successfully', () => {
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('Password123!');
    cy.get('[data-testid="login-button"]').click();

    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="user-menu"]').should('contain', 'test@example.com');
  });

  it('shows error for invalid credentials', () => {
    cy.get('[data-testid="email-input"]').type('wrong@example.com');
    cy.get('[data-testid="password-input"]').type('wrongpassword');
    cy.get('[data-testid="login-button"]').click();

    cy.get('[data-testid="error-message"]').should('be.visible');
    cy.url().should('include', '/login');
  });

  it('logs out successfully', () => {
    // Login first
    cy.login('test@example.com', 'Password123!');

    // Logout
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();

    cy.url().should('include', '/login');
  });
});
```

#### Campaign Creation Flow
```typescript
// cypress/e2e/campaigns.cy.ts
describe('Campaign Management', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'Password123!');
    cy.visit('/campaigns');
  });

  it('creates a new SMS campaign', () => {
    cy.get('[data-testid="new-campaign-button"]').click();

    cy.get('[data-testid="campaign-name"]').type('Test SMS Campaign');
    cy.get('[data-testid="campaign-type"]').select('sms');
    cy.get('[data-testid="campaign-content"]').type('Hello {{first_name}}!');
    cy.get('[data-testid="save-campaign"]').click();

    cy.get('[data-testid="success-message"]').should('be.visible');
    cy.get('[data-testid="campaign-list"]').should('contain', 'Test SMS Campaign');
  });

  it('validates required fields', () => {
    cy.get('[data-testid="new-campaign-button"]').click();
    cy.get('[data-testid="save-campaign"]').click();

    cy.get('[data-testid="error-name"]').should('be.visible');
    cy.get('[data-testid="error-content"]').should('be.visible');
  });

  it('schedules a campaign', () => {
    cy.get('[data-testid="campaign-item"]').first().click();
    cy.get('[data-testid="schedule-button"]').click();

    cy.get('[data-testid="schedule-date"]').type('2024-12-25');
    cy.get('[data-testid="schedule-time"]').type('10:00');
    cy.get('[data-testid="confirm-schedule"]').click();

    cy.get('[data-testid="campaign-status"]').should('contain', 'Scheduled');
  });
});
```

### Custom Cypress Commands

```typescript
// cypress/support/commands.ts
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      createCampaign(data: CampaignData): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type(email);
    cy.get('[data-testid="password-input"]').type(password);
    cy.get('[data-testid="login-button"]').click();
    cy.url().should('include', '/dashboard');
  });
});

Cypress.Commands.add('createCampaign', (data) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('supabaseUrl')}/rest/v1/campaigns`,
    headers: {
      apikey: Cypress.env('supabaseKey'),
      'Content-Type': 'application/json'
    },
    body: data
  });
});
```

## Performance Testing

### Lighthouse CI Configuration

#### `.lighthouserc.json`
```json
{
  "ci": {
    "collect": {
      "startServerCommand": "npm run preview",
      "url": ["http://localhost:4173/"],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "categories:best-practices": ["error", {"minScore": 0.9}],
        "categories:seo": ["error", {"minScore": 0.9}]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### Load Testing

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
};

export default function () {
  const url = 'https://customer.gimbal.app/api/campaigns';
  const params = {
    headers: {
      'Authorization': `Bearer ${__ENV.API_TOKEN}`,
    },
  };

  const res = http.get(url, params);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

## Mock Service Worker (MSW)

### API Mocking for Tests

```typescript
// src/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/rest/v1/campaigns', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: '1',
          name: 'Test Campaign',
          type: 'sms',
          status: 'draft'
        }
      ])
    );
  }),

  rest.post('/rest/v1/campaigns', async (req, res, ctx) => {
    const body = await req.json();
    return res(
      ctx.status(201),
      ctx.json({
        id: '2',
        ...body
      })
    );
  }),
];
```

```typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```typescript
// src/tests/setup.ts
import { server } from '../mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Visual Regression Testing

### Percy Configuration

```javascript
// .percy.yml
version: 2
static:
  cleanUrls: true
snapshot:
  widths:
    - 375
    - 1280
  minHeight: 1024
  percyCSS: |
    iframe { display: none; }
```

```typescript
// cypress/e2e/visual.cy.ts
describe('Visual regression tests', () => {
  it('captures dashboard screenshot', () => {
    cy.login('test@example.com', 'Password123!');
    cy.visit('/dashboard');
    cy.percySnapshot('Dashboard');
  });

  it('captures campaign form', () => {
    cy.login('test@example.com', 'Password123!');
    cy.visit('/campaigns/new');
    cy.percySnapshot('Campaign Form');
  });
});
```

## Accessibility Testing

### axe-core Integration

```typescript
// cypress/e2e/accessibility.cy.ts
describe('Accessibility tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.injectAxe();
  });

  it('has no a11y violations on homepage', () => {
    cy.checkA11y();
  });

  it('has no a11y violations on campaign form', () => {
    cy.visit('/campaigns/new');
    cy.checkA11y();
  });
});
```

## Test Data Management

### Test Fixtures

```typescript
// cypress/fixtures/campaigns.json
{
  "draft": {
    "id": "uuid-1",
    "name": "Draft Campaign",
    "type": "sms",
    "status": "draft",
    "content": "Test content"
  },
  "scheduled": {
    "id": "uuid-2",
    "name": "Scheduled Campaign",
    "type": "email",
    "status": "scheduled",
    "scheduled_date": "2024-12-25T10:00:00Z"
  }
}
```

### Factory Functions

```typescript
// src/tests/factories/campaign.factory.ts
import { faker } from '@faker-js/faker';

export function createCampaign(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.company.catchPhrase(),
    type: faker.helpers.arrayElement(['sms', 'email']),
    status: 'draft',
    content: faker.lorem.paragraph(),
    created_at: faker.date.past().toISOString(),
    ...overrides
  };
}
```

## CI/CD Integration

### GitHub Actions Test Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: cypress-io/github-action@v5
        with:
          build: npm run build
          start: npm run preview
          wait-on: 'http://localhost:4173'
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: cypress-screenshots
          path: cypress/screenshots

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run lhci
```

## Test Coverage

### Coverage Requirements

- Overall: 70% minimum
- Critical paths: 90% minimum
- New code: 80% minimum

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

## Best Practices

### DO's

1. **Write tests first** (TDD approach)
2. **Test behavior, not implementation**
3. **Use meaningful test descriptions**
4. **Keep tests independent**
5. **Mock external dependencies**
6. **Test edge cases and error scenarios**
7. **Use data-testid for stable selectors**
8. **Clean up after tests**

### DON'Ts

1. **Don't test third-party libraries**
2. **Don't make tests dependent on each other**
3. **Don't use timeouts as assertions**
4. **Don't ignore failing tests**
5. **Don't test implementation details**
6. **Don't skip cleanup**

## Test Scripts

### package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:integration": "jest --config jest.integration.config.js",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open",
    "test:a11y": "cypress run --spec 'cypress/e2e/accessibility.cy.ts'",
    "test:visual": "percy exec -- cypress run",
    "test:perf": "lighthouse-ci",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

## Continuous Improvement

- Review test coverage weekly
- Update tests with bug fixes
- Add tests for reported bugs
- Refactor slow tests
- Remove obsolete tests
- Share testing best practices
