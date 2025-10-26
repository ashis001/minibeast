import React, { useState, useEffect } from "react";
import { Upload, Rocket, CheckCircle, RefreshCw, Trash2, AlertTriangle, Shield, GitBranch, Activity } from "lucide-react";
import Header from "./Header";
import StepIndicator from "./StepIndicator";
import DeploymentStep from './DeploymentStep';
import ProgressStep from './ProgressStep';
import { AWSConfig } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';

const steps = [
  {
    id: 1,
    title: "Package Upload",
    description: "Upload your Python files",
    icon: Upload,
  },
  {
    id: 2,
    title: "Deployment",
    description: "Deploy to AWS ECS",
    icon: Rocket,
  },
  {
    id: 3,
    title: "Complete",
    description: "Deployment successful",
    icon: CheckCircle,
  },
];

const ModuleDeployment = () => {
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
  const [connectionsConfigured, setConnectionsConfigured] = useState(false);

  const modules = [
    { 
      id: 'validator', 
      name: 'Validator', 
      description: 'Data validation and quality checks',
      icon: Shield,
      color: 'emerald'
    },
    { 
      id: 'migrator', 
      name: 'Migrator', 
      description: 'Data migration and transformation',
      icon: GitBranch,
      color: 'blue'
    },
    { 
      id: 'reconciliator', 
      name: 'Reconciliator', 
      description: 'Data reconciliation and matching',
      icon: Activity,
      color: 'purple'
    }
  ];

  // Check if connections are configured
  useEffect(() => {
    const checkConnections = () => {
      const awsConfigStr = localStorage.getItem('awsConfig');
      const snowflakeConfigStr = localStorage.getItem('snowflakeConfig');
      
      if (awsConfigStr && snowflakeConfigStr) {
        try {
          const parsedAwsConfig = JSON.parse(awsConfigStr);
          setAwsConfig(parsedAwsConfig);
          setConnectionsConfigured(true);
        } catch (error) {
          console.error('Failed to parse configs:', error);
          setConnectionsConfigured(false);
        }
      } else {
        setConnectionsConfigured(false);
      }
    };
    
    checkConnections();
    
    // Listen for connection updates
    const handleConnectionUpdate = () => checkConnections();
    window.addEventListener('connectionsUpdated', handleConnectionUpdate);
    
    return () => {
      window.removeEventListener('connectionsUpdated', handleConnectionUpdate);
    };
  }, []);

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
        setCurrentStep(1);
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to clear deployment: ${error.message}`,
        variant: "destructive",
      });
    }
    setIsClearing(false);
  };

  const handleDeploymentNext = (deploymentId: string) => {
    setDeploymentId(deploymentId);
    setCurrentStep(currentStep + 1);
  };

  const handleComplete = () => {
    setCurrentStep(3);
  };

  // Check if connections are configured before showing anything
  if (!connectionsConfigured) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Module Deployment</h1>
            <p className="text-slate-400 mt-1">Deploy your modules to AWS ECS</p>
          </div>
        </div>

        <Card className="bg-orange-900/20 border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              Connections Not Configured
            </CardTitle>
            <CardDescription className="text-slate-300">
              You need to configure AWS and Snowflake connections before deploying modules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-slate-300 text-sm">
                Please go to <span className="font-semibold text-white">Settings → Connections</span> to configure your:
              </p>
              <ul className="space-y-2 text-sm text-slate-300 ml-6">
                <li>• AWS Credentials (Access Key, Secret Key, Region)</li>
                <li>• Snowflake Connection (Account, Username, Password)</li>
              </ul>
              <div className="pt-4">
                <Button 
                  onClick={() => window.dispatchEvent(new CustomEvent('navigateToConnections'))}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Go to Connections
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show module selector
  if (showModuleSelector) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <Rocket className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Module Deployment</h1>
            <p className="text-slate-400 mt-1">Select a module to deploy to AWS ECS</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modules.map((module) => (
            <Card 
              key={module.id} 
              className={`bg-${module.color}-900/20 border-${module.color}-500/30 hover:border-${module.color}-500/60 cursor-pointer transition-all hover:scale-105`}
              onClick={() => handleModuleSelect(module.id)}
            >
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <module.icon className="h-5 w-5" />
                  {module.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-sm mb-4">{module.description}</p>
                <Button className={`w-full bg-${module.color}-500 hover:bg-${module.color}-600`}>
                  Deploy {module.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show loading while checking deployment status
  if (isCheckingDeployment) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-muted-foreground">Checking deployment status...</p>
        </div>
      </div>
    );
  }

  // Show existing deployment status
  if (existingDeployment) {
    return (
      <div className="space-y-6">
        <Card className="bg-slate-800 border-slate-700">
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
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
          <Rocket className="h-6 w-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Deploy {modules.find(m => m.id === selectedModule)?.name}</h1>
          <p className="text-slate-400 mt-1">Upload package and deploy to AWS ECS</p>
        </div>
      </div>

      <StepIndicator steps={steps} currentStep={currentStep} />
      
      <div className="mt-8">
        {currentStep === 1 && awsConfig && (
          <DeploymentStep onNext={handleDeploymentNext} awsConfig={awsConfig} selectedModule={selectedModule} />
        )}
        {currentStep === 2 && deploymentId && (
          <ProgressStep deploymentId={deploymentId} onComplete={handleComplete} />
        )}
        {currentStep === 3 && (
          <Card className="bg-brand-green/20 border-brand-green/100/30">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-brand-green/100 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Deployment Complete!
              </h2>
              <p className="text-slate-300 mb-6">
                Your {modules.find(m => m.id === selectedModule)?.name} module has been successfully deployed to AWS.
              </p>
              <Button onClick={handleBackToModuleSelector}>
                Deploy Another Module
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ModuleDeployment;
