# Copilot Instructions

Write automated test in Playwright following these guidelines:
- Follow Playwright with XState best practices
- Do not add comments to each line of code
- Write only the Playwright test steps for the scenario
- Read and analyze the provided DOM context from the browser
- Use DOM Relationships, if no stable attribute exists, use hierarchical or relative locators
- Create one test at a time unless specifically asked for multiple tests
- Prioritize ‘getByRole()’ ‘getByText()’ selectors over ‘locator()’ when possible
- Keep test code clean and focused on the test scenario
- Don’t add assertions unless asked
- For the random test data, keep it short and compact. Don’t write long texts
- Use async/await syntax for asynchronous operations
- Use POM structure, utilise Config Manager, Driver Factory, Test Utilities, Fixtures, and other design patterns where applicable
- Use TypeScript features effectively, including types and interfaces
- Ensure tests are maintainable and scalable
- Avoid hardcoding values; use variables or constants where appropriate
- Follow the AAA (Arrange, Act, Assert) pattern in test structure
- Ensure proper error handling and reporting in tests
- Optimize test execution time without compromising reliability
- Use Playwright’s built-in features for parallelism and retries where applicable
- Keep accessibility in mind while writing tests
- Ensure tests are idempotent and can be run multiple times without side effects
- Follow the project’s coding standards and conventions
- Ensure tests are compatible with CI/CD pipelines
- Regularly review and refactor tests to maintain quality and relevance
- Stay updated with the latest Playwright with XState features and best practices