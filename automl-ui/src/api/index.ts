import { getBasePath } from '../utils/basePath'

// Extend window type for runtime config
declare global {
  interface Window {
    APP_CONFIG?: {
      API_URL?: string
    }
  }
}

// For Domino Apps: use simple single-segment endpoints
const DOMINO_MODE = true

/**
 * Convert an endpoint name to a Domino-safe single-segment path.
 *
 * Convention: strip slashes, take the last segment, prepend "svc".
 *   "health"       -> "svchealth"
 *   "jobcreate"    -> "svcjobcreate"
 *   "health/user"  -> "svcuser"
 *
 * For the rare cases where the endpoint name does NOT follow the convention
 * (e.g. a typo in the caller vs. backend), use ENDPOINT_OVERRIDES.
 */
const ENDPOINT_OVERRIDES: Record<string, string> = {
  // Key typed as "modenapicreate" in callers but backend route is "svcmodelapicreate"
  'modenapicreate': 'svcmodelapicreate',
}

function toDominoPath(endpoint: string): string {
  if (ENDPOINT_OVERRIDES[endpoint]) {
    return ENDPOINT_OVERRIDES[endpoint]
  }
  // Take the last path segment (handles "health/user" -> "user")
  const segments = endpoint.split('/')
  const lastSegment = segments[segments.length - 1]
  return `svc${lastSegment}`
}

// Fetch-based API client
class ApiClient {
  private defaultHeaders: Record<string, string>

  constructor() {
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    config?: { params?: Record<string, string | number | boolean | undefined> }
  ): Promise<{ data: T }> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint

    let fullUrl: string
    if (DOMINO_MODE) {
      // Convert to single-segment Domino-safe path (convention: "svc" + endpoint)
      const mappedPath = toDominoPath(cleanEndpoint)
      const basePath = getBasePath()
      fullUrl = `${basePath}/${mappedPath}`
    } else {
      fullUrl = `/api/v1/${cleanEndpoint}`
    }

    // Add query params
    if (config?.params) {
      const searchParams = new URLSearchParams()
      Object.entries(config.params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        fullUrl += `?${queryString}`
      }
    }

    const headers: Record<string, string> = { ...this.defaultHeaders }
    const fetchConfig: RequestInit = {
      method,
      headers,
      credentials: 'include',
    }

    if (data && method !== 'GET') {
      if (data instanceof FormData) {
        delete headers['Content-Type']
        fetchConfig.body = data
      } else {
        fetchConfig.body = JSON.stringify(data)
      }
    }

    try {
      console.log(`[API] ${method} ${fullUrl}`)
      const response = await fetch(fullUrl, fetchConfig)
      console.log(`[API] Response status: ${response.status}, content-type: ${response.headers.get('content-type')}`)

      if (!response.ok) {
        // Check if response is HTML (common when Domino intercepts)
        const contentType = response.headers.get('content-type') || ''
        if (contentType.includes('text/html')) {
          console.error(`[API] Received HTML response instead of JSON for ${fullUrl}`)
          console.error('[API] This usually means Domino is intercepting the request')
          throw new Error(`API returned HTML instead of JSON (status ${response.status}). Check if endpoint exists.`)
        }
        const errorData = await response.json().catch(() => ({}))
        // Handle Pydantic validation errors (array of objects)
        let message: string
        if (Array.isArray(errorData.detail)) {
          message = errorData.detail.map((e: { msg?: string; loc?: string[] }) =>
            e.msg ? `${e.loc?.join('.')}: ${e.msg}` : JSON.stringify(e)
          ).join('; ')
        } else if (typeof errorData.detail === 'object' && errorData.detail !== null) {
          message = JSON.stringify(errorData.detail)
        } else {
          message = errorData.detail || errorData.error || response.statusText || 'An error occurred'
        }
        console.error('API Error:', message)
        throw new Error(message)
      }

      if (response.status === 204) {
        return { data: {} as T }
      }

      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('text/html')) {
        const htmlPreview = await response.text()
        console.error(`[API] Received HTML instead of JSON for ${fullUrl}:`, htmlPreview.substring(0, 200))
        throw new Error('API returned HTML instead of JSON')
      }

      const responseData = await response.json()
      return { data: responseData }
    } catch (error) {
      console.error(`[API] Error for ${fullUrl}:`, error)
      throw error
    }
  }

  async get<T>(url: string, config?: { params?: Record<string, string | number | boolean | undefined> }): Promise<{ data: T }> {
    return this.request<T>('GET', url, undefined, config)
  }

  async post<T>(url: string, data?: unknown): Promise<{ data: T }> {
    return this.request<T>('POST', url, data)
  }

  async put<T>(url: string, data?: unknown): Promise<{ data: T }> {
    return this.request<T>('PUT', url, data)
  }

  async patch<T>(url: string, data?: unknown): Promise<{ data: T }> {
    return this.request<T>('PATCH', url, data)
  }

  async delete<T>(url: string): Promise<{ data: T }> {
    return this.request<T>('DELETE', url)
  }
}

const api = new ApiClient()

export default api
