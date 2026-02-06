import Input from '../../common/Input'
import Select from '../../common/Select'
import type { MultimodalAdvancedConfig } from '../../../types/job'

interface MultimodalSpecificConfigProps {
  config: MultimodalAdvancedConfig
  onChange: (key: keyof MultimodalAdvancedConfig, value: unknown) => void
}

export function MultimodalSpecificConfig({ config, onChange }: MultimodalSpecificConfigProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Text Backbone
          </label>
          <Input
            type="text"
            value={config.text_backbone || ''}
            placeholder="e.g., google/electra-base-discriminator"
            onChange={(e) => onChange('text_backbone', e.target.value || undefined)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image Backbone
          </label>
          <Input
            type="text"
            value={config.image_backbone || ''}
            placeholder="e.g., swin_base_patch4_window7_224"
            onChange={(e) => onChange('image_backbone', e.target.value || undefined)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Text Length
          </label>
          <Input
            type="number"
            min={32}
            max={2048}
            value={config.text_max_length || 512}
            onChange={(e) => onChange('text_max_length', parseInt(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image Size
          </label>
          <Input
            type="number"
            min={32}
            max={512}
            value={config.image_size || 224}
            onChange={(e) => onChange('image_size', parseInt(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Batch Size
          </label>
          <Input
            type="number"
            min={1}
            max={128}
            value={config.batch_size || ''}
            placeholder="Auto"
            onChange={(e) => onChange('batch_size', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Epochs
          </label>
          <Input
            type="number"
            min={1}
            max={1000}
            value={config.max_epochs || ''}
            placeholder="Auto"
            onChange={(e) => onChange('max_epochs', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Learning Rate
          </label>
          <Input
            type="number"
            step="0.0001"
            value={config.learning_rate || ''}
            placeholder="Auto"
            onChange={(e) => onChange('learning_rate', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fusion Method
          </label>
          <Select
            value={config.fusion_method || 'late'}
            onChange={(e) => onChange('fusion_method', e.target.value as 'late' | 'early')}
            options={[
              { value: 'late', label: 'Late Fusion' },
              { value: 'early', label: 'Early Fusion' },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
