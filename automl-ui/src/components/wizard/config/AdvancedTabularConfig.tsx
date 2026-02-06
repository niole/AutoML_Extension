import Input from '../../common/Input'
import type { AdvancedAutoGluonConfig } from '../../../types/job'

interface AdvancedTabularConfigProps {
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

export function AdvancedTabularConfig({ config, onChange }: AdvancedTabularConfigProps) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-amber-50 rounded-lg">
        <h4 className="font-medium text-amber-900 mb-2">Expert Options</h4>
        <p className="text-sm text-amber-700">
          These advanced options are for experienced users. Modifying them may significantly impact training behavior.
        </p>
      </div>

      {/* Knowledge Distillation */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-3">Knowledge Distillation</h4>
        <p className="text-xs text-gray-500 mb-4">
          Transfer knowledge from the ensemble to a single faster model for deployment
        </p>

        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.distill || false}
              onChange={(e) => onChange('distill', e.target.checked)}
              className="rounded border-gray-300"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Enable Distillation</span>
              <p className="text-xs text-gray-500">Create a faster student model from the ensemble</p>
            </div>
          </label>

          {config.distill && (
            <div className="ml-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Distillation Time Limit (seconds)
              </label>
              <Input
                type="number"
                min={60}
                value={config.distill_time_limit || ''}
                placeholder="Auto (based on training time)"
                onChange={(e) => onChange('distill_time_limit', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Include Model Types */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-3">Include Only Specific Models</h4>
        <p className="text-xs text-gray-500 mb-4">
          Whitelist specific model types to include (overrides excluded models)
        </p>
        <div className="flex flex-wrap gap-2">
          {MODEL_TYPES_OPTIONS.map((model) => (
            <label
              key={model.value}
              className={`px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors border ${
                config.included_model_types?.includes(model.value)
                  ? 'bg-green-100 text-green-800 border-green-300'
                  : 'bg-domino-bg-tertiary hover border-domino-border'
              }`}
            >
              <input
                type="checkbox"
                className="hidden"
                checked={config.included_model_types?.includes(model.value) || false}
                onChange={(e) => {
                  const current = config.included_model_types || []
                  if (e.target.checked) {
                    onChange('included_model_types', [...current, model.value])
                  } else {
                    onChange('included_model_types', current.filter(m => m !== model.value))
                  }
                }}
              />
              {model.label}
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          If any models are selected, only those will be trained (green = included)
        </p>
      </div>

      {/* Ensemble Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bagging Sets
          </label>
          <Input
            type="number"
            min={1}
            max={20}
            value={config.num_bag_sets || ''}
            placeholder="Auto"
            onChange={(e) => onChange('num_bag_sets', e.target.value ? parseInt(e.target.value) : undefined)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Number of complete bagging sets (increases diversity)
          </p>
        </div>

        <div className="flex items-center pt-6">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.set_best_to_refit_full || false}
              onChange={(e) => onChange('set_best_to_refit_full', e.target.checked)}
              className="rounded border-gray-300"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Use Refit as Best</span>
              <p className="text-xs text-gray-500">Use refitted model as final predictor</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}
