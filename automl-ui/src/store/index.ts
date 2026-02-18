import { create } from 'zustand'
import { WizardState, DataSourceConfig, ModelTypeConfig, TrainingConfig } from '../types/wizard'

interface UIState {
  notifications: { id: string; message: string; type: 'success' | 'error' | 'info' }[]
}

interface AppState {
  // Wizard
  wizard: WizardState
  setWizardStep: (step: number) => void
  setWizardDataSource: (config: DataSourceConfig | null) => void
  setWizardModelType: (config: ModelTypeConfig | null) => void
  setWizardTraining: (config: TrainingConfig | null) => void
  setWizardJobInfo: (name: string, description: string) => void
  resetWizard: () => void

  // UI
  ui: UIState
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void
  removeNotification: (id: string) => void
}

const initialWizardState: WizardState = {
  currentStep: 0,
  dataSource: null,
  modelType: null,
  training: null,
  jobName: '',
  jobDescription: '',
}

export const useStore = create<AppState>((set) => ({
  // Wizard state
  wizard: initialWizardState,
  setWizardStep: (step) => set((state) => ({ wizard: { ...state.wizard, currentStep: step } })),
  setWizardDataSource: (config) =>
    set((state) => ({ wizard: { ...state.wizard, dataSource: config } })),
  setWizardModelType: (config) =>
    set((state) => ({ wizard: { ...state.wizard, modelType: config } })),
  setWizardTraining: (config) =>
    set((state) => ({ wizard: { ...state.wizard, training: config } })),
  setWizardJobInfo: (name, description) =>
    set((state) => ({ wizard: { ...state.wizard, jobName: name, jobDescription: description } })),
  resetWizard: () => set({ wizard: initialWizardState }),

  // UI state
  ui: {
    notifications: [],
  },
  addNotification: (message, type) =>
    set((state) => ({
      ui: {
        ...state.ui,
        notifications: [
          ...state.ui.notifications,
          { id: Date.now().toString(), message, type },
        ],
      },
    })),
  removeNotification: (id) =>
    set((state) => ({
      ui: {
        ...state.ui,
        notifications: state.ui.notifications.filter((n) => n.id !== id),
      },
    })),
}))
