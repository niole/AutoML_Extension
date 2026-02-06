import Input from '../../common/Input'
import type { AdvancedAutoGluonConfig } from '../../../types/job'

interface TrainingConfigProps {
  config: AdvancedAutoGluonConfig
  onChange: (key: keyof AdvancedAutoGluonConfig, value: unknown) => void
}

export function TrainingConfig({ config, onChange }: TrainingConfigProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Holdout Fraction
          </label>
          <Input
            type="number"
            min={0.01}
            max={0.5}
            step={0.01}
            value={config.holdout_frac || ''}
            placeholder="Auto (typically 0.1-0.2)"
            onChange={(e) => onChange('holdout_frac', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Fraction of data reserved for validation (0.01-0.5)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Inference Time Limit (s/row)
          </label>
          <Input
            type="number"
            min={0.001}
            step={0.001}
            value={config.infer_limit || ''}
            placeholder="No limit"
            onChange={(e) => onChange('infer_limit', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum inference time per row in seconds
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={config.calibrate || false}
            onChange={(e) => onChange('calibrate', e.target.checked)}
            className="rounded border-gray-300"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Calibrate Probabilities</span>
            <p className="text-xs text-gray-500">Calibrate predicted probabilities for better reliability</p>
          </div>
        </label>

        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={config.refit_full || false}
            onChange={(e) => onChange('refit_full', e.target.checked)}
            className="rounded border-gray-300"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Refit on Full Data</span>
            <p className="text-xs text-gray-500">After training, refit best models on full dataset</p>
          </div>
        </label>

        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={config.use_bag_holdout || false}
            onChange={(e) => onChange('use_bag_holdout', e.target.checked)}
            className="rounded border-gray-300"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Use Bag Holdout</span>
            <p className="text-xs text-gray-500">Use separate holdout for bagged models</p>
          </div>
        </label>
      </div>
    </div>
  )
}
