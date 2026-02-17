import { getBasePath } from './basePath'

const DOMINO_EXPORT_ROOT = '/mnt/data/exports'
const LOCAL_EXPORT_ROOT = './local_data/exports'

export function isDominoRuntime(pathname: string = window.location.pathname): boolean {
  return getBasePath(pathname).length > 0
}

export function getDefaultExportPath(
  projectName: string,
  jobName: string,
  pathname: string = window.location.pathname,
): string {
  const baseDir = isDominoRuntime(pathname) ? DOMINO_EXPORT_ROOT : LOCAL_EXPORT_ROOT
  return `${baseDir}/${projectName}/${jobName}`
}
