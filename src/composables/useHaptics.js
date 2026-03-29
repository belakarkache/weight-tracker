export function hapticLight() {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  navigator.vibrate(10);
}

export function hapticMedium() {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  navigator.vibrate(18);
}

export function hapticSuccess() {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  navigator.vibrate([12, 45, 22]);
}
