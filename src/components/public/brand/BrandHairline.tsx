/**
 * BrandHairline — gilded ornamental divider, the same vocabulary that appears
 * across the brand site (a thin line, a soft fade, a tiny dot accent).
 *
 * Two flavors:
 *   - "narrow" (default): two short hairlines flanking a single dot. Used
 *     under crests and inside checkout cards.
 *   - "wide": full-width hairline with a centered diamond pip. Used between
 *     page-level sections.
 */

import * as React from 'react'

interface BrandHairlineProps {
  variant?: 'narrow' | 'wide'
  className?: string
}

export function BrandHairline({
  variant = 'narrow',
  className = '',
}: BrandHairlineProps) {
  if (variant === 'wide') {
    return (
      <div
        className={`flex items-center justify-center gap-3 ${className}`}
        aria-hidden="true"
      >
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C9A96E]/50 to-transparent" />
        {/* Diamond pip — same shape as the apex pip in the brand monogram */}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          xmlns="http://www.w3.org/2000/svg"
          className="flex-shrink-0 text-[#C9A96E]"
          aria-hidden="true"
        >
          <path d="M5 0.5 L9.5 5 L5 9.5 L0.5 5 Z" fill="currentColor" />
        </svg>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#C9A96E]/50 to-transparent" />
      </div>
    )
  }

  return (
    <div
      className={`flex items-center justify-center gap-2 ${className}`}
      aria-hidden="true"
    >
      <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#C9A96E]/55" />
      <div className="w-1 h-1 rounded-full bg-[#C9A96E]/80" />
      <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#C9A96E]/55" />
    </div>
  )
}
