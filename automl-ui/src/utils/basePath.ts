const APPS_BASE_PATTERN = /^(\/apps(?:-internal)?\/[a-z0-9_-]+)/i
const NOTEBOOK_PROXY_PATTERN = /^(\/notebookSession\/[^/]+\/proxy\/\d+)/

export function getBasePath(pathname: string = window.location.pathname): string {
  const appsMatch = pathname.match(APPS_BASE_PATTERN)
  if (appsMatch) {
    return appsMatch[1]
  }

  const proxyMatch = pathname.match(NOTEBOOK_PROXY_PATTERN)
  if (proxyMatch) {
    return proxyMatch[1]
  }

  return ''
}
