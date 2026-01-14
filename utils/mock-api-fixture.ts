import { test as base } from '@playwright/test'

// Mock API responses for CI
const mockApiResponses: { [endpoint: string]: { status: string; message: string } } = {
  '/api/user': {
    status: 'error',
    message: 'missing authorization credentials'
  },
  // Add more endpoints as needed
}

type ApiFixture = {
  path: (endpoint: string) => {
    clearAuth: () => {
      headers: (headers: any) => {
        getRequest: (status: number) => Promise<any>
      }
    }
  }
}

export const test = base.extend<{ api: ApiFixture }>({
  api: async ({ request }, use) => {
    const api: ApiFixture = {
      path: (endpoint: string) => ({
        clearAuth: () => ({
          headers: (headers: any) => ({
            getRequest: async (status: number) => {
              if (process.env.CI && mockApiResponses[endpoint]) {
                return mockApiResponses[endpoint]
              }
              // ...existing code for real API call...
            }
          })
        })
      })
    }
    await use(api)
  }
})
