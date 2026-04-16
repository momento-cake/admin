'use client'

import { Check } from 'lucide-react'

interface StepIndicatorProps {
  steps: { label: string; icon?: React.ReactNode }[]
  currentStep: number
  completedSteps: Set<number>
  onStepClick?: (step: number) => void
}

export function StepIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <div className="w-full px-2 sm:px-4">
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(index)
          const isActive = currentStep === index

          return (
            <div key={index} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <button
                type="button"
                disabled={!isCompleted || !onStepClick}
                onClick={() => isCompleted && onStepClick?.(index)}
                className="flex flex-col items-center gap-1.5 group"
                aria-label={`${step.label}${isCompleted ? ' (concluído)' : isActive ? ' (atual)' : ''}`}
              >
                <div
                  className={`
                    flex items-center justify-center rounded-full
                    transition-all duration-300 font-medium text-xs
                    h-8 w-8 sm:h-10 sm:w-10 sm:text-sm
                    ${
                      isCompleted
                        ? 'bg-primary text-primary-foreground shadow-sm group-hover:shadow-md group-hover:scale-105'
                        : isActive
                          ? 'bg-primary/10 text-primary border-2 border-primary shadow-[0_0_0_4px] shadow-primary/10'
                          : 'bg-muted/60 text-muted-foreground border border-border'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={`
                    hidden sm:block text-[11px] font-medium tracking-wide uppercase
                    ${isActive ? 'text-primary' : isCompleted ? 'text-foreground/70' : 'text-muted-foreground/60'}
                  `}
                >
                  {step.label}
                </span>
              </button>

              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2 sm:mx-3">
                  <div className="h-[2px] rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-primary w-full' : 'bg-transparent w-0'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
