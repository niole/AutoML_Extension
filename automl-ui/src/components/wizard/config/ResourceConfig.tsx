import Input from '../../common/Input'
import Select from '../../common/Select'
import type { AdvancedAutoGluonConfig } from '../../../types/job'

interface ResourceConfigProps {
  config: AdvancedAutoGluonConfig
  onChange: (key: keyof AdvancedAutoGluonConfig, value: unknown) => void
}

export function ResourceConfig({ config, onChange }: ResourceConfigProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Number of GPUs
        </label>
        <Input
          type="number"
          min={0}
          value={config.num_gpus || 0}
          onChange={(e) => onChange('num_gpus', parseInt(e.target.value) || 0)}
        />
        <p className="text-xs text-gray-500 mt-1">
          Set to 0 for CPU-only training
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Number of CPUs
        </label>
        <Input
          type="number"
          min={1}
          value={config.num_cpus || ''}
          placeholder="Auto-detect"
          onChange={(e) => onChange('num_cpus', e.target.value ? parseInt(e.target.value) : undefined)}
        />
        <p className="text-xs text-gray-500 mt-1">
          Leave empty for automatic detection
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Verbosity Level
        </label>
        <Select
          value={String(config.verbosity || 2)}
          onChange={(e) => onChange('verbosity', parseInt(e.target.value))}
          options={[
            { value: '0', label: '0 - Silent' },
            { value: '1', label: '1 - Errors only' },
            { value: '2', label: '2 - Normal (default)' },
            { value: '3', label: '3 - Detailed' },
            { value: '4', label: '4 - Debug' },
          ]}
        />
      </div>

      <div className="flex items-start pt-6">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={config.cache_data !== false}
            onChange={(e) => onChange('cache_data', e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm font-medium text-gray-700">
            Cache data in memory
          </span>
        </label>
      </div>
    </div>
  )
}
