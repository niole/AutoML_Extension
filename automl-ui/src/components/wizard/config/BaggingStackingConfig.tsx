import Input from '../../common/Input'
import type { AdvancedAutoGluonConfig } from '../../../types/job'

interface BaggingStackingConfigProps {
  config: AdvancedAutoGluonConfig
  onChange: (key: keyof AdvancedAutoGluonConfig, value: unknown) => void
}

const MODEL_TYPES_OPTIONS = [
  { value: 'GBM', label: 'LightGBM' },
  { value: 'CAT', label: 'CatBoost' },
  { value: 'XGB', label: 'XGBoost' },
  { value: 'RF', label: 'Random Forest' },
  { value: 'XT', label: 'Extra Trees' },
  { value: 'KNN', label: 'K-Nearest Neighbors' },
  { value: 'LR', label: 'Linear Regression' },
  { value: 'NN_TORCH', label: 'Neural Network (PyTorch)' },
  { value: 'FASTAI', label: 'Neural Network (FastAI)' },
]

export function BaggingStackingConfig({ config, onChange }: BaggingStackingConfigProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Excluded Model Types
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Click to exclude model types from training. Excluded models are highlighted in red.
        </p>
        <div className="flex flex-wrap gap-2">
          {MODEL_TYPES_OPTIONS.map((model) => (
            <label
              key={model.value}
              className={`px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors border ${
                config.excluded_model_types?.includes(model.value)
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-domino-bg-tertiary hover border-domino-border'
              }`}
            >
              <input
                type="checkbox"
                className="hidden"
                checked={config.excluded_model_types?.includes(model.value) || false}
                onChange={(e) => {
                  const current = config.excluded_model_types || []
                  if (e.target.checked) {
                    onChange('excluded_model_types', [...current, model.value])
                  } else {
                    onChange('excluded_model_types', current.filter(m => m !== model.value))
                  }
                }}
              />
              {model.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bagging Folds
          </label>
          <Input
            type="number"
            min={2}
            max={10}
            value={config.num_bag_folds || ''}
            placeholder="Auto (typically 5-8)"
            onChange={(e) => onChange('num_bag_folds', e.target.value ? parseInt(e.target.value) : undefined)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Number of folds for bagging (2-10)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stack Levels
          </label>
          <Input
            type="number"
            min={0}
            max={3}
            value={config.num_stack_levels ?? ''}
            placeholder="Auto (preset-dependent)"
            onChange={(e) => onChange('num_stack_levels', e.target.value ? parseInt(e.target.value) : undefined)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Number of stacking levels (0-3)
          </p>
        </div>
      </div>

      <div className="flex items-center">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={config.auto_stack || false}
            onChange={(e) => onChange('auto_stack', e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm font-medium text-gray-700">Auto Stack</span>
        </label>
        <p className="text-xs text-gray-500 ml-4">
          Automatically determine optimal stacking configuration
        </p>
      </div>
    </div>
  )
}
