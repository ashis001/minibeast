import React, { useState } from "react";
import { Settings, Upload, Rocket, CheckCircle } from "lucide-react";
import Header from "./Header";
import StepIndicator from "./StepIndicator";
import ConfigurationStep from './ConfigurationStep';
import DeploymentStep from './DeploymentStep';
import ProgressStep from './ProgressStep';
import { AWSConfig } from '../types';

const steps = [
  {
    id: 1,
    title: "Configuration",
    description: "AWS & Snowflake setup",
    icon: Settings,
  },
  {
    id: 2,
    title: "Package Upload",
    description: "Upload your Python files",
    icon: Upload,
  },
  {
    id: 3,
    title: "Deployment",
    description: "Deploy to AWS ECS",
    icon: Rocket,
  },
  {
    id: 4,
    title: "Complete",
    description: "Deployment successful",
    icon: CheckCircle,
  },
];

const DeploymentWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [awsConfig, setAwsConfig] = useState<AWSConfig | null>(null);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  
  const handleNext = (config?: AWSConfig, deployId?: string) => {
    if (config && currentStep === 1) {
      setAwsConfig(config);
    }
    if (deployId && currentStep === 2) {
      setDeploymentId(deployId);
    }
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleComplete = () => {
    setCurrentStep(1); // Reset for demo purposes
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <ConfigurationStep onNext={handleNext} />;
      case 2:
        return <DeploymentStep onNext={(deployId) => handleNext(undefined, deployId)} awsConfig={awsConfig} />;
      case 3:
        return <ProgressStep onComplete={handleNext} deploymentId={deploymentId} />;
      case 4:
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-gradient-success rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-accent-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-accent">Deployment Complete!</h2>
              <p className="text-muted-foreground mt-2">
                Your validator package has been successfully deployed to AWS ECS.
              </p>
            </div>
            <button
              onClick={handleComplete}
              className="bg-gradient-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Start New Deployment
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <StepIndicator currentStep={currentStep} steps={steps} />
          
          <div className="mt-8">
            <div className="animate-fade-in">
              {renderStepContent()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DeploymentWizard;