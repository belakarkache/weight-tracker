const APP_STORAGE_KEYS = [
  "weight-tracker-onboarding",
  "weight-tracker-ingredients-v1",
  "weight-tracker-daily-log-v1",
];

export function wipeAllAppLocalStorage() {
  for (const key of APP_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}
