---
name: Financial Refuge
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1b1b1c'
  on-surface-variant: '#434749'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#747879'
  outline-variant: '#c3c7c8'
  surface-tint: '#586062'
  primary: '#181f21'
  on-primary: '#ffffff'
  primary-container: '#2d3436'
  on-primary-container: '#959c9f'
  inverse-primary: '#c1c8ca'
  secondary: '#625e57'
  on-secondary: '#ffffff'
  secondary-container: '#e5dfd6'
  on-secondary-container: '#66625b'
  tertiary: '#2d1912'
  on-tertiary: '#ffffff'
  tertiary-container: '#452d25'
  on-tertiary-container: '#b69489'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde4e6'
  primary-fixed-dim: '#c1c8ca'
  on-primary-fixed: '#161d1f'
  on-primary-fixed-variant: '#41484a'
  secondary-fixed: '#e8e1d9'
  secondary-fixed-dim: '#ccc6bd'
  on-secondary-fixed: '#1e1b16'
  on-secondary-fixed-variant: '#4a4640'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#e4beb3'
  on-tertiary-fixed: '#2b160f'
  on-tertiary-fixed-variant: '#5b4138'
  background: '#fcf9f8'
  on-background: '#1b1b1c'
  surface-variant: '#e5e2e1'
typography:
  display-balance:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '200'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-balance-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '200'
    lineHeight: 42px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding-mobile: 24px
  container-padding-desktop: 48px
  gutter: 16px
  stack-sm: 8px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style

The design system is anchored in the concept of a "Financial Refuge"—a calm, organized sanctuary amidst the complexity of personal finance. The brand personality is sophisticated, disciplined, and serene. It targets individuals who value intentionality over urgency, replacing the traditional "emergency" feel of finance apps with a sense of control and clarity.

The aesthetic follows a **High-End Minimalist** approach inspired by premium hardware and editorial design. It utilizes heavy whitespace to reduce cognitive load and treats financial data as a form of art. By avoiding the aggressive "Red/Green" paradigm of typical fintech, the UI fosters a neutral emotional state where users can make rational decisions without anxiety.

## Colors

The palette is intentionally restrained to maintain a "quiet" interface.
- **Primary (Charcoal):** Used for all critical text and primary actions. It provides a softer contrast than pure black while maintaining maximum legibility.
- **Secondary (Light Sand):** The primary structural color for large containers, backgrounds, and subtle grouping.
- **Accents (Pastel Peach & Muted Mint):** These replace traditional "Warning/Success" colors. Peach indicates an area requiring attention or a debit, while Mint indicates a positive flow or a reached goal. Their desaturated nature prevents visual alarm.
- **Background:** Pure white (#FFFFFF) is used for the base canvas to maximize the sense of space and cleanliness.

## Typography

This design system leverages **Inter** to achieve a modern, Swiss-inspired typographic hierarchy. 
- **Balances:** Total amounts are set in `display-balance` with a Light/Thin weight. This makes large numbers feel airy and elegant rather than heavy.
- **Labels:** Meta-information and category headers use `label-caps`. The bold weight combined with wide letter spacing creates a clear structural anchor for the eye.
- **Body Text:** Standardized on a 17px base (iOS standard) for optimal readability on mobile devices.

## Layout & Spacing

The layout philosophy is based on a **Fluid Inner-Margin** model. 
- **Margins:** A generous 24px side margin is maintained on mobile to ensure content feels "inset" and protected.
- **Rhythm:** An 8px linear scale drives all vertical rhythm. Significant sections are separated by `stack-lg` (48px) to allow the design to "breathe."
- **Alignment:** Content is primarily left-aligned to mirror editorial layouts, with financial figures right-aligned for easy scanning in lists.

## Elevation & Depth

Depth is communicated through material properties rather than traditional shadows.
- **Glassmorphism:** Floating navigation bars and modal sheets use a high-saturation backdrop blur (20px-30px) with a 60% translucent white fill. This maintains a sense of context with the layer beneath.
- **Tonal Layering:** Instead of shadows, use the "Light Sand" (#F4EDE4) color for secondary containers to create a "recessed" or "stacked" look.
- **Thin Outlines:** Where separation is needed between white elements, use a 0.5px or 1px border in a very light grey (#EEEEEE). 
- **Shadows:** Only used for "Active" states of cards—a single, extremely diffused shadow: `0 12px 32px rgba(0,0,0,0.04)`.

## Shapes

The shape language is defined by "Squircle"-like softness.
- **Primary Containers:** Large cards and modal sheets use a `24px` to `32px` corner radius to evoke a friendly, handheld feel common in premium hardware.
- **Interactive Elements:** Buttons and input fields use a consistent `16px` radius.
- **Visual Consistency:** Ensure that nested elements have a smaller radius than their parent containers to maintain "concentric" geometric harmony.

## Components

### Buttons
Primary buttons are solid Charcoal (#2D3436) with white text. Secondary buttons use the Light Sand (#F4EDE4) background with Charcoal text. All buttons feature a tall padding (16px vertical) to provide a large, luxurious tap target.

### Cards
Cards are the primary vehicle for data. They should use the `#FAFAFA` surface color with no border, or a pure white background with a 1px `#EEEEEE` border. Padding inside cards is a uniform 24px.

### Input Fields
Inputs are minimalist: a simple bottom border (1px) in a light neutral, which thickens to 1.5px Charcoal on focus. Labels always sit above the input in the `label-caps` style.

### Lists & Transactions
Transaction items should have high vertical padding (20px). The merchant name is `body-lg`, and the category is `label-caps` in a muted grey. Amounts should be in the same weight as the merchant name, using the Pastel Peach for negatives and Muted Mint for positives.

### Progress Gauges
Used for budget tracking. These should be thin, 4px lines using the Light Sand as the track and the Muted Mint or Pastel Peach as the fill, with no rounded caps for a more architectural look.