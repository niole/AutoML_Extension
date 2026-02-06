import Input from '../../common/Input'
import Select from '../../common/Select'
import type { AdvancedAutoGluonConfig } from '../../../types/job'

interface FoundationModelConfigProps {
  config: AdvancedAutoGluonConfig
  onChange: (key: keyof AdvancedAutoGluonConfig, value: unknown) => void
}

export function FoundationModelConfig({ config, onChange }: FoundationModelConfigProps) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-indigo-50 rounded-lg">
        <h4 className="font-medium text-indigo-900 mb-2">Foundation Models (2025)</h4>
        <p className="text-sm text-indigo-700">
          Use state-of-the-art tabular foundation models like TabPFN for zero-shot or few-shot learning on your data.
        </p>
      </div>

      <label className="flex items-center space-x-3">
        <input
          type="checkbox"
          checked={config.use_tabular_foundation_models || false}
          onChange={(e) => onChange('use_tabular_foundation_models', e.target.checked)}
          className="rounded border-gray-300"
        />
        <div>
          <span className="text-sm font-medium text-gray-700">Use Tabular Foundation Models</span>
          <p className="text-xs text-gray-500">Include TabPFN and other foundation models in training</p>
        </div>
      </label>

      {config.use_tabular_foundation_models && (
        <div className="border-l-4 border-indigo-200 pl-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Foundation Model Preset
            </label>
            <Select
              value={config.foundation_model_preset || ''}
              onChange={(e) => onChange('foundation_model_preset', e.target.value || undefined)}
              options={[
                { value: '', label: 'None (use with other models)' },
                { value: 'zeroshot', label: 'Zero-shot - No training, instant predictions' },
                { value: 'zeroshot_hpo', label: 'Zero-shot + HPO - Optimize foundation model params' },
              ]}
            />
            <p className="text-xs text-gray-500 mt-1">
              Zero-shot mode provides instant predictions without training
            </p>
          </div>
        </div>
      )}

      <div className="border-t pt-6">
        <h4 className="font-medium mb-4">Additional Options</h4>

        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.dynamic_stacking || false}
              onChange={(e) => onChange('dynamic_stacking', e.target.checked)}
              className="rounded border-gray-300"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Dynamic Stacking</span>
              <p className="text-xs text-gray-500">Use dynamic stacking for adaptive ensemble configurations</p>
            </div>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.pseudo_labeling || false}
              onChange={(e) => onChange('pseudo_labeling', e.target.checked)}
              className="rounded border-gray-300"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Pseudo-Labeling</span>
              <p className="text-xs text-gray-500">Enable semi-supervised learning with unlabeled data</p>
            </div>
          </label>

          {config.pseudo_labeling && (
            <div className="ml-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unlabeled Data Path
              </label>
              <Input
                type="text"
                value={config.unlabeled_data_path || ''}
                placeholder="/path/to/unlabeled_data.csv"
                onChange={(e) => onChange('unlabeled_data_path', e.target.value || undefined)}
              />
            </div>
          )}

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.drop_unique || false}
              onChange={(e) => onChange('drop_unique', e.target.checked)}
              className="rounded border-gray-300"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Drop Unique Features</span>
              <p className="text-xs text-gray-500">Automatically drop high-cardinality unique features (like IDs)</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}
