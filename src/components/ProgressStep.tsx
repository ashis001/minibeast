import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, AlertCircle, Copy, ExternalLink, RotateCcw, ChevronDown, ChevronRight, Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
interface ProgressStepProps {
  onComplete: () => void;
  deploymentId: string | null;
}

interface DeploymentLog {
  timestamp: string;
  message: string;
}

interface DeploymentStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  duration?: number;
  logs?: DeploymentLog[];
  details?: string;
}

const ProgressStep = ({ onComplete, deploymentId }: ProgressStepProps) => {
  const { toast } = useToast();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [deploymentComplete, setDeploymentComplete] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const [steps, setSteps] = useState<DeploymentStep[]>([
    {
      id: 'ecr-repo',
      title: 'Creating ECR Repository',
      description: 'Setting up container registry for your application',
      status: 'pending'
    },
    {
      id: 'ecr-push',
      title: 'Pushing to ECR',
      description: 'Uploading container image to registry',
      status: 'pending'
    },
    {
      id: 'task-definition',
      title: 'Creating ECS Task Definition',
      description: 'Configuring container specifications',
      status: 'pending'
    },
    {
      id: 'ecs-service',
      title: 'Configuring ECS Infrastructure',
      description: 'Setting up task definition and cluster for API execution',
      status: 'pending'
    },
    {
      id: 'step-functions',
      title: 'Configuring Step Functions',
      description: 'Setting up workflow orchestration',
      status: 'pending'
    },
  ]);

  useEffect(() => {
    if (!deploymentId) return;

    const pollDeploymentStatus = async () => {
      try {
        const response = await fetch(`/api/deployment/${deploymentId}/status`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          const deployment = data.deployment;
          
          // Update steps based on real deployment status
          setSteps(prev => {
            const newSteps = [...prev];
            
            Object.keys(deployment.steps).forEach(stepId => {
              const stepIndex = newSteps.findIndex(s => s.id === stepId);
              if (stepIndex !== -1) {
                const deploymentStep = deployment.steps[stepId];
                newSteps[stepIndex].status = deploymentStep.status;
                newSteps[stepIndex].logs = deploymentStep.logs || [];
                
                if (deploymentStep.startTime && deploymentStep.endTime) {
                  newSteps[stepIndex].duration = Math.round((deploymentStep.endTime - deploymentStep.startTime) / 1000);
                }
                
                // Auto-expand steps that have logs and are running or failed
                if (deploymentStep.logs && deploymentStep.logs.length > 0 && 
                    (deploymentStep.status === 'running' || deploymentStep.status === 'error')) {
                  setExpandedSteps(prev => new Set([...prev, stepId]));
                }
              }
            });
            
            return newSteps;
          });
          
          // Update current step index
          const completedSteps = Object.values(deployment.steps).filter((s: any) => s.status === 'completed').length;
          setCurrentStepIndex(completedSteps);
          
          // Check if deployment is complete
          if (deployment.status === 'completed') {
            setDeploymentComplete(true);
            setApiEndpoint(deployment.apiEndpoint);
          } else if (deployment.status === 'failed') {
            // Handle failure
            setSteps(prev => {
              const newSteps = [...prev];
              const currentStepName = deployment.currentStep;
              const stepIndex = newSteps.findIndex(s => s.id === currentStepName);
              if (stepIndex !== -1) {
                newSteps[stepIndex].status = 'error';
                newSteps[stepIndex].details = deployment.error;
              }
              return newSteps;
            });
          }
        }
      } catch (error) {
        console.error('Failed to poll deployment status:', error);
      }
    };

    // Poll immediately and then every 2 seconds
    pollDeploymentStatus();
    const interval = setInterval(pollDeploymentStatus, 2000);

    return () => clearInterval(interval);
  }, [deploymentId]);

  const retryDeployment = async () => {
    if (!deploymentId) return;
    
    try {
      const response = await fetch(`/api/deployment/${deploymentId}/retry`, {
        method: 'POST'
      });
      
      if (response.ok) {
        toast({
          title: "Deployment Retry Started",
          description: "Retrying failed deployment step...",
        });
        
        // Reset deployment status
        setDeploymentComplete(false);
        setApiEndpoint('');
        
        // Reset steps to show retry in progress
        setSteps(prev => prev.map(step => ({
          ...step,
          status: step.status === 'error' ? 'pending' : step.status
        })));
      } else {
        toast({
          title: "Retry Failed",
          description: "Could not retry deployment. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Retry Failed",
        description: "Network error occurred while retrying.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "API endpoint has been copied to your clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the API endpoint manually",
        variant: "destructive",
      });
    }
  };

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Deployment in Progress</h2>
        <p className="text-muted-foreground mt-2">
          {deploymentComplete 
            ? "Your deployment is complete and ready to use!"
            : "Deploying your validator package to AWS infrastructure..."
          }
        </p>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Deployment Progress</span>
            <span className="text-sm font-normal text-muted-foreground">
              {completedSteps} of {totalSteps} steps completed
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={progressPercentage} className="h-3" />
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{Math.round(progressPercentage)}%</p>
              <p className="text-sm text-muted-foreground">
                {deploymentComplete ? "Deployment Complete" : "Processing..."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Details */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <Card 
            key={step.id}
            className={cn(
              "transition-all duration-300",
              step.status === 'running' && "ring-2 ring-primary animate-pulse-glow"
            )}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex-shrink-0">
                {step.status === 'completed' && (
                  <CheckCircle className="h-6 w-6 text-accent" />
                )}
                {step.status === 'running' && (
                  <Clock className="h-6 w-6 text-primary animate-spin" />
                )}
                {step.status === 'pending' && (
                  <div className="h-6 w-6 rounded-full border-2 border-muted" />
                )}
                {step.status === 'error' && (
                  <AlertCircle className="h-6 w-6 text-destructive" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium",
                  step.status === 'completed' && "text-accent",
                  step.status === 'running' && "text-primary",
                  step.status === 'pending' && "text-muted-foreground"
                )}>
                  {step.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {step.duration && (
                  <div className="text-sm text-muted-foreground">
                    {step.duration}s
                  </div>
                )}
                {step.status === 'error' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryDeployment}
                    className="text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                )}
                {(step.logs && step.logs.length > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleStepExpansion(step.id)}
                    className="text-xs"
                  >
                    {expandedSteps.has(step.id) ? (
                      <ChevronDown className="h-3 w-3 mr-1" />
                    ) : (
                      <ChevronRight className="h-3 w-3 mr-1" />
                    )}
                    Logs
                  </Button>
                )}
              </div>
            </CardContent>
            
            {/* Expandable Logs Section */}
            {expandedSteps.has(step.id) && step.logs && step.logs.length > 0 && (
              <div className="border-t bg-slate-50 dark:bg-slate-900/50">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Terminal className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Live Logs ({step.logs.length} entries)
                    </span>
                  </div>
                  <div className="bg-black rounded-md p-3 max-h-60 overflow-y-auto font-mono text-sm">
                    {step.logs.map((log, logIndex) => (
                      <div key={logIndex} className="text-green-400 mb-1">
                        <span className="text-gray-500 text-xs">
                          [{new Date(log.timestamp).toLocaleTimeString()}]
                        </span>{' '}
                        <span dangerouslySetInnerHTML={{ __html: log.message.replace(/✅|❌|⚠️/g, '<span class="text-yellow-400">$&</span>') }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* API Endpoint Result */}
      {deploymentComplete && apiEndpoint && (
        <Card className="border-accent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-accent">
              <CheckCircle className="h-5 w-5" />
              Deployment Successful!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">API Endpoint</Label>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm">
                  {apiEndpoint}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(apiEndpoint)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(apiEndpoint, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>• Your validator package is now deployed and accessible via the API endpoint above</p>
              <p>• The ECS service is running and ready to process requests</p>
              <p>• Step Functions workflow is configured for orchestration</p>
            </div>
          </CardContent>
        </Card>
      )}

      {deploymentComplete && (
        <div className="flex justify-center">
          <Button 
            onClick={onComplete}
            size="lg"
            className="bg-gradient-success hover:opacity-90"
          >
            Complete Deployment
          </Button>
        </div>
      )}
    </div>
  );
};

const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <label className={className}>{children}</label>
);

export default ProgressStep;