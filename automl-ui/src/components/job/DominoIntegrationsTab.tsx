import type { Job } from '../../types/job'

interface DominoIntegrationsTabProps {
  job: Job
}

export function DominoIntegrationsTab({ job }: DominoIntegrationsTabProps) {
  const experimentUrl = toDominoTenantUrl(job?.experiment_run_url)
  const dominoJobUrl = toDominoTenantUrl(job?.domino_job_url)

  return (
    <div className="space-y-6">
      {/* Model Registry */}
      <SectionCard
        title="Model Registry"
        description="Registered model versions tracked in Domino."
      >
        {job?.is_registered && job.registered_model_name ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-domino-accent-green/10 text-domino-accent-green">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Registered
              </span>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-domino-text-secondary">Model name</dt>
              <dd className="text-domino-text-primary font-medium">
                {experimentUrl ? (
                  <a href={experimentUrl} target="_blank" rel="noreferrer" className="text-[#3B3BD3] hover:underline">
                    {job.registered_model_name}
                    <ExternalLinkIcon className="inline ml-1 -mt-0.5" />
                  </a>
                ) : (
                  job.registered_model_name
                )}
              </dd>
              <dt className="text-domino-text-secondary">Version</dt>
              <dd className="text-domino-text-primary">{job.registered_model_version || '\u2014'}</dd>
            </dl>
          </div>
        ) : (
          <EmptyState
            message="No model registered in Domino yet."
            action="Register via the Deploy menu in the header."
          />
        )}
      </SectionCard>

      {/* Model API */}
      <SectionCard
        title="Model API"
        description="Domino Model API endpoint deployed from this model."
      >
        {dominoJobUrl && job?.domino_job_id ? (
          <div className="space-y-3">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-domino-text-secondary">Domino job</dt>
              <dd>
                <a href={dominoJobUrl} target="_blank" rel="noreferrer" className="text-sm text-[#3B3BD3] hover:underline break-all">
                  {job.domino_job_id}
                  <ExternalLinkIcon className="inline ml-1 -mt-0.5" />
                </a>
              </dd>
              {job.domino_job_status && (
                <>
                  <dt className="text-domino-text-secondary">Status</dt>
                  <dd className="text-domino-text-primary">{job.domino_job_status}</dd>
                </>
              )}
            </dl>
          </div>
        ) : (
          <EmptyState
            message="No Model API deployed yet."
            action="Publish via the Deploy menu in the header."
          />
        )}
      </SectionCard>

      {/* Experiment Tracking */}
      <SectionCard
        title="Experiment Tracking"
        description="MLflow experiment runs and metrics logged during training."
      >
        {experimentUrl ? (
          <div className="space-y-3">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              {job.experiment_name && (
                <>
                  <dt className="text-domino-text-secondary">Experiment</dt>
                  <dd>
                    {experimentUrl ? (
                      <a href={experimentUrl} target="_blank" rel="noreferrer" className="text-sm text-[#3B3BD3] hover:underline">
                        {job.experiment_name}
                        <ExternalLinkIcon className="inline ml-1 -mt-0.5" />
                      </a>
                    ) : (
                      <span className="text-domino-text-primary">{job.experiment_name}</span>
                    )}
                  </dd>
                </>
              )}
              {(job.experiment_id || job.experiment_run_id) && (
                <>
                  <dt className="text-domino-text-secondary">Run ID</dt>
                  <dd>
                    {experimentUrl ? (
                      <a href={experimentUrl} target="_blank" rel="noreferrer" className="text-sm font-mono text-[#3B3BD3] hover:underline break-all">
                        {job.experiment_run_id || job.experiment_id}
                        <ExternalLinkIcon className="inline ml-1 -mt-0.5" />
                      </a>
                    ) : (
                      <span className="text-domino-text-primary font-mono text-xs break-all">
                        {job.experiment_run_id || job.experiment_id}
                      </span>
                    )}
                  </dd>
                </>
              )}
            </dl>
          </div>
        ) : (
          <EmptyState message="No experiment tracking data for this job." />
        )}
      </SectionCard>
    </div>
  )
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="border border-domino-border rounded overflow-hidden">
      <div className="bg-domino-bg-secondary px-4 py-2.5 border-b border-domino-border">
        <h3 className="text-sm font-medium text-domino-text-primary">{title}</h3>
        <p className="text-xs text-domino-text-muted mt-0.5">{description}</p>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  )
}

function EmptyState({ message, action }: { message: string; action?: string }) {
  return (
    <div className="text-center py-4">
      <p className="text-sm text-domino-text-muted">{message}</p>
      {action && (
        <p className="text-xs text-domino-text-muted mt-1">{action}</p>
      )}
    </div>
  )
}

function ExternalLinkIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-3.5 h-3.5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}

function toDominoTenantUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null
  try {
    const tenantUrl = new URL(window.location.origin)
    if (tenantUrl.hostname.startsWith('apps.')) {
      tenantUrl.hostname = tenantUrl.hostname.slice('apps.'.length)
    }
    const url = new URL(rawUrl, tenantUrl.origin)
    url.protocol = tenantUrl.protocol
    url.hostname = tenantUrl.hostname
    url.port = tenantUrl.port
    return url.toString()
  } catch {
    return rawUrl
  }
}
