# Figma Design Tokens — Part 1

**Reference:** `Untitled (3).pdf`, page 4 (dashboard), rasterized at 1440 × 1258px. The PDF contains raster screenshots, not inspectable design metadata; color samples are exact pixels while typography, radii, and spacing not tied to clear edges are visual estimates.

## Measured tokens

| Token | Value | Evidence |
|---|---|---|
| App background | `#111415` | Page 4, main canvas at (100, 100). |
| Sidebar and top-bar surface | `#191C1D` | Page 4, top bar at (700, 24) and sidebar at (1300, 50). |
| Card surface | `#1D2021` | Page 4, dashboard card at (400, 450). |
| Raised surface | `#272A2B` | Page 4, top-bar control at (400, 15). |
| Border | `#414752` | Page 4, sidebar divider at (1244, 500). |
| Accent | `#4A9EFF` | Page 4, most frequent exact color in the logo-mark sample region (1394–1424, 13–43). |
| Primary text | `#E1E3E4` | Page 4, most frequent text pixel in the dashboard-heading sample region (1110–1220, 114–140). |
| Sidebar width | `196px` | Right edge of the sidebar is x=1244 in the 1440px frame. |
| Top bar height | `52px` | Top bar occupies y=0–51. |
| Shortcut row height | `37px` | Row below the top bar occupies y=52–88. |
| Main content inset | `24px` | Dashboard content begins at x=24 from the left edge and is inset 24px from the sidebar divider. |
| Button sizes | `26px`, `32px`, `38px` | Page 152 solid-blue button bounds (1338,24–1415,49), (1325,70–1415,101), and (1308,122–1415,159). |
| Input height | `32px` | Page 152, outlined input bounds y=648–679. |
| Modal size | `480px` wide | Page 169 modal bounds x=480–959 (480px) and y=451–548 (98px). |
| Modal surface | `#1C2128` | Page 169 modal interior at (500, 470). |
| Card corner radius | Approximately `8px` | Visually estimated from dashboard-card corners on page 4. |
| Shortcut corner radius | Pill | Clearly rounded shortcut outlines on page 4. |

The exact screenshot colors align with the existing dark palette. The previous 240px sidebar width was the clearest measured geometry mismatch and is now 196px on desktop. The mobile drawer remains 240px because no responsive Figma frame is present.

## Typography, spacing, and effects

- Arabic text appears to be a sans-serif face. Exact font family cannot be established from raster pixels (**NOT VERIFIED**); the existing bundled IBM Plex Sans Arabic face is retained.
- The body appears approximately 13px and the page title approximately 20px, but exact font sizes/weights cannot be recovered from a raster export (**NOT VERIFIED**).
- A 24px content inset and roughly 12px card gaps are visible on page 4. Other spacing values remain implementation scale values and are not asserted as exact Figma measurements.
- The PDF shows no responsive variants. Breakpoints 1100px, 768px, and 600px are retained from existing responsive behavior and are **NOT VERIFIED** against Figma.
- Card shadows are not apparent in the sampled screen. The page-169 modal's size and surface are measured, but the app's same-state modal, toast, dropdown, and notification-panel appearance is **NOT VERIFIED** by a same-state screenshot comparison.

## Accessibility contrast deviations

The source accent blue is preserved. On page 4, the original white text on `#4A9EFF` measured 2.75:1 in axe; the foreground is now `#111415` (6.72:1) for primary buttons and the brand mark. The dark-theme dim-text opacity changed from 0.38 to 0.50; light-theme dim text changed from 0.42 to 0.58. These are the minimum shared-token adjustments made in this part to clear the observed contrast violations while retaining the screenshot palette.

Page 152's shared-control sheet now has 26px/32px/38px button size classes and 32px inputs. The page-169 modal uses the measured 480px maximum width and `#1C2128` surface. These are reference measurements; same-content modal/component screenshots are not asserted.

Validation: the existing axe script passed with **0 violations across 34 views** using the locally installed Microsoft Edge executable. The default Playwright Chromium executable was absent; no browser was downloaded or installed.

## Part 1 screenshot comparison

The Figma page 4 image and the live MSW-backed dashboard were captured at the same 1440 × 1258 viewport. The shared shell geometry now measures 196px sidebar, 52px top bar, and 37px shortcut row, matching the page-4 frame. The dashboard body still differs and is recorded as `DIFFERENT` in `FIGMA_PARITY_REPORT.md`; feature-screen parity is outside Part 1. No modal, toast, dropdown, notification-panel, or responsive Figma state was compared in this part.
