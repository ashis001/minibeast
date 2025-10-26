import React, { useState, useEffect } from "react";
import { Settings, Upload, Rocket, CheckCircle, RefreshCw, Trash2 } from "lucide-react";
import Header from "./Header";
import StepIndicator from "./StepIndicator";
import ConfigurationStep from './ConfigurationStep';
import DeploymentStep from './DeploymentStep';
import ProgressStep from './ProgressStep';
import { AWSConfig } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';

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
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [awsConfig, setAwsConfig] = useState<AWSConfig | null>(null);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  
  // Module selection
  const [selectedModule, setSelectedModule] = useState<string>('validator');
  const [showModuleSelector, setShowModuleSelector] = useState(true);
  
  // Deployment status states
  const [isCheckingDeployment, setIsCheckingDeployment] = useState(false);
  const [existingDeployment, setExistingDeployment] = useState<any>(null);
  const [isClearing, setIsClearing] = useState(false);

  const modules = [
    { id: 'validator', name: 'Validator', description: 'Data validation and quality checks' },
    { id: 'migrator', name: 'Migrator', description: 'Data migration and transformation' },
    { id: 'reconciliator', name: 'Reconciliator', description: 'Data reconciliation and matching' }
  ];


  const handleModuleSelect = async (moduleId: string) => {
    setSelectedModule(moduleId);
    setShowModuleSelector(false);
    setIsCheckingDeployment(true);
    setExistingDeployment(null);
    
    // Check deployment status immediately
    try {
      const response = await fetch(`/api/deployment/status/${moduleId}`);
      const data = await response.json();
      
      if (data.success && data.isDeployed) {
        setExistingDeployment(data.deploymentData);
      } else {
        setExistingDeployment(null);
        setCurrentStep(1); // Only set step if no deployment found
      }
    } catch (error) {
      console.error('❌ Error checking deployment:', error);
      setExistingDeployment(null);
      setCurrentStep(1);
    }
    setIsCheckingDeployment(false);
  };

  const handleBackToModuleSelector = () => {
    setShowModuleSelector(true);
    setExistingDeployment(null);
    setCurrentStep(1);
  };

  const handleRedeploy = async () => {
    setIsClearing(true);
    try {
      const response = await fetch(`/api/deployment/clear/${selectedModule}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setExistingDeployment(null);
        setCurrentStep(1);
        toast({
          title: "Deployment Cleared",
          description: data.message,
        });
      } else {
        toast({
          title: "Clear Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to clear deployment: ${error.message}`,
        variant: "destructive",
      });
    }
    setIsClearing(false);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
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

  const handleDeploymentNext = (deploymentId: string) => {
    setDeploymentId(deploymentId);
    setCurrentStep(currentStep + 1);
  };

  const handleComplete = () => {
    setCurrentStep(4);
  };

  // Show module selector
  if (showModuleSelector) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Select Module to Deploy</h1>
              <p className="text-muted-foreground">Choose which module you want to deploy to AWS</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {modules.map((module) => (
                <Card 
                  key={module.id} 
                  className="bg-slate-800 border-slate-700 hover:bg-slate-700 cursor-pointer transition-colors"
                  onClick={() => handleModuleSelect(module.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Rocket className="h-5 w-5" />
                      {module.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-300 text-sm">{module.description}</p>
                    <Button className="w-full mt-4" variant="outline">
                      Deploy {module.name}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while checking deployment status
  if (isCheckingDeployment) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
            <p className="text-muted-foreground">Checking deployment status...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show existing deployment status
  if (existingDeployment) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CheckCircle className="h-6 w-6 text-brand-green/100" />
                {modules.find(m => m.id === selectedModule)?.name} Module Already Deployed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
                <h3 className="font-semibold text-brand-green/80 mb-2">Deployment Details</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-slate-300"><strong className="text-white">Status:</strong> <span className="text-brand-green/80">{existingDeployment.status}</span></p>
                  <p className="text-slate-300"><strong className="text-white">Completed:</strong> {new Date(existingDeployment.completedAt).toLocaleString()}</p>
                  <p className="text-slate-300"><strong className="text-white">Region:</strong> {existingDeployment.region}</p>
                  <p className="text-slate-300"><strong className="text-white">Module:</strong> {selectedModule}</p>
                </div>
              </div>
              
              <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4">
                <h3 className="font-semibold text-amber-400 mb-2">⚠️ Redeploy Warning</h3>
                <p className="text-sm text-amber-300">
                  Redeploying will replace the existing deployment and may cause downtime. 
                  Make sure this is what you want to do.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  onClick={handleRedeploy}
                  disabled={isClearing}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  {isClearing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Redeploy Module
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleBackToModuleSelector}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Back to Modules
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <StepIndicator steps={steps} currentStep={currentStep} />
        
        <div className="mt-8">
          {currentStep === 1 && (
            <ConfigurationStep onNext={handleNext} />
          )}
          {currentStep === 2 && awsConfig && (
            <DeploymentStep onNext={handleDeploymentNext} awsConfig={awsConfig} />
          )}
          {currentStep === 3 && deploymentId && (
            <ProgressStep deploymentId={deploymentId} onComplete={handleComplete} />
          )}
          {currentStep === 4 && (
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-brand-green/100 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Deployment Complete!
              </h2>
              <p className="text-gray-600">
                Your application has been successfully deployed to AWS.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeploymentWizard;