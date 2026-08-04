# Running Playwright Tests

## Quick Start

### Run All Tests
```bash
npx playwright test
```

### Run Specific Test File
```bash
npx playwright test tests/api-tests/smokeTest.spec.ts
```

### Run UI Tests Only
```bash
npx playwright test tests/ui-tests/
```

### Run API Tests Only
```bash
npx playwright test tests/api-tests/
```

### Run Specific Test by Name
```bash
npx playwright test --grep "Create and Delete Article"
```

### Run in Headed Mode (See Browser)
```bash
npx playwright test --headed
```

### Run with Debugging
```bash
npx playwright test --debug
```

### Generate HTML Report
```bash
npx playwright show-report
```

## Important Notes

**You do NOT need pytest or any "Smart Runner"**
- This is a pure Playwright project
- All tests are TypeScript Playwright tests
- Use `npx playwright` commands only

## System Requirements

- Node.js 18+ (already installed)
- Playwright browsers (install with `npx playwright install`)

## Before Running Tests

### For API Tests
- Make sure your API is running (`https://conduit-api.bondaracademy.com`)
- Tests create and delete articles automatically ✅

### For UI Tests  
- Make sure your UI is running on `localhost:3000` (or set `UI_URL` env var)
- UI tests create and delete articles automatically ✅

## Troubleshooting

### "net::ERR_CONNECTION_REFUSED" on UI tests
- The UI server isn't running
- Start your UI: check your project's start script
- Or set `UI_URL=<your-ui-url>` environment variable

### Tests hanging or timing out
- Check that your servers are running
- Increase timeout: `npx playwright test --timeout=60000`

### Article cleanup not working
- Automatic cleanup runs after each test via `afterEach` hook
- Check test output for cleanup logs
- Failed tests still cleanup (safety net enabled)

## Environment Variables

```bash
# Set custom UI URL
export UI_URL=http://localhost:3000

# Set custom API URL  
export API_URL=https://conduit-api.bondaracademy.com

# Run with user credentials
export TEST_EMAIL=your@email.com
export TEST_PASSWORD=your-password
```

## No Pytest Needed

This project uses **Playwright** for all testing:
- ✅ API tests using Playwright's request context
- ✅ UI tests using Playwright's page automation
- ❌ No pytest
- ❌ No Python dependencies
- ❌ No "Smart Runner" needed

Just use `npx playwright test` and you're done!
