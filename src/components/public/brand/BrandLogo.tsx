/**
 * BrandLogo — renders the official Momento Cake mark using the brand PNG
 * stored at /public/brand/logo.png (downloaded verbatim from
 * momentocake.com.br/img/logo.png so the typography and proportions match
 * the live brand exactly).
 *
 * Variants:
 *   - "horizontal" → full lockup (icon + "MOMENTO cake" wordmark).
 *   - "wordmark"   → same lockup; alias kept for callsites that want the
 *                    "name only" feel — visually identical to horizontal
 *                    because the brand's only published asset is the
 *                    combined lockup.
 *   - "monogram"   → just the framed-M icon piece, cropped from the same
 *                    PNG via SVG viewBox so the artwork stays a single
 *                    source of truth and stays in sync with the brand.
 */

import * as React from 'react'
import Image from 'next/image'

type Variant = 'horizontal' | 'monogram' | 'wordmark'

interface BrandLogoProps {
  variant?: Variant
  className?: string
  /** Display width in px. Height is derived from the asset's aspect ratio. */
  width?: number
  /**
   * Kept for source-compat with the previous inline-SVG implementation.
   * Has no effect now that the artwork is a baked-in PNG.
   */
  color?: string
  /** Optional accessible label. Decorative when omitted. */
  ariaLabel?: string
}

// Native dimensions of public/brand/logo.png (verified with `file`).
const LOGO_W = 396
const LOGO_H = 128

// Approximate bounding box of the icon piece inside the full lockup,
// measured from the saved PNG. Used to crop the monogram variant via
// SVG viewBox so we don't need a separate asset.
const ICON_X = 4
const ICON_Y = 8
const ICON_W = 88
const ICON_H = 112

export function BrandLogo({
  variant = 'horizontal',
  className,
  width,
  ariaLabel,
}: BrandLogoProps) {
  const decorative = !ariaLabel

  if (variant === 'monogram') {
    const size = width ?? 56
    return (
      <span
        className={className}
        style={{ display: 'inline-block', lineHeight: 0 }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`${ICON_X} ${ICON_Y} ${ICON_W} ${ICON_H}`}
          xmlns="http://www.w3.org/2000/svg"
          role={decorative ? undefined : 'img'}
          aria-hidden={decorative ? true : undefined}
          aria-label={ariaLabel}
          preserveAspectRatio="xMidYMid meet"
        >
          <image
            href="/brand/logo.png"
            x={0}
            y={0}
            width={LOGO_W}
            height={LOGO_H}
          />
        </svg>
      </span>
    )
  }

  // horizontal & wordmark both render the full lockup PNG. The brand only
  // ships one combined mark; treating "wordmark" as an alias keeps callsite
  // intent readable without forging a second artwork.
  const w = width ?? 220
  const h = Math.round((w * LOGO_H) / LOGO_W)
  return (
    <span
      className={className}
      style={{ display: 'inline-block', lineHeight: 0 }}
    >
      <Image
        src="/brand/logo.png"
        alt={ariaLabel ?? ''}
        width={w}
        height={h}
        priority
        aria-hidden={decorative ? true : undefined}
        style={{ width: w, height: 'auto', display: 'block' }}
      />
    </span>
  )
}
