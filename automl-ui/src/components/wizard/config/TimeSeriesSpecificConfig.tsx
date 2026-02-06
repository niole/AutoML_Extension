import Select from '../../common/Select'
import type { TimeSeriesAdvancedConfig } from '../../../types/job'

interface TimeSeriesSpecificConfigProps {
  config: TimeSeriesAdvancedConfig
  onChange: (key: keyof TimeSeriesAdvancedConfig, value: unknown) => void
}

const CHRONOS_SIZES = [
  { value: 'tiny', label: 'Tiny (8M params)' },
  { value: 'mini', label: 'Mini (20M params)' },
  { value: 'small', label: 'Small (46M params)' },
  { value: 'base', label: 'Base (200M params)' },
  { value: 'large', label: 'Large (710M params)' },
]

export function TimeSeriesSpecificConfig({ config, onChange }: TimeSeriesSpecificConfigProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Frequency
          </label>
          <Select
            value={config.freq || ''}
            onChange={(e) => onChange('freq', e.target.value || undefined)}
            options={[
              { value: '', label: 'Auto-detect' },
              { value: 'D', label: 'Daily' },
              { value: 'W', label: 'Weekly' },
              { value: 'M', label: 'Monthly' },
              { value: 'H', label: 'Hourly' },
              { value: 'T', label: 'Minutely' },
              { value: 'Q', label: 'Quarterly' },
              { value: 'Y', label: 'Yearly' },
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Scaler
          </label>
          <Select
            value={config.target_scaler || ''}
            onChange={(e) => onChange('target_scaler', e.target.value || undefined)}
            options={[
              { value: '', label: 'Default' },
              { value: 'mean_abs', label: 'Mean Absolute' },
              { value: 'standard', label: 'Standard' },
              { value: 'min_max', label: 'Min-Max' },
              { value: 'identity', label: 'No Scaling' },
            ]}
          />
        </div>
      </div>

      <div className="border-t pt-6">
        <h4 className="font-medium mb-4">Chronos Foundation Model</h4>
        <div className="space-y-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.use_chronos || false}
              onChange={(e) => onChange('use_chronos', e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">Use Chronos</span>
          </label>

          {config.use_chronos && (
            <div className="ml-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model Size
              </label>
              <Select
                value={config.chronos_model_size || 'tiny'}
                onChange={(e) => onChange('chronos_model_size', e.target.value)}
                options={CHRONOS_SIZES}
              />
              <p className="text-xs text-gray-500 mt-1">
                Larger models are more accurate but require more memory
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={config.enable_ensemble !== false}
            onChange={(e) => onChange('enable_ensemble', e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm font-medium text-gray-700">Enable Ensemble</span>
        </label>
      </div>
    </div>
  )
}
