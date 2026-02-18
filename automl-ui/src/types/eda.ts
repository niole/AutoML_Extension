export interface TransformConfig {
  column: string
  type: 'fillna' | 'scale' | 'encode' | 'drop' | 'log' | 'clip'
}
