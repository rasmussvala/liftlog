// Touch-down feedback for anything pressable: scales to 0.97 at once, eases back over 150ms.
// Not under reduced motion. A disabled control doesn't react, since tapping it does nothing.
export const press =
  'transition-transform duration-150 ease-out motion-safe:not-disabled:active:scale-[0.97] active:duration-0'
