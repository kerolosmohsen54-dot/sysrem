# Reference Design Tokens

**Source:** `frontend/reference/precision-slate-erp-v43__3_ (1).html`  
**Status:** Reference CSS values were applied to the frontend tokens and compared with the rendered shell at 1440, 1100, 768, and 600px. The screenshots are in [`parity/part-1/`](./parity/part-1/).

## Root tokens

| Token | Reference value |
| --- | --- |
| Background | `#111415` |
| Surface low | `#191c1d` |
| Surface | `#1d2021` |
| Surface high | `#272a2b` |
| Surface highest | `#323536` |
| Surface bright | `#3a3d3e` |
| Border | `#414752` |
| Strong border | `#5c6370` |
| Main text | `#e1e3e4` |
| Secondary text | `rgba(255,255,255,0.60)` |
| Dim text | `rgba(255,255,255,0.38)` |
| Accent | `#4a9eff` |
| Accent dim | `rgba(74,158,255,0.15)` |
| Success | `#3ecf8e`; dim `rgba(62,207,142,0.15)` |
| Warning | `#f5a623`; dim `rgba(245,166,35,0.15)` |
| Danger | `#e05252`; dim `rgba(224,82,82,0.15)` |
| Info | `#9b8ef7`; dim `rgba(155,142,247,0.15)` |
| Sidebar width | `240px` |
| Top bar height | `52px` |
| Standard radius | `4px` |
| Large radius | `8px` |

## Typography

- Font family: IBM Plex Sans Arabic, with sans-serif fallbacks.
- Base/root size: `13px`.
- Reference declarations use `9px`, `10px`, `10.5px`, `11px`, `11.5px`, `12px`, `12.5px`, `13px`, `13.5px`, `14px`, `15px`, `16px`, `18px`, `20px`, `22px`, `24px`, and `40px`.
- Font weights declared in the reference: `500`, `600`, and `700`.
- Common line heights declared: `1`, `1.2`, `1.3`, `1.4`, and `1.6`.

## Spacing, shape, elevation

- Observed reference spacing values: `2px`, `3px`, `4px`, `5px`, `6px`, `8px`, `10px`, `12px`, `14px`, `16px`, `20px`, and `24px`.
- Repeated page padding: `24px`; common card/form padding values include `10px`, `12px`, `14px`, and `16px`.
- Radius values/forms: `2px`, `4px`, `8px`, `50%`, `99px`, and `999px`; selected top corners also use `2px 2px 0 0`.
- Elevation values: focus ring `0 0 0 2px rgba(74,158,255,0.15)`; popover/row menu `0 8px 24px` with black alpha `0.35`/`0.45`; toast `0 4px 16px` with alpha `0.25`; modal `0 20px 60px` with alpha `0.6`.

## Responsive breakpoints

- `max-width: 1100px`
- `max-width: 768px`
- `max-width: 600px`

## Reference/runtime conflict

The reference declares a `240px` sidebar in its root tokens, then overrides it to `196px` later in the same HTML file. Part 1 keeps the requested `240px` token, so desktop screenshots show a deliberate 44px sidebar-width difference from the reference's final computed style. At 768px and below both sidebars are off-canvas while closed; the drawer-open width was not captured.

## Extraction limits

The spacing and typography inventories above are unique literal declarations found in the reference style block, not a claim that every value has the same semantic role. Inline runtime-generated markup can add styles. The Part 1 screenshots compare the shared shell on the dashboard only; feature content, drawer-open state, and every modal/toast/dropdown state remain **NOT VERIFIED**.
