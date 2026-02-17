import type {
  AdvancedAutoGluonConfig,
  TimeSeriesAdvancedConfig,
  ModelType,
} from '../../../types/job'

export function getConfiguredCount(
  modelType: ModelType,
  advancedConfig: AdvancedAutoGluonConfig,
  timeseriesConfig?: TimeSeriesAdvancedConfig,
): number {
  const commonSettings = [
    advancedConfig.num_gpus !== undefined && advancedConfig.num_gpus !== 0,
    advancedConfig.num_cpus !== undefined,
  ]
  const tabularSettings = modelType === 'tabular' ? [
    advancedConfig.excluded_model_types && advancedConfig.excluded_model_types.length > 0,
    advancedConfig.included_model_types && advancedConfig.included_model_types.length > 0,
    advancedConfig.num_bag_folds !== undefined,
    advancedConfig.num_stack_levels !== undefined,
    advancedConfig.dynamic_stacking,
    advancedConfig.holdout_frac !== undefined,
    advancedConfig.calibrate,
    advancedConfig.refit_full,
    advancedConfig.class_imbalance_strategy !== undefined,
    advancedConfig.distill,
    advancedConfig.sample_weight_column !== undefined,
    advancedConfig.hpo_config?.enabled,
    advancedConfig.threshold_config?.enabled,
    advancedConfig.use_tabular_foundation_models,
    advancedConfig.pseudo_labeling,
    advancedConfig.drop_unique,
  ] : []
  const timeseriesSettings = modelType === 'timeseries' && timeseriesConfig ? [
    timeseriesConfig.freq !== undefined,
    timeseriesConfig.target_scaler !== undefined,
    timeseriesConfig.use_chronos,
    timeseriesConfig.enable_ensemble === false,
  ] : []
  return [...commonSettings, ...tabularSettings, ...timeseriesSettings].filter(Boolean).length
}
