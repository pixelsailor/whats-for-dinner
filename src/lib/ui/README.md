# What's For Dinner UI Component Library

A reusable component library built using **bits-ui** and **TailwindCSS**. It provides customized
components with consistent styling while reducing the boilerplate code often necessary with many of
bits-ui more complex components. These component should be the foundation of all UI elements within
**What's For Dinner**. Architectural decision: [ADR-013](../../../adrs/ADR-013-ui-component-library-bits-ui.md). Refer to [bits-ui documentation](https://bits-ui.com/docs/getting-started)
for composing each component.

## General Guidelines

- Prefer TailwindCSS classes to using component `<style>`. Doing so reduces the clutter associated
  with scoped styles.
- Use global classes for typography i.e. `.helper-text` or `.heading-02`
- Form and Navigation elements (buttons, input fields, checkboxes, radio buttons, etc) should have a
  hit area of 42px x 42px, including a 1px border.

## Components

### AppBar

### Button

### Editable Recipe

_This should be relocated to `/lib/components/`_

Displays **FullRecipes** in an editable format.

### IconButton

_deprecated @see [PxlIconButton]_
Buttons specifically designed for displaying a single icon without text.

### PxlIconButton

Buttons specifically designed for displaying a single icon without text.
_Reference: bits-ui [Button](https://bits-ui.com/docs/components/button/llms.txt)_

### Tooltip

_Reference: bits-ui [Tooltip](https://bits-ui.com/docs/components/tooltip/llms.txt)_

### ViewedBadge

## Icons

SVG icons from **Carbon Icons Svelte**.
