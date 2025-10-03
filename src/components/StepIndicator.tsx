import { Check, Settings, Upload, Rocket, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: number;
  steps: Array<{
    id: number;
    title: string;
    description: string;
    icon: React.ComponentType<any>;
  }>;
}

const StepIndicator = ({ currentStep, steps }: StepIndicatorProps) => {
  return (
    <div className="w-full py-8">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-muted">
          <div 
            className="h-full bg-gradient-primary transition-all duration-500 ease-out"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
        
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          
          return (
            <div key={step.id} className="flex flex-col items-center relative z-10">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isCompleted
                    ? "bg-gradient-primary border-primary text-primary-foreground"
                    : isCurrent
                    ? "bg-primary border-primary text-primary-foreground animate-pulse-glow"
                    : "bg-card border-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <StepIcon className="h-6 w-6" />
                )}
              </div>
              
              <div className="mt-3 text-center">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCurrent
                      ? "text-primary"
                      : isCompleted
                      ? "text-accent"
                      : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-24">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;