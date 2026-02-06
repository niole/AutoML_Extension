import Input from '../../common/Input'
import Select from '../../common/Select'
import type {
  AdvancedAutoGluonConfig,
  HyperparameterTuningConfig,
  PerModelHyperparameters,
} from '../../../types/job'

interface HpoConfigProps {
  config: AdvancedAutoGluonConfig
  onChange: (key: keyof AdvancedAutoGluonConfig, value: unknown) => void
}

const HPO_SCHEDULERS = [
  { value: 'local', label: 'Local (single machine)' },
  { value: 'ray', label: 'Ray (distributed)' },
]

const HPO_SEARCHERS = [
  { value: 'auto', label: 'Auto (recommended)' },
  { value: 'random', label: 'Random Search' },
  { value: 'bayes', label: 'Bayesian Optimization' },
  { value: 'grid', label: 'Grid Search' },
]

export function HpoConfig({ config, onChange }: HpoConfigProps) {
  const updateHpoConfig = (key: keyof HyperparameterTuningConfig, value: unknown) => {
    const current = config.hpo_config || { enabled: false }
    onChange('hpo_config', { ...current, [key]: value })
  }

  const updatePerModelHp = (model: keyof PerModelHyperparameters, params: Record<string, unknown> | undefined) => {
    const current = config.per_model_hyperparameters || {}
    onChange('per_model_hyperparameters', { ...current, [model]: params })
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-purple-50 rounded-lg">
        <h4 className="font-medium text-purple-900 mb-2">Hyperparameter Optimization (HPO)</h4>
        <p className="text-sm text-purple-700">
          Automatically search for optimal hyperparameters for each model type. This can significantly improve model performance but increases training time.
        </p>
      </div>

      <label className="flex items-center space-x-3">
        <input
          type="checkbox"
          checked={config.hpo_config?.enabled || false}
          onChange={(e) => updateHpoConfig('enabled', e.target.checked)}
          className="rounded border-gray-300"
        />
        <div>
          <span className="text-sm font-medium text-gray-700">Enable HPO</span>
          <p className="text-xs text-gray-500">Search for optimal hyperparameters during training</p>
        </div>
      </label>

      {config.hpo_config?.enabled && (
        <div className="space-y-6 border-l-4 border-purple-200 pl-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                HPO Scheduler
              </label>
              <Select
                value={config.hpo_config?.scheduler || 'local'}
                onChange={(e) => updateHpoConfig('scheduler', e.target.value)}
                options={HPO_SCHEDULERS}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use Ray for distributed HPO across multiple workers
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Algorithm
              </label>
              <Select
                value={config.hpo_config?.searcher || 'auto'}
                onChange={(e) => updateHpoConfig('searcher', e.target.value)}
                options={HPO_SEARCHERS}
              />
              <p className="text-xs text-gray-500 mt-1">
                Bayesian optimization is typically most efficient
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Trials
              </label>
              <Input
                type="number"
                min={1}
                max={100}
                value={config.hpo_config?.num_trials || 10}
                onChange={(e) => updateHpoConfig('num_trials', parseInt(e.target.value) || 10)}
              />
              <p className="text-xs text-gray-500 mt-1">
                More trials = better results but longer training (1-100)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Iterations per Trial
              </label>
              <Input
                type="number"
                min={1}
                value={config.hpo_config?.max_t || ''}
                placeholder="Auto"
                onChange={(e) => updateHpoConfig('max_t', e.target.value ? parseInt(e.target.value) : undefined)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum training iterations for each trial
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-3">Early Stopping (ASHA)</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grace Period
                </label>
                <Input
                  type="number"
                  min={1}
                  value={config.hpo_config?.grace_period || ''}
                  placeholder="Auto"
                  onChange={(e) => updateHpoConfig('grace_period', e.target.value ? parseInt(e.target.value) : undefined)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum iterations before early stopping can occur
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reduction Factor
                </label>
                <Input
                  type="number"
                  min={1}
                  step={0.5}
                  value={config.hpo_config?.reduction_factor || ''}
                  placeholder="Auto (typically 3)"
                  onChange={(e) => updateHpoConfig('reduction_factor', e.target.value ? parseFloat(e.target.value) : undefined)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Factor by which to reduce number of trials at each rung
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per-Model Hyperparameters */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-3">Per-Model Hyperparameters</h4>
        <p className="text-xs text-gray-500 mb-4">
          Override default hyperparameters for specific model types (JSON format)
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LightGBM
            </label>
            <Input
              type="text"
              value={config.per_model_hyperparameters?.lightgbm ? JSON.stringify(config.per_model_hyperparameters.lightgbm) : ''}
              placeholder='{"num_leaves": 31, "learning_rate": 0.05}'
              onChange={(e) => {
                try {
                  updatePerModelHp('lightgbm', e.target.value ? JSON.parse(e.target.value) : undefined)
                } catch { /* ignore parse errors */ }
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              XGBoost
            </label>
            <Input
              type="text"
              value={config.per_model_hyperparameters?.xgboost ? JSON.stringify(config.per_model_hyperparameters.xgboost) : ''}
              placeholder='{"max_depth": 6, "eta": 0.3}'
              onChange={(e) => {
                try {
                  updatePerModelHp('xgboost', e.target.value ? JSON.parse(e.target.value) : undefined)
                } catch { /* ignore parse errors */ }
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CatBoost
            </label>
            <Input
              type="text"
              value={config.per_model_hyperparameters?.catboost ? JSON.stringify(config.per_model_hyperparameters.catboost) : ''}
              placeholder='{"depth": 6, "learning_rate": 0.03}'
              onChange={(e) => {
                try {
                  updatePerModelHp('catboost', e.target.value ? JSON.parse(e.target.value) : undefined)
                } catch { /* ignore parse errors */ }
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Neural Network
            </label>
            <Input
              type="text"
              value={config.per_model_hyperparameters?.neural_network ? JSON.stringify(config.per_model_hyperparameters.neural_network) : ''}
              placeholder='{"num_epochs": 50, "learning_rate": 0.001}'
              onChange={(e) => {
                try {
                  updatePerModelHp('neural_network', e.target.value ? JSON.parse(e.target.value) : undefined)
                } catch { /* ignore parse errors */ }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
