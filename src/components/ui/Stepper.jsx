import React, { Children, useRef, useLayoutEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import './Stepper.css';

const MotionDiv = motion.div;
const MotionPath = motion.path;

export default function Stepper({
  children,
  initialStep = 1,
  onStepChange,
  onFinalStepCompleted,
  onBeforeStepChange,
  onStepChangeBlocked,
  stepCircleContainerClassName = '',
  stepContainerClassName = '',
  contentClassName = '',
  footerClassName = '',
  backButtonProps = {},
  nextButtonProps = {},
  backButtonText = 'Back',
  nextButtonText = 'Continue',
  disableStepIndicators = false,
  renderStepIndicator,
  renderFooter,
  ...rest
}) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const stepsArray = Children.toArray(children);
  const totalSteps = stepsArray.length;
  const isCompleted = currentStep > totalSteps;
  const isLastStep = currentStep === totalSteps;

  const canMoveToStep = (targetStep) => {
    try {
      if (targetStep <= currentStep) return true;
      if (!onBeforeStepChange) return true;

      const result = onBeforeStepChange({
        currentStep,
        targetStep,
        totalSteps,
        isLastStep,
      });



      if (result === true || typeof result === 'undefined') return true;

      if (result === false) {
        onStepChangeBlocked?.({ currentStep, targetStep });
        return false;
      }

      if (typeof result === 'object' && result !== null) {
        if (result.ok === false) {

          onStepChangeBlocked?.({ currentStep, targetStep, reason: result.reason || '' });
          return false;
        }
        return true;
      }

      return true;
    } catch (err) {

      return false;
    }
  };

  const updateStep = (newStep) => {
    setCurrentStep(newStep);
    if (newStep <= totalSteps) {
      onStepChange?.(newStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      updateStep(currentStep - 1);
    }
  };

  const handleNext = () => {

    if (!isLastStep) {
      const targetStep = currentStep + 1;
      if (!canMoveToStep(targetStep)) return;
      setDirection(1);
      updateStep(targetStep);
    }
  };

  const handleComplete = async (submitArg) => {

    if (isSubmitting) return;
    if (!canMoveToStep(totalSteps + 1)) return;

    try {
      setIsSubmitting(true);
      const result = await onFinalStepCompleted?.(submitArg);

      // Treat explicit false as failed submit; keep user on current step.
      if (result === false) {
        return;
      }

      setDirection(1);
      updateStep(totalSteps + 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="outer-container" {...rest}>
      <div className={`step-circle-container ${stepCircleContainerClassName}`} style={{ border: '1px solid #222' }}>
        <div className={`step-indicator-row ${stepContainerClassName}`}>
          {stepsArray.map((_, index) => {
            const stepNumber = index + 1;
            const isNotLastStep = index < totalSteps - 1;

            return (
              <React.Fragment key={stepNumber}>
                {renderStepIndicator ? (
                  renderStepIndicator({
                    step: stepNumber,
                    currentStep,
                    onStepClick: (clicked) => {
                      setDirection(clicked > currentStep ? 1 : -1);
                      updateStep(clicked);
                    },
                  })
                ) : (
                  <StepIndicator
                    step={stepNumber}
                    disableStepIndicators={disableStepIndicators}
                    currentStep={currentStep}
                    onClickStep={(clicked) => {
                      if (!canMoveToStep(clicked)) return;
                      setDirection(clicked > currentStep ? 1 : -1);
                      updateStep(clicked);
                    }}
                  />
                )}
                {isNotLastStep && <StepConnector isComplete={currentStep > stepNumber} />}
              </React.Fragment>
            );
          })}
        </div>

        <StepContentWrapper
          isCompleted={isCompleted}
          currentStep={currentStep}
          direction={direction}
          className={`step-content-default ${contentClassName}`}
        >
          {stepsArray[currentStep - 1]}
        </StepContentWrapper>

        {!isCompleted && (
          renderFooter ? renderFooter({ currentStep, totalSteps, isLastStep, handleBack, handleNext, handleComplete, isSubmitting }) : (
            <div className={`footer-container ${footerClassName}`}>
              <div className={`footer-nav ${currentStep !== 1 ? 'spread' : 'end'}`}>
                {currentStep !== 1 && (
                  <button
                    onClick={handleBack}
                    className={`back-button ${currentStep === 1 ? 'inactive' : ''}`}
                    disabled={isSubmitting}
                    {...backButtonProps}
                  >
                    {backButtonText}
                  </button>
                )}

                <button
                  onClick={isLastStep ? handleComplete : handleNext}
                  className="next-button"
                  disabled={isSubmitting}
                  {...nextButtonProps}
                >
                  {isLastStep ? 'Complete' : nextButtonText}
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function StepContentWrapper({ isCompleted, currentStep, direction, children, className }) {
  return (
    <div
      className={className}
      style={{ position: 'relative', overflow: 'visible', width: '100%' }}
    >
      <AnimatePresence initial={false} mode="wait" custom={direction}>
        {!isCompleted && (
          <SlideTransition key={currentStep} direction={direction}>
            {children}
          </SlideTransition>
        )}
      </AnimatePresence>
    </div>
  );
}

function SlideTransition({ children, direction }) {
  return (
    <MotionDiv
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
      style={{ width: '100%' }}
    >
      {children}
    </MotionDiv>
  );
}

const stepVariants = {
  enter: (dir) => ({
    x: dir >= 0 ? 15 : -15,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir) => ({
    x: dir >= 0 ? -15 : 15,
    opacity: 0,
  }),
};

export function Step({ children }) {
  return <div className="step-default">{children}</div>;
}

function StepIndicator({ step, currentStep, onClickStep, disableStepIndicators }) {
  const status = currentStep === step ? 'active' : currentStep < step ? 'inactive' : 'complete';

  const handleClick = () => {
    if (step !== currentStep && !disableStepIndicators) {
      onClickStep(step);
    }
  };

  return (
    <MotionDiv onClick={handleClick} className="step-indicator" animate={status} initial={false}>
      <MotionDiv
        variants={{
          inactive: { scale: 1, backgroundColor: '#222', color: '#a3a3a3' },
          active: { scale: 1, backgroundColor: '#5227FF', color: '#5227FF' },
          complete: { scale: 1, backgroundColor: '#5227FF', color: '#3b82f6' },
        }}
        transition={{ duration: 0.3 }}
        className="step-indicator-inner"
      >
        {status === 'complete' ? (
          <CheckIcon className="check-icon" />
        ) : status === 'active' ? (
          <div className="active-dot" />
        ) : (
          <span className="step-number">{step}</span>
        )}
      </MotionDiv>
    </MotionDiv>
  );
}

function StepConnector({ isComplete }) {
  const lineVariants = {
    incomplete: { width: 0, backgroundColor: 'transparent' },
    complete: { width: '100%', backgroundColor: '#5227FF' },
  };

  return (
    <div className="step-connector">
      <MotionDiv
        className="step-connector-inner"
        variants={lineVariants}
        initial={false}
        animate={isComplete ? 'complete' : 'incomplete'}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

function CheckIcon(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <MotionPath
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, type: 'tween', ease: 'easeOut', duration: 0.3 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
