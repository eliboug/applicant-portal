/**
 * Shared test helpers for Supabase Edge Functions
 *
 * These utilities help write consistent, maintainable tests for edge functions
 * with proper mocking and assertions.
 */

/**
 * Create a mock Request object for testing
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
  } = {}
): Request {
  const { method = 'POST', body, headers = {} } = options

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  }

  return new Request(url, {
    method,
    headers: defaultHeaders,
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * Create a mock authenticated request with Supabase auth token
 */
export function createAuthenticatedRequest(
  url: string,
  token: string = 'mock-token',
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
  } = {}
): Request {
  return createMockRequest(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'apikey': 'mock-anon-key',
    },
  })
}

/**
 * Parse response body as JSON
 */
export async function parseJsonResponse(response: Response): Promise<any> {
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

/**
 * Assert response has expected status and body
 */
export async function assertResponse(
  response: Response,
  expectedStatus: number,
  expectedBody?: any
) {
  if (response.status !== expectedStatus) {
    const body = await parseJsonResponse(response)
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}. Body: ${JSON.stringify(body)}`
    )
  }

  if (expectedBody !== undefined) {
    const actualBody = await parseJsonResponse(response)
    const actualStr = JSON.stringify(actualBody)
    const expectedStr = JSON.stringify(expectedBody)

    if (actualStr !== expectedStr) {
      throw new Error(
        `Expected body ${expectedStr}, got ${actualStr}`
      )
    }
  }
}

/**
 * Mock environment variables for testing
 */
export class MockEnv {
  private originalEnv: Map<string, string | undefined> = new Map()

  /**
   * Set a mock environment variable
   */
  set(key: string, value: string): void {
    if (!this.originalEnv.has(key)) {
      this.originalEnv.set(key, Deno.env.get(key))
    }
    Deno.env.set(key, value)
  }

  /**
   * Delete an environment variable
   */
  delete(key: string): void {
    if (!this.originalEnv.has(key)) {
      this.originalEnv.set(key, Deno.env.get(key))
    }
    Deno.env.delete(key)
  }

  /**
   * Restore all original environment variables
   */
  restore(): void {
    for (const [key, value] of this.originalEnv.entries()) {
      if (value === undefined) {
        Deno.env.delete(key)
      } else {
        Deno.env.set(key, value)
      }
    }
    this.originalEnv.clear()
  }
}

/**
 * Helper to test environment variable validation
 *
 * Example:
 * ```ts
 * await testEnvVarRequired('STRIPE_SECRET_KEY', () => {
 *   // Code that should throw when env var is missing
 *   new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '')
 * })
 * ```
 */
export async function testEnvVarRequired(
  envVar: string,
  fn: () => void | Promise<void>
): Promise<void> {
  const mockEnv = new MockEnv()

  try {
    mockEnv.delete(envVar)
    let threwError = false

    try {
      await fn()
    } catch (error) {
      threwError = true
    }

    if (!threwError) {
      throw new Error(`Expected function to throw when ${envVar} is not set`)
    }
  } finally {
    mockEnv.restore()
  }
}

/**
 * Mock Supabase client for testing
 */
export function createMockSupabaseClient() {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
  }
}

/**
 * Wait for a condition to be true (useful for async testing)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`)
}
