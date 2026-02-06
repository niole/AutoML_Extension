import { useState, useEffect } from 'react'
import Button from '../common/Button'
import type {
  AdvancedAutoGluonConfig,
  TimeSeriesAdvancedConfig,
  MultimodalAdvancedConfig,
  ModelType,
} from '../../types/job'
import { ResourceConfig } from './config/ResourceConfig'
import { ModelSelectionConfig } from './config/ModelSelectionConfig'
import { TrainingConfig } from './config/TrainingConfig'
import { HpoConfig } from './config/HpoConfig'
import { ThresholdConfig } from './config/ThresholdConfig'
import { ImbalanceConfig } from './config/ImbalanceConfig'
import { FoundationModelConfig } from './config/FoundationModelConfig'
import { AdvancedTabularConfig } from './config/AdvancedTabularConfig'
import { TimeSeriesSpecificConfig } from './config/TimeSeriesSpecificConfig'
import { MultimodalSpecificConfig } from './config/MultimodalSpecificConfig'
import { getConfiguredCount } from './config/getConfiguredCount'

interface AdvancedConfigPanelProps {
  modelType: ModelType
  advancedConfig: AdvancedAutoGluonConfig
  timeseriesConfig?: TimeSeriesAdvancedConfig
  multimodalConfig?: MultimodalAdvancedConfig
  onAdvancedConfigChange: (config: AdvancedAutoGluonConfig) => void
  onTimeseriesConfigChange?: (config: TimeSeriesAdvancedConfig) => void
  onMultimodalConfigChange?: (config: MultimodalAdvancedConfig) => void
}

type SectionId = 'resources' | 'models' | 'training' | 'hpo' | 'threshold' | 'imbalance' | 'foundation' | 'advanced' | 'specific'

const TAB_ACTIVE = 'bg-domino-accent-purple text-white'
const TAB_INACTIVE = 'text-gray-600 hover'

export function AdvancedConfigPanel({
  modelType,
  advancedConfig,
  timeseriesConfig,
  multimodalConfig,
  onAdvancedConfigChange,
  onTimeseriesConfigChange,
  onMultimodalConfigChange,
}: AdvancedConfigPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<SectionId>('resources')

  useEffect(() => {
    if (isOpen) {
      window.parent.postMessage({ type: 'domino-modal-open' }, '*')
      return () => { window.parent.postMessage({ type: 'domino-modal-close' }, '*') }
    }
  }, [isOpen])

  const updateAdvanced = (key: keyof AdvancedAutoGluonConfig, value: unknown) => {
    onAdvancedConfigChange({ ...advancedConfig, [key]: value })
  }
  const updateTimeseries = (key: keyof TimeSeriesAdvancedConfig, value: unknown) => {
    if (onTimeseriesConfigChange && timeseriesConfig) onTimeseriesConfigChange({ ...timeseriesConfig, [key]: value })
  }
  const updateMultimodal = (key: keyof MultimodalAdvancedConfig, value: unknown) => {
    if (onMultimodalConfigChange && multimodalConfig) onMultimodalConfigChange({ ...multimodalConfig, [key]: value })
  }

  const configuredCount = getConfiguredCount(modelType, advancedConfig, timeseriesConfig, multimodalConfig)

  const tabs: { id: SectionId; label: string }[] = [
    { id: 'resources', label: 'Resources' },
    ...(modelType === 'tabular' ? [
      { id: 'models' as SectionId, label: 'Models' },
      { id: 'training' as SectionId, label: 'Training' },
      { id: 'hpo' as SectionId, label: 'HPO' },
      { id: 'threshold' as SectionId, label: 'Threshold' },
      { id: 'imbalance' as SectionId, label: 'Imbalance' },
      { id: 'foundation' as SectionId, label: 'Foundation' },
      { id: 'advanced' as SectionId, label: 'Advanced' },
    ] : []),
    ...((modelType === 'timeseries' || modelType === 'multimodal') ? [
      { id: 'specific' as SectionId, label: modelType === 'timeseries' ? 'Time Series' : 'Multimodal' },
    ] : []),
  ]

  const renderSection = () => {
    switch (activeSection) {
      case 'resources':
        return <ResourceConfig config={advancedConfig} onChange={updateAdvanced} />
      case 'models':
        return modelType === 'tabular' ? <ModelSelectionConfig config={advancedConfig} onChange={updateAdvanced} /> : null
      case 'training':
        return modelType === 'tabular' ? <TrainingConfig config={advancedConfig} onChange={updateAdvanced} /> : null
      case 'hpo':
        return modelType === 'tabular' ? <HpoConfig config={advancedConfig} onChange={updateAdvanced} /> : null
      case 'threshold':
        return modelType === 'tabular' ? <ThresholdConfig config={advancedConfig} onChange={updateAdvanced} /> : null
      case 'imbalance':
        return modelType === 'tabular' ? <ImbalanceConfig config={advancedConfig} onChange={updateAdvanced} /> : null
      case 'foundation':
        return modelType === 'tabular' ? <FoundationModelConfig config={advancedConfig} onChange={updateAdvanced} /> : null
      case 'advanced':
        return modelType === 'tabular' ? <AdvancedTabularConfig config={advancedConfig} onChange={updateAdvanced} /> : null
      case 'specific':
        if (modelType === 'timeseries' && timeseriesConfig) return <TimeSeriesSpecificConfig config={timeseriesConfig} onChange={updateTimeseries} />
        if (modelType === 'multimodal' && multimodalConfig) return <MultimodalSpecificConfig config={multimodalConfig} onChange={updateMultimodal} />
        return null
      default:
        return null
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-sm text-domino-accent-purple hover:text-domino-accent-purple/80 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Advanced Configuration
        {configuredCount > 0 && (
          <span className="px-1.5 py-0.5 bg-domino-accent-purple text-white text-xs rounded-full">{configuredCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h2 className="text-xl font-semibold text-domino-text-primary">Advanced Configuration</h2>
              <button onClick={() => setIsOpen(false)} className="text-domino-text-muted hover:text-domino-text-primary transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-wrap gap-1 px-4 pt-4 border-b border-domino-border">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeSection === tab.id ? TAB_ACTIVE : TAB_INACTIVE}`}
                  onClick={() => setActiveSection(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">{renderSection()}</div>

            <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-domino-border">
              <button onClick={() => setIsOpen(false)} className="text-sm text-domino-accent-purple hover:underline">Cancel</button>
              <Button variant="primary" onClick={() => setIsOpen(false)}>Apply Configuration</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
