const STORAGE_KEY = 'weight-tracker-onboarding'

const defaultData = () => ({
  height: null,
  weight: null,
  age: null,
  sex: null,
  activityLevel: null,
  calorieDeficit: null,
  goalWeight: null,
  calorieTargetManual: null,
  sodiumTargetMg: null,
  fatTargetG: null,
  completedAt: null,
})

export function useOnboarding() {
  const getStored = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      return { ...defaultData(), ...JSON.parse(raw) }
    } catch {
      return null
    }
  }

  const data = getStored()

  const isComplete = () => {
    const d = getStored()
    if (!d) return false
    return (
      d.height != null &&
      d.weight != null &&
      d.age != null &&
      d.sex != null &&
      d.activityLevel != null &&
      d.calorieDeficit != null &&
      d.goalWeight != null &&
      d.completedAt != null
    )
  }

  const save = (payload) => {
    const current = getStored() || defaultData()
    const next = { ...current, ...payload }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return next
  }

  const complete = (payload) => {
    save({ ...payload, completedAt: new Date().toISOString() })
  }

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    data: data || defaultData(),
    isComplete,
    save,
    complete,
    clear,
    getStored,
  }
}
