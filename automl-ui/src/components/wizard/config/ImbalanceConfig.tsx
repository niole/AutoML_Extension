import Input from '../../common/Input'
import Select from '../../common/Select'
import type { AdvancedAutoGluonConfig } from '../../../types/job'

interface ImbalanceConfigProps {
  config: AdvancedAutoGluonConfig
  onChange: (key: keyof AdvancedAutoGluonConfig, value: unknown) => void
}

export function ImbalanceConfig({ config, onChange }: ImbalanceConfigProps) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Class Imbalance Handling</h4>
        <p className="text-sm text-blue-700">
          Configure strategies to handle imbalanced datasets where one class is significantly more common than others.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Imbalance Strategy
        </label>
        <Select
          value={config.class_imbalance_strategy || ''}
          onChange={(e) => onChange('class_imbalance_strategy', e.target.value || undefined)}
          options={[
            { value: '', label: 'None (default)' },
            { value: 'oversample', label: 'Oversample - Duplicate minority class samples' },
            { value: 'undersample', label: 'Undersample - Reduce majority class samples' },
            { value: 'smote', label: 'SMOTE - Synthetic minority oversampling' },
            { value: 'focal_loss', label: 'Focal Loss - Down-weight easy examples' },
          ]}
        />
        <p className="text-xs text-gray-500 mt-1">
          Select a strategy to handle class imbalance in your dataset
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sample Weight Column
        </label>
        <Input
          type="text"
          value={config.sample_weight_column || ''}
          placeholder="Column name (optional)"
          onChange={(e) => onChange('sample_weight_column', e.target.value || undefined)}
        />
        <p className="text-xs text-gray-500 mt-1">
          Name of a column in your data containing sample weights for weighted training
        </p>
      </div>
    </div>
  )
}
