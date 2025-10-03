import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Upload, X, Plus, Trash2, Container, Settings, Cloud, CheckCircle, RefreshCw, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { AWSConfig } from "@/types";

interface DeploymentStepProps {
  onNext: (deploymentId: string) => void;
  awsConfig: AWSConfig | null;
}

interface FileUpload {
  id: string;
  file: File;
  type: 'dockerImage';
}

interface EnvVariable {
  id: string;
  key: string;
  value: string;
}

interface DeploymentConfig {
  module: 'validator' | 'reconciliator' | 'migrator';
}

interface ExistingDeployment {
  deploymentId: string;
  module: string;
  apiEndpoint: string;
  completedAt: string;
  imageName: string;
}

const DeploymentStep = ({ onNext, awsConfig }: DeploymentStepProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [existingDeployments, setExistingDeployments] = useState<ExistingDeployment[]>([]);
  const [hasExistingDeployments, setHasExistingDeployments] = useState(false);
  const [showRedeployDialog, setShowRedeployDialog] = useState(false);
  // Predefined environment variables for validator module
  const getDefaultEnvVariables = (module: string): EnvVariable[] => {
    if (module === 'validator') {
      return [
        { id: '1', key: 'AWS_REGION', value: '' },
        { id: '2', key: 'CC_RECIPIENTS', value: '' },
        { id: '3', key: 'ITERATION', value: '' },
        { id: '4', key: 'MODULE', value: '' },
        { id: '5', key: 'PRIMARY_RECIPIENT', value: '' },
        { id: '6', key: 'SENDER_EMAIL', value: '' },
        { id: '7', key: 'SNOWFLAKE_CRED_PARAM', value: '' }
      ];
    }
    return [{ id: '1', key: '', value: '' }];
  };

  const [envVariables, setEnvVariables] = useState<EnvVariable[]>(
    getDefaultEnvVariables('validator')
  );
  const [deploymentConfig, setDeploymentConfig] = useState<DeploymentConfig>({
    module: 'validator'
  });
  const [dragOver, setDragOver] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  // Check for existing deployments when module changes
  useEffect(() => {
    const checkExistingDeployments = async () => {
      try {
        const response = await fetch(`http://localhost:3002/api/deployments/check/${deploymentConfig.module}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          setHasExistingDeployments(data.hasExistingDeployments);
          setExistingDeployments(data.deployments || []);
        }
      } catch (error) {
        console.error('Failed to check existing deployments:', error);
      }
    };

    checkExistingDeployments();
  }, [deploymentConfig.module]);

  const handleDeploy = async () => {
    if (!canProceed) return;

    setIsDeploying(true);

    const formData = new FormData();
    if (files.length > 0) {
      formData.append('dockerImage', files[0].file);
    }
    // Auto-generate image name based on module
    const autoImageName = `minibeat-${deploymentConfig.module}:latest`;
    formData.append('imageName', autoImageName);
    formData.append('envVariables', JSON.stringify(envVariables));
    formData.append('awsConfig', JSON.stringify(awsConfig));
    formData.append('deploymentConfig', JSON.stringify(deploymentConfig));

    try {
      const response = await fetch('http://localhost:3002/api/deploy', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Deployment Started",
          description: "Your deployment has been initiated successfully.",
        });
        onNext(data.deploymentId);
      } else {
        toast({
          title: "Deployment Failed",
          description: data.message || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Deployment Failed",
        description: "Could not connect to the server. Is it running?",
        variant: "destructive",
      });
    }

    setIsDeploying(false);
  };

  const handleFileUpload = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    
    const file = fileList[0];
    
    // Validate file type
    if (!file.name.endsWith('.tar')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a .tar file.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size (2GB limit)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB in bytes
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Docker image must be smaller than 2GB.",
        variant: "destructive",
      });
      return;
    }

    const newFile: FileUpload = {
      id: Math.random().toString(36).substr(2, 9),
      file,
      type: 'dockerImage'
    };

    // Replace any existing file
    setFiles([newFile]);

    toast({
      title: "Docker Image Uploaded",
      description: `Successfully uploaded ${file.name}`,
    });
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const getFileIcon = (type: 'dockerImage') => {
    return <Container className="h-5 w-5 text-blue-400" />;
  };

  const addEnvVariable = () => {
    const newVar: EnvVariable = {
      id: Math.random().toString(36).substr(2, 9),
      key: '',
      value: ''
    };
    setEnvVariables(prev => [...prev, newVar]);
  };

  const removeEnvVariable = (id: string) => {
    setEnvVariables(prev => prev.filter(env => env.id !== id));
  };

  const updateEnvVariable = (id: string, field: 'key' | 'value', value: string) => {
    setEnvVariables(prev => prev.map(env => 
      env.id === id ? { ...env, [field]: value } : env
    ));
  };

  const hasDockerImage = files.length > 0 && files[0].type === 'dockerImage';
  const hasValidEnvVars = envVariables.every(env => env.key.trim() !== '' && env.value.trim() !== '');
  const canProceed = hasDockerImage && hasValidEnvVars && awsConfig;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Cloud-Native Docker Deployment</h2>
        <p className="text-muted-foreground mt-2">
          Upload your pre-built Docker image and configure deployment settings
        </p>
      </div>

      {/* Cloud-Native Info */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Cloud className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">☁️ Pre-Built Image Deployment</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Upload your pre-built Docker image - no rebuilding required! The deployment runs entirely in AWS cloud.
              <br />
              • Your Docker tar file is extracted and pushed directly to ECR
              • No rebuilding - uses your existing pre-built image
              • Applications are deployed to Amazon ECS instantly
            </p>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Container className="h-5 w-5" />
            Docker Image Upload
          </CardTitle>
          <CardDescription>
            Upload your pre-built Docker image as a tar file. The image will be extracted and deployed directly to AWS - no rebuilding required!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag and Drop Area */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              "hover:border-primary hover:bg-primary/5"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Container className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Drop Docker image here or click to upload</p>
            <p className="text-sm text-muted-foreground mb-4">
              Upload a Docker image tar file (.tar)<br/>
              Maximum file size: 2GB
            </p>
            <Button 
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
            >
              Choose Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
              accept=".tar"
            />
          </div>


          {/* Uploaded Docker Image */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Uploaded Docker Image</h4>
              {files.map((fileUpload) => (
                <div key={fileUpload.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    {getFileIcon(fileUpload.type)}
                    <div>
                      <p className="font-medium">{fileUpload.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(fileUpload.file.size / 1024 / 1024).toFixed(1)} MB • Docker Image
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(fileUpload.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Deployments Warning */}
      {hasExistingDeployments && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <CheckCircle className="h-5 w-5" />
              Module Already Deployed
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-300">
              The {deploymentConfig.module} module is already deployed and running. You can access the existing deployment or redeploy with new settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {existingDeployments.map((deployment, index) => (
              <div key={deployment.deploymentId} className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Active Deployment</span>
                      <span className="text-sm text-muted-foreground">
                        ({new Date(deployment.completedAt).toLocaleDateString()})
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div><strong>Module:</strong> {deployment.module}</div>
                      <div><strong>Image:</strong> {deployment.imageName}</div>
                      <div className="flex items-center gap-2">
                        <strong>API Endpoint:</strong>
                        <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                          {deployment.apiEndpoint}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(deployment.apiEndpoint, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Re-deploy
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm Re-deployment</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to re-deploy the {deploymentConfig.module} module? 
                            This will create new AWS resources and may temporarily interrupt the existing service.
                            <br /><br />
                            <strong>Current deployment will be replaced with:</strong>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>New Docker image: {files.length > 0 ? files[0].file.name : 'No image selected'}</li>
                              <li>Updated environment variables</li>
                              <li>Fresh AWS infrastructure</li>
                            </ul>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeploy}
                            disabled={!canProceed || isDeploying}
                            className="bg-amber-600 hover:bg-amber-700"
                          >
                            {isDeploying ? 'Re-deploying...' : 'Yes, Re-deploy'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Module Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Module Selection
          </CardTitle>
          <CardDescription>
            Select which Minibeat module to deploy. Resource names will be auto-generated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="module">Minibeat Module</Label>
            <select
              id="module"
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm mt-1"
              value={deploymentConfig.module}
              onChange={(e) => {
                const newModule = e.target.value as 'validator' | 'reconciliator' | 'migrator';
                setDeploymentConfig(prev => ({ ...prev, module: newModule }));
                setEnvVariables(getDefaultEnvVariables(newModule));
              }}
            >
              <option value="validator">Validator</option>
              <option value="reconciliator">Reconciliator</option>
              <option value="migrator">Migrator</option>
            </select>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm text-muted-foreground">
                Selected module: <strong>minibeat_{deploymentConfig.module}</strong>
              </p>
              {hasExistingDeployments && (
                <div className="flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  <CheckCircle className="h-3 w-3" />
                  Already Deployed
                </div>
              )}
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100">Auto-Generated Resources</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  All AWS resources will be automatically created with names following the pattern:
                  <br />
                  <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">minibeat_{deploymentConfig.module}_[unique_sequence]</code>
                </p>
                <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                  <div>• ECR Repository: minibeat_{deploymentConfig.module}_repo_[id]</div>
                  <div>• ECS Cluster: minibeat_{deploymentConfig.module}_cluster_[id]</div>
                  <div>• Task Definition: minibeat_{deploymentConfig.module}_task_[id]</div>
                  <div>• Step Function: minibeat_{deploymentConfig.module}_workflow_[id]</div>
                  <div>• API Gateway: minibeat_{deploymentConfig.module}_api_[id]</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environment Variables */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>
            {deploymentConfig.module === 'validator' 
              ? 'Configure required environment variables for the validator module'
              : 'Configure environment variables for your deployment'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {envVariables.map((env, index) => {
            // Get example hints for predefined keys
            const getKeyExample = (key: string) => {
              const examples: Record<string, string> = {
                'AWS_REGION': 'us-east-1',
                'CC_RECIPIENTS': 'user1@company.com,user2@company.com',
                'ITERATION': '1',
                'MODULE': '1',
                'PRIMARY_RECIPIENT': 'admin@company.com',
                'SENDER_EMAIL': 'noreply@company.com',
                'SNOWFLAKE_CRED_PARAM': '/app/snowflake/credentials'
              };
              return examples[key] || '';
            };

            const keyExample = getKeyExample(env.key);
            const isHardcodedKey = deploymentConfig.module === 'validator' && Boolean(keyExample);

            return (
              <div key={env.id} className="flex gap-4 items-center">
                <div className="flex-1">
                  <Input
                    placeholder={isHardcodedKey ? env.key : "Variable name (e.g., API_KEY)"}
                    value={env.key}
                    onChange={(e) => updateEnvVariable(env.id, 'key', e.target.value)}
                    disabled={isHardcodedKey}
                    className={isHardcodedKey ? "bg-muted" : ""}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder={keyExample || "Variable value"}
                    value={env.value}
                    onChange={(e) => updateEnvVariable(env.id, 'value', e.target.value)}
                    className="placeholder:text-gray-400 placeholder:opacity-50"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEnvVariable(env.id)}
                  disabled={envVariables.length === 1 || isHardcodedKey}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          
          {deploymentConfig.module !== 'validator' && (
            <Button
              variant="outline"
              onClick={addEnvVariable}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Environment Variable
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        {hasExistingDeployments ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              This module is already deployed. Use the "Re-deploy" button above to update it with new settings.
            </p>
            <Button 
              onClick={handleDeploy} 
              disabled={!canProceed || isDeploying}
              size="lg"
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              {isDeploying ? 'Re-deploying...' : 'Deploy New Instance →'}
            </Button>
          </div>
        ) : (
          <Button 
            onClick={handleDeploy} 
            disabled={!canProceed || isDeploying}
            size="lg"
            className="bg-gradient-primary hover:opacity-90"
          >
            {isDeploying ? 'Starting Deployment...' : 'Start Deployment →'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default DeploymentStep;
