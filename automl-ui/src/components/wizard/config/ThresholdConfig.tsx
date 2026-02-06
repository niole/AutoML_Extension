import Input from '../../common/Input'
import Select from '../../common/Select'
import type {
  AdvancedAutoGluonConfig,
  DecisionThresholdConfig as DecisionThresholdConfigType,
} from '../../../types/job'

interface ThresholdConfigProps {
  config: AdvancedAutoGluonConfig
  onChange: (key: keyof AdvancedAutoGluonConfig, value: unknown) => void
}

const THRESHOLD_METRICS = [
  { value: 'balanced_accuracy', label: 'Balanced Accuracy (default)' },
  { value: 'f1', label: 'F1 Score' },
  { value: 'precision', label: 'Precision' },
  { value: 'recall', label: 'Recall' },
  { value: 'mcc', label: 'Matthews Correlation Coefficient' },
]

export function ThresholdConfig({ config, onChange }: ThresholdConfigProps) {
  const updateThresholdConfig = (key: keyof DecisionThresholdConfigType, value: unknown) => {
    const current = config.threshold_config || { enabled: false }
    onChange('threshold_config', { ...current, [key]: value })
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-green-50 rounded-lg">
        <h4 className="font-medium text-green-900 mb-2">Decision Threshold Calibration</h4>
        <p className="text-sm text-green-700">
          For binary classification, optimize the decision threshold to maximize a specific metric instead of using the default 0.5 threshold.
        </p>
      </div>

      <label className="flex items-center space-x-3">
        <input
          type="checkbox"
          checked={config.threshold_config?.enabled || false}
          onChange={(e) => updateThresholdConfig('enabled', e.target.checked)}
          className="rounded border-gray-300"
        />
        <div>
          <span className="text-sm font-medium text-gray-700">Enable Threshold Calibration</span>
          <p className="text-xs text-gray-500">Find optimal decision threshold for binary classification</p>
        </div>
      </label>

      {config.threshold_config?.enabled && (
        <div className="space-y-6 border-l-4 border-green-200 pl-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Optimization Metric
              </label>
              <Select
                value={config.threshold_config?.metric || 'balanced_accuracy'}
                onChange={(e) => updateThresholdConfig('metric', e.target.value)}
                options={THRESHOLD_METRICS}
              />
              <p className="text-xs text-gray-500 mt-1">
                Metric to optimize when finding the best threshold
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thresholds to Try
              </label>
              <Input
                type="number"
                min={10}
                max={1000}
                value={config.threshold_config?.thresholds_to_try || 100}
                onChange={(e) => updateThresholdConfig('thresholds_to_try', parseInt(e.target.value) || 100)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Number of threshold values to evaluate (10-1000)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
