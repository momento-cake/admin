# Design System - Momento Cake Admin

## Overview

The Momento Cake Admin design system provides a comprehensive set of design principles, components, and guidelines tailored for Brazilian bakery operations. The design emphasizes warmth, professionalism, and accessibility while supporting complex business workflows.

## Design Philosophy

### Core Principles
- **Warmth**: Reflecting the artisanal nature of bakery craft
- **Clarity**: Clear information hierarchy and intuitive navigation
- **Efficiency**: Optimized workflows for daily bakery operations
- **Accessibility**: Inclusive design for all users
- **Locality**: Brazilian cultural context and business practices

### Visual Identity
- **Professional Warmth**: Balance between business efficiency and artisanal craft
- **Clean Modernism**: Contemporary design with traditional baking elements
- **Trustworthy**: Reliable and consistent visual language
- **Approachable**: Friendly and welcoming interface

## Color System

### Primary Palette

#### Saddle Brown - Primary Brand Color
```css
--color-primary-50: #fdf8f6
--color-primary-100: #f2e8e5
--color-primary-200: #eaddd7
--color-primary-300: #e0cec7
--color-primary-400: #d2bab0
--color-primary-500: #c69c89  /* Light variant */
--color-primary-600: #8B4513  /* Main brand color */
--color-primary-700: #7a3e11
--color-primary-800: #6b3510
--color-primary-900: #5d2e0e
```

**Usage**: Primary buttons, brand elements, active navigation, headers
**Accessibility**: WCAG AA compliant with white text (7.2:1 contrast)

#### Cornsilk - Secondary Warm Color
```css
--color-secondary-50: #fffefa
--color-secondary-100: #fffcf2
--color-secondary-200: #fffaeb
--color-secondary-300: #fff8dc  /* Main secondary */
--color-secondary-400: #fff6d3
--color-secondary-500: #fff4ca
--color-secondary-600: #ffe8a1
--color-secondary-700: #ffdc78
--color-secondary-800: #ffd04f
--color-secondary-900: #ffc426
```

**Usage**: Light backgrounds, subtle highlights, warm accents
**Accessibility**: Use with dark text for optimal readability

### Semantic Colors

#### Success - Emerald Green
```css
--color-success-50: #ecfdf5
--color-success-100: #d1fae5
--color-success-200: #a7f3d0
--color-success-300: #6ee7b7
--color-success-400: #34d399
--color-success-500: #10b981  /* Main success */
--color-success-600: #059669
--color-success-700: #047857
--color-success-800: #065f46
--color-success-900: #064e3b
```

#### Warning - Amber
```css
--color-warning-50: #fffbeb
--color-warning-100: #fef3c7
--color-warning-200: #fde68a
--color-warning-300: #fcd34d
--color-warning-400: #fbbf24
--color-warning-500: #f59e0b  /* Main warning */
--color-warning-600: #d97706
--color-warning-700: #b45309
--color-warning-800: #92400e
--color-warning-900: #78350f
```

#### Error - Red
```css
--color-error-50: #fef2f2
--color-error-100: #fee2e2
--color-error-200: #fecaca
--color-error-300: #fca5a5
--color-error-400: #f87171
--color-error-500: #ef4444  /* Main error */
--color-error-600: #dc2626
--color-error-700: #b91c1c
--color-error-800: #991b1b
--color-error-900: #7f1d1d
```

### Neutral Palette

#### Gray Scale
```css
--color-gray-50: #fafafa
--color-gray-100: #f5f5f5
--color-gray-200: #e5e5e5
--color-gray-300: #d4d4d4
--color-gray-400: #a3a3a3
--color-gray-500: #737373
--color-gray-600: #525252
--color-gray-700: #404040  /* Primary text */
--color-gray-800: #262626
--color-gray-900: #171717
```

### Brazilian Accent Colors

#### Brazilian Yellow (Accent)
```css
--color-brazil-yellow: #ffd700
--color-brazil-yellow-light: #fff8a1
--color-brazil-yellow-dark: #cc9900
```

#### Brazilian Green (Accent)
```css
--color-brazil-green: #228b22
--color-brazil-green-light: #90ee90
--color-brazil-green-dark: #006400
```

## Typography System

### Font Families

#### Primary - Inter (UI Text)
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```
**Usage**: Interface text, forms, navigation, body content
**Characteristics**: Excellent readability, modern, clean
**Weights**: 300, 400, 500, 600, 700

#### Display - Playfair Display (Headers)
```css
font-family: 'Playfair Display', Georgia, serif;
```
**Usage**: Page titles, major headings, brand elements
**Characteristics**: Elegant, sophisticated, artisanal feel
**Weights**: 400, 600, 700

#### Monospace - JetBrains Mono (Data)
```css
font-family: 'JetBrains Mono', 'SF Mono', Monaco, 'Cascadia Code', monospace;
```
**Usage**: Numbers, prices, measurements, code
**Characteristics**: Clear distinction, consistent width
**Weights**: 400, 500, 700

### Typography Scale

#### Display Typography
```css
/* Display Extra Large - Hero titles */
.text-display-xl {
  font-family: 'Playfair Display', serif;
  font-size: 3.75rem;    /* 60px */
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* Display Large - Page titles */
.text-display-lg {
  font-family: 'Playfair Display', serif;
  font-size: 3rem;       /* 48px */
  line-height: 1.125;
  font-weight: 600;
  letter-spacing: -0.02em;
}

/* Display Medium - Section headers */
.text-display-md {
  font-family: 'Playfair Display', serif;
  font-size: 2.25rem;    /* 36px */
  line-height: 1.2;
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* Display Small - Subsection headers */
.text-display-sm {
  font-family: 'Playfair Display', serif;
  font-size: 1.875rem;   /* 30px */
  line-height: 1.25;
  font-weight: 600;
}
```

#### Heading Typography
```css
/* Heading Large */
.text-heading-lg {
  font-family: 'Inter', sans-serif;
  font-size: 1.5rem;     /* 24px */
  line-height: 1.33;
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* Heading Medium */
.text-heading-md {
  font-family: 'Inter', sans-serif;
  font-size: 1.25rem;    /* 20px */
  line-height: 1.4;
  font-weight: 600;
}

/* Heading Small */
.text-heading-sm {
  font-family: 'Inter', sans-serif;
  font-size: 1.125rem;   /* 18px */
  line-height: 1.44;
  font-weight: 600;
}
```

#### Body Typography
```css
/* Body Large */
.text-body-lg {
  font-family: 'Inter', sans-serif;
  font-size: 1.125rem;   /* 18px */
  line-height: 1.56;
  font-weight: 400;
}

/* Body Medium - Default */
.text-body-md {
  font-family: 'Inter', sans-serif;
  font-size: 1rem;       /* 16px */
  line-height: 1.5;
  font-weight: 400;
}

/* Body Small */
.text-body-sm {
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;   /* 14px */
  line-height: 1.43;
  font-weight: 400;
}

/* Caption */
.text-caption {
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;    /* 12px */
  line-height: 1.33;
  font-weight: 400;
  color: var(--color-gray-600);
}
```

#### Data Typography
```css
/* Price Display */
.text-price-lg {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.5rem;     /* 24px */
  line-height: 1.25;
  font-weight: 500;
  color: var(--color-primary-600);
}

/* Numeric Data */
.text-data-md {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;       /* 16px */
  line-height: 1.25;
  font-weight: 400;
}

/* Small Numbers */
.text-data-sm {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;   /* 14px */
  line-height: 1.25;
  font-weight: 400;
}
```

## Spacing System

### Base Scale (4px grid)
```css
--spacing-0: 0
--spacing-1: 0.25rem    /* 4px */
--spacing-2: 0.5rem     /* 8px */
--spacing-3: 0.75rem    /* 12px */
--spacing-4: 1rem       /* 16px */
--spacing-5: 1.25rem    /* 20px */
--spacing-6: 1.5rem     /* 24px */
--spacing-8: 2rem       /* 32px */
--spacing-10: 2.5rem    /* 40px */
--spacing-12: 3rem      /* 48px */
--spacing-16: 4rem      /* 64px */
--spacing-20: 5rem      /* 80px */
--spacing-24: 6rem      /* 96px */
--spacing-32: 8rem      /* 128px */
```

### Component Spacing
```css
/* Component internal padding */
--space-component-sm: var(--spacing-2)  /* 8px */
--space-component-md: var(--spacing-4)  /* 16px */
--space-component-lg: var(--spacing-6)  /* 24px */
--space-component-xl: var(--spacing-8)  /* 32px */

/* Element margins */
--space-element-xs: var(--spacing-1)    /* 4px */
--space-element-sm: var(--spacing-2)    /* 8px */
--space-element-md: var(--spacing-4)    /* 16px */
--space-element-lg: var(--spacing-6)    /* 24px */

/* Section spacing */
--space-section-sm: var(--spacing-8)    /* 32px */
--space-section-md: var(--spacing-12)   /* 48px */
--space-section-lg: var(--spacing-16)   /* 64px */
--space-section-xl: var(--spacing-24)   /* 96px */
```

## Border Radius System

```css
--radius-none: 0
--radius-sm: 0.25rem    /* 4px */
--radius-md: 0.5rem     /* 8px */
--radius-lg: 0.75rem    /* 12px */
--radius-xl: 1rem       /* 16px */
--radius-2xl: 1.5rem    /* 24px */
--radius-full: 50%
```

### Component Radius
```css
.radius-input { border-radius: var(--radius-sm); }
.radius-button { border-radius: var(--radius-md); }
.radius-card { border-radius: var(--radius-lg); }
.radius-modal { border-radius: var(--radius-xl); }
```

## Shadow System

### Elevation Levels
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25)

/* Colored shadows */
--shadow-primary: 0 4px 14px 0 rgb(139 69 19 / 0.15)
--shadow-error: 0 4px 14px 0 rgb(239 68 68 / 0.15)
--shadow-success: 0 4px 14px 0 rgb(16 185 129 / 0.15)
```

### Component Shadows
```css
.shadow-card { box-shadow: var(--shadow-sm); }
.shadow-button { box-shadow: var(--shadow-md); }
.shadow-modal { box-shadow: var(--shadow-xl); }
.shadow-dropdown { box-shadow: var(--shadow-lg); }
```

## Component Library

### Buttons

#### Primary Button
```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary-600);
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-md);
  border: none;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease-in-out;
  cursor: pointer;
}

.btn-primary:hover {
  background-color: var(--color-primary-700);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

.btn-primary:disabled {
  background-color: var(--color-gray-300);
  color: var(--color-gray-500);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
```

#### Secondary Button
```css
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  color: var(--color-primary-600);
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-primary-300);
  transition: all 0.2s ease-in-out;
  cursor: pointer;
}

.btn-secondary:hover {
  background-color: var(--color-primary-50);
  border-color: var(--color-primary-400);
  color: var(--color-primary-700);
}
```

#### Danger Button
```css
.btn-danger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-error-500);
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-md);
  border: none;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease-in-out;
  cursor: pointer;
}

.btn-danger:hover {
  background-color: var(--color-error-600);
  box-shadow: var(--shadow-md);
}
```

### Form Elements

#### Input Fields
```css
.form-input {
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--color-gray-700);
  background-color: white;
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-sm);
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px rgb(139 69 19 / 0.1);
}

.form-input:invalid {
  border-color: var(--color-error-400);
}

.form-input:disabled {
  background-color: var(--color-gray-50);
  color: var(--color-gray-500);
  cursor: not-allowed;
}
```

#### Labels
```css
.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-gray-700);
  margin-bottom: 0.375rem;
}

.form-label.required::after {
  content: ' *';
  color: var(--color-error-500);
}
```

#### Error Messages
```css
.form-error {
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: var(--color-error-600);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
```

### Cards

#### Base Card
```css
.card {
  background-color: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-gray-200);
  overflow: hidden;
  transition: all 0.2s ease-in-out;
}

.card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-gray-300);
}

.card-header {
  padding: var(--spacing-6);
  border-bottom: 1px solid var(--color-gray-200);
}

.card-body {
  padding: var(--spacing-6);
}

.card-footer {
  padding: var(--spacing-6);
  background-color: var(--color-gray-50);
  border-top: 1px solid var(--color-gray-200);
}
```

#### Feature Card
```css
.feature-card {
  background-color: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-gray-200);
  padding: var(--spacing-6);
  text-align: center;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
}

.feature-card:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary-300);
  transform: translateY(-2px);
}

.feature-card-icon {
  width: 3rem;
  height: 3rem;
  margin: 0 auto var(--spacing-4);
  color: var(--color-primary-600);
}

.feature-card-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-gray-900);
  margin-bottom: var(--spacing-2);
}

.feature-card-description {
  font-size: 0.875rem;
  color: var(--color-gray-600);
  line-height: 1.5;
}
```

## Brazilian-Specific Components

### Currency Input
```css
.currency-input {
  position: relative;
}

.currency-input::before {
  content: 'R$';
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  font-weight: 500;
  color: var(--color-gray-600);
  font-family: 'JetBrains Mono', monospace;
}

.currency-input input {
  padding-left: 2.5rem;
  font-family: 'JetBrains Mono', monospace;
  text-align: right;
}
```

### CPF/CNPJ Input
```css
.document-input {
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.05em;
}

.document-input[data-type="cpf"] {
  /* Format: 000.000.000-00 */
}

.document-input[data-type="cnpj"] {
  /* Format: 00.000.000/0000-00 */
}
```

### CEP Input
```css
.cep-input {
  font-family: 'JetBrains Mono', monospace;
  /* Format: 00000-000 */
}

.cep-lookup-button {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background-color: var(--color-primary-100);
  color: var(--color-primary-700);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
```

## Layout System

### Container
```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-4);
}

@media (min-width: 640px) {
  .container { padding: 0 var(--spacing-6); }
}

@media (min-width: 1024px) {
  .container { padding: 0 var(--spacing-8); }
}
```

### Grid System
```css
.grid {
  display: grid;
  gap: var(--spacing-6);
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }

/* Responsive grid */
@media (max-width: 640px) {
  .grid-cols-2,
  .grid-cols-3,
  .grid-cols-4 {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 641px) and (max-width: 768px) {
  .grid-cols-3,
  .grid-cols-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

## Responsive Design

### Breakpoints
```css
/* Mobile First Approach */
/* xs: 0px - 639px (default) */
/* sm: 640px+ */
@media (min-width: 640px) { }

/* md: 768px+ */
@media (min-width: 768px) { }

/* lg: 1024px+ */
@media (min-width: 1024px) { }

/* xl: 1280px+ */
@media (min-width: 1280px) { }

/* 2xl: 1536px+ */
@media (min-width: 1536px) { }
```

### Responsive Typography
```css
.responsive-text {
  font-size: 1rem;
  line-height: 1.5;
}

@media (min-width: 640px) {
  .responsive-text {
    font-size: 1.125rem;
    line-height: 1.56;
  }
}

@media (min-width: 1024px) {
  .responsive-text {
    font-size: 1.25rem;
    line-height: 1.6;
  }
}
```

## Accessibility Guidelines

### Focus Management
```css
.focus-visible:focus {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

.focus-visible:focus:not(:focus-visible) {
  outline: none;
}
```

### High Contrast Support
```css
@media (prefers-contrast: high) {
  .btn-primary {
    border: 2px solid currentColor;
  }
  
  .card {
    border-width: 2px;
  }
}
```

### Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Animation Guidelines

### Micro-interactions
```css
.transition-fast { transition: all 0.1s ease-out; }
.transition-normal { transition: all 0.2s ease-in-out; }
.transition-slow { transition: all 0.3s ease-in-out; }

/* Hover effects */
.hover-lift:hover {
  transform: translateY(-1px);
}

.hover-scale:hover {
  transform: scale(1.02);
}

/* Loading states */
.loading {
  position: relative;
  overflow: hidden;
}

.loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}
```

## Icon System

### Icon Sizes
```css
.icon-xs { width: 0.75rem; height: 0.75rem; }   /* 12px */
.icon-sm { width: 1rem; height: 1rem; }         /* 16px */
.icon-md { width: 1.25rem; height: 1.25rem; }   /* 20px */
.icon-lg { width: 1.5rem; height: 1.5rem; }     /* 24px */
.icon-xl { width: 2rem; height: 2rem; }         /* 32px */
```

### Icon Colors
```css
.icon-primary { color: var(--color-primary-600); }
.icon-secondary { color: var(--color-gray-500); }
.icon-success { color: var(--color-success-500); }
.icon-warning { color: var(--color-warning-500); }
.icon-error { color: var(--color-error-500); }
```

## Brazilian Cultural Considerations

### Color Meanings
- **Green & Yellow**: Brazilian national colors (use sparingly for special occasions)
- **Brown Tones**: Associated with chocolate, coffee, comfort food
- **Warm Colors**: Convey hospitality and family warmth
- **Blue**: Trust and reliability (good for financial elements)

### Typography Choices
- Prefer fonts that support Portuguese diacritics (á, ã, ç, etc.)
- Consider reading patterns (left-to-right, top-to-bottom)
- Use appropriate line heights for Portuguese text density

### Cultural Imagery
- Family-focused imagery
- Artisanal and handcrafted elements
- Warm, inviting environments
- Brazilian architectural elements (subtle references)

This design system provides a comprehensive foundation for creating a warm, professional, and accessible interface for Brazilian bakery operations while maintaining modern web design standards.