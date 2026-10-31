# Design

liftlog looks like a calm iOS app: a dark navy background, lighter rounded cards, one periwinkle accent for anything you can tap, and big bold titles. It follows the phone's light/dark setting. There is no in-app picker.

The tokens live in [`src/index.css`](../src/index.css). Tailwind's default colours, text sizes and radii are switched off, so a class like `bg-zinc-800` or `text-sm` produces nothing. Use the names below.

## Colours

| Token | Light | Dark | Use for |
|---|---|---|---|
| `bg` | `#f7f6fb` | `#15161c` | Page background |
| `surface` | `#ffffff` | `#1c2028` | Cards and grouped lists |
| `surface-raised` | `#eef0f6` | `#232832` | Rows and fields inside a card |
| `label` | `#15161c` | `#f5f6f8` | Main text |
| `label-secondary` | `#5f6573` | `#9aa0ad` | Descriptions, dates, units |
| `separator` | `#e2e5ef` | `#2d3240` | Dividers and borders |
| `tint` | `#4f5fd6` | `#91a4ff` | Buttons, links, selected state, chart line |
| `on-tint` | `#ffffff` | `#15161c` | Text on a `tint` background |
| `destructive` | `#d93a49` | `#ff7a85` | Delete and other destructive actions |

Use them with any Tailwind colour utility: `bg-surface`, `text-label-secondary`, `border-separator`, `bg-tint/15`.

- **One accent.** `tint` means "you can tap this". Don't use it for decoration.
- **Destructive is only for destroying data.** Not for warnings or emphasis.

## Text

iOS text styles. Each one sets size, line height, weight and letter spacing together, so don't add `font-bold` or `tracking-*` on top.

| Class | Size | Weight | Use for |
|---|---|---|---|
| `text-large-title` | 34px | Bold | Screen title, once per screen |
| `text-title` | 22px | Bold | Card and section titles |
| `text-headline` | 17px | Semibold | List row titles, emphasised values |
| `text-body` | 17px | Regular | Default text, input values |
| `text-subhead` | 15px | Regular | Descriptions under a title |
| `text-footnote` | 13px | Regular | Dates, units, small print |

Sizes are in `rem`, so the user's text size setting still scales them. The font is the system font (San Francisco on iPhone).

## Shape and spacing

| Class | Value | Use for |
|---|---|---|
| `rounded-card` | 24px | Cards |
| `rounded-control` | 16px | Rows, fields and buttons inside a card |
| `rounded-full` | pill | Pills, round buttons |

Spacing uses Tailwind's default 4px scale (`p-5` = 20px). Pages use `px-5` and cards use `p-5`.

## Icons

Icons come only from [Lucide](https://lucide.dev) (`lucide-react`). SF Symbols aren't allowed: Apple's licence limits them to Apple platforms' native apps, not the web.

- Size icons 24–28px, inside a tap target of at least 44px (`size-11`).
- Stroke width 1.75 for outline icons such as the Settings gear (26px), 2.25 for the + on a filled button (28px).
- Icons inherit `currentColor`, so colour them with a text token (`text-tint`, `text-on-tint`).
- Mark them `aria-hidden` and put an `aria-label` on the button.

## iPhone rules

- **Text fields must be at least 16px.** Below that, iOS Safari zooms the page when the field is focused. The base CSS already forces `input`, `select` and `textarea` to at least 16px, so never set a smaller size on them. Never fix it with `maximum-scale=1` in the viewport tag either, because that also blocks pinch-to-zoom.
- **Tap targets are at least 44×44px.** Use `min-h-11` on anything tappable.
- **Respect the notch and home bar.** `body` already pads by the safe-area insets. Anything fixed to the top or bottom of the screen must add `env(safe-area-inset-*)` itself.
- **Use the number keyboard for numbers:** `inputMode="decimal"` for weight and `inputMode="numeric"` for reps.
- **Give feedback when a finger touches down, not on release.** Use the `active:` state (`active:opacity-70` or `active:scale-[0.98]`).
- **Respect reduced motion.** Wrap motion in `motion-safe:` so it drops out for people who turn it off.

## Adding a token

Add new tokens to `src/index.css` and to the tables above in the same PR. A one-off colour or size in a component means a token is missing.
