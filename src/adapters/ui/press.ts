// Touch-down feedback for anything pressable: scales to 0.97 at once, eases back over 150ms.
// A disabled control doesn't react, since tapping it does nothing.
export const press =
  'transition-transform duration-150 ease-out active:scale-[0.97] active:duration-0 disabled:active:scale-100'
