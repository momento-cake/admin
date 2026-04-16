'use client'

import { Check } from 'lucide-react'

interface StepIndicatorProps {
  steps: { label: string; icon?: React.ReactNode }[]
  currentStep: number // 0-indexed
  completedSteps: Set<number>
  onStepClick?: (step: number) => void // only allow clicking completed steps
}

export function StepIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorProps) {
  const progressPercent =
    steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 0

  return (
    <div className="w-full">
      {/* Steps row */}
      <div className="flex items-start justify-between relative">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(index)
          const isActive = currentStep === index
          const isUpcoming = !isCompleted && !isActive

          // Connecting line between circles
          const showLine = index < steps.length - 1
          const lineCompleted =
            completedSteps.has(index) && completedSteps.has(index + 1)

          return (
            <div
              key={index}
              className="flex flex-col items-center relative z-10"
              style={{ flex: index === 0 || index === steps.length - 1 ? '0 0 auto' : '1' }}
            >
              {/* Circle */}
              <button
                type="button"
                disabled={!isCompleted || !onStepClick}
                onClick={() => isCompleted && onStepClick?.(index)}
                className={`
                  flex items-center justify-center rounded-full border-2
                  transition-all duration-200 font-medium text-sm
                  h-7 w-7 sm:h-9 sm:w-9
                  ${
                    isCompleted
                      ? 'bg-primary border-primary text-primary-foreground cursor-pointer hover:bg-primary/90'
                      : isActive
                        ? 'border-primary text-primary ring-4 ring-primary/20 bg-background'
                        : 'border-muted-foreground/30 text-muted-foreground bg-background'
                  }
                  ${isCompleted && onStepClick ? 'cursor-pointer' : isUpcoming ? 'cursor-default' : ''}
                `}
                aria-label={`${step.label}${isCompleted ? ' (concluído)' : isActive ? ' (atual)' : ''}`}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </button>

              {/* Step label - hidden on small screens */}
              <span
                className={`
                  hidden sm:block mt-2 text-xs font-medium text-center max-w-[80px]
                  ${isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}
                `}
              >
                {step.label}
              </span>

              {/* Connecting line */}
              {showLine && (
                <div
                  className={`
                    absolute top-3.5 sm:top-[18px] h-0.5
                    ${lineCompleted || (isCompleted && (completedSteps.has(index + 1) || currentStep === index + 1)) ? 'bg-primary' : 'bg-muted'}
                  `}
                  style={{
                    left: '50%',
                    width: 'calc(100% + 100%)',
                    zIndex: -1,
                  }}
                />
              )}
            </div>
          )
        })}

        {/* Lines connecting steps (rendered as a background layer) */}
        <div className="absolute top-3.5 sm:top-[18px] left-0 right-0 flex -z-10">
          {steps.slice(0, -1).map((_, index) => {
            const lineCompleted =
              completedSteps.has(index) &&
              (completedSteps.has(index + 1) || currentStep === index + 1)
            return (
              <div
                key={`line-${index}`}
                className={`flex-1 h-0.5 ${lineCompleted ? 'bg-primary' : 'bg-muted'}`}
              />
            )
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-[3px] w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}
