import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload, File, X, Plus, Trash2, Container, Settings, RefreshCw } from "lucide-react";
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


const DeploymentStep = ({ onNext, awsConfig }: DeploymentStepProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [imageName, setImageName] = useState<string>('');
  const [envVariables, setEnvVariables] = useState<EnvVariable[]>([
    { id: '1', key: '', value: '' }
  ]);
  const [deploymentConfig, setDeploymentConfig] = useState<DeploymentConfig>({
    module: 'validator'
  });
  const [awsResources, setAwsResources] = useState({
    clusters: [] as string[],
    taskDefinitions: [] as string[],
    ecrRepositories: [] as string[],
    iamRoles: [] as string[],
    stepFunctions: [] as string[],
    apiGateways: [] as string[]
  });
  const [loadingResources, setLoadingResources] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  const handleDeploy = async () => {
    if (!canProceed) return;

    setIsDeploying(true);

    const formData = new FormData();
    if (files.length > 0) {
      formData.append('dockerImage', files[0].file);
    }
    formData.append('imageName', imageName);
    formData.append('envVariables', JSON.stringify(envVariables));
    formData.append('awsConfig', JSON.stringify(awsConfig));
    formData.append('deploymentConfig', JSON.stringify(deploymentConfig));

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Deployment Started",
          description: data.message,
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


  const addEnvVariable = () => {
    const newVar: EnvVariable = {
      id: Math.random().toString(36).substr(2, 9),
      key: '',
      value: ''
    };
    setEnvVariables(prev => [...prev, newVar]);
  };

  const updateEnvVariable = (id: string, field: 'key' | 'value', value: string) => {
    setEnvVariables(prev => 
      prev.map(env => 
        env.id === id ? { ...env, [field]: value } : env
      )
    );
  };

  const removeEnvVariable = (id: string) => {
    if (envVariables.length > 1) {
      setEnvVariables(prev => prev.filter(env => env.id !== id));
    }
  };

  const fetchAwsResources = async () => {
    if (!awsConfig) {
      toast({
        title: "AWS Configuration Required",
        description: "Please configure AWS credentials first",
        variant: "destructive",
      });
      return;
    }

    setLoadingResources(true);
    try {
      const response = await fetch('/api/aws-resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(awsConfig),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setAwsResources(data.resources);
        toast({
          title: "Resources Loaded",
          description: "AWS resources fetched successfully",
        });
      } else {
        toast({
          title: "Failed to Load Resources",
          description: data.message || "Could not fetch AWS resources",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error Loading Resources",
        description: "Could not connect to server",
        variant: "destructive",
      });
    }
    setLoadingResources(false);
  };

  const handleFileUpload = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    
    const file = fileList[0];
    
    // Validate file type
    if (!file.name.endsWith('.tar')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a .tar file created by the build script.",
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
    
    // Auto-extract image name from filename if not set
    if (!imageName) {
      const baseName = file.name.replace('.tar', '');
      setImageName(`${baseName}:latest`);
    }

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

  const hasDockerImage = files.length > 0 && files[0].type === 'dockerImage';
  const hasImageName = imageName.trim() !== '';
  const hasValidEnvVars = envVariables.every(env => env.key.trim() !== '' && env.value.trim() !== '');
  const canProceed = hasDockerImage && hasImageName && hasValidEnvVars && awsConfig;

  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Docker Image Deployment</h2>
        <p className="text-muted-foreground mt-2">
          Upload your pre-built Docker image and configure deployment settings
        </p>
      </div>

      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Container className="h-5 w-5" />
            Docker Image Upload
          </CardTitle>
          <CardDescription>
            Upload your pre-built Docker image as a tar file. Use the build script to create this file locally.
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
              Upload a Docker image tar file (.tar) created using the build script<br/>
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

          {/* Image Name Input */}
          <div className="space-y-2">
            <Label htmlFor="imageName">Docker Image Name</Label>
            <Input
              id="imageName"
              placeholder="e.g., my-data-app:latest"
              value={imageName}
              onChange={(e) => setImageName(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              This should match the image name from your build script output
            </p>
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
              onChange={(e) => setDeploymentConfig(prev => ({ 
                ...prev, 
                module: e.target.value as 'validator' | 'reconciliator' | 'migrator' 
              }))}
            >
              <option value="validator">Validator</option>
              <option value="reconciliator">Reconciliator</option>
              <option value="migrator">Migrator</option>
            </select>
            <p className="text-sm text-muted-foreground mt-1">
              Selected module: <strong>minibeat_{deploymentConfig.module}</strong>
            </p>
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
            Configure environment variables for your deployment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {envVariables.map((env, index) => (
            <div key={env.id} className="flex gap-4 items-center">
              <div className="flex-1">
                <Input
                  placeholder="Variable name (e.g., API_KEY)"
                  value={env.key}
                  onChange={(e) => updateEnvVariable(env.id, 'key', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Variable value"
                  value={env.value}
                  onChange={(e) => updateEnvVariable(env.id, 'value', e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeEnvVariable(env.id)}
                disabled={envVariables.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clusterName">ECS Cluster Name *</Label>
                  <select
                    id="clusterName"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                    value={awsResourceConfig.clusterName}
                    onChange={(e) => setAwsResourceConfig(prev => ({ ...prev, clusterName: e.target.value }))}
                  >
                    <option value="">Select a cluster...</option>
                    {awsResources.clusters.map(cluster => (
                      <option key={cluster} value={cluster}>{cluster}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="taskDefinitionFamily">Task Definition Family *</Label>
                  <select
                    id="taskDefinitionFamily"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                    value={awsResourceConfig.taskDefinitionFamily}
                    onChange={(e) => setAwsResourceConfig(prev => ({ ...prev, taskDefinitionFamily: e.target.value }))}
                  >
                    <option value="">Select a task definition...</option>
                    {awsResources.taskDefinitions.map(taskDef => (
                      <option key={taskDef} value={taskDef}>{taskDef}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="executionRoleName">ECS Execution Role</Label>
                  <select
                    id="executionRoleName"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                    value={awsResourceConfig.executionRoleName}
                    onChange={(e) => setAwsResourceConfig(prev => ({ ...prev, executionRoleName: e.target.value }))}
                  >
                    <option value="">Select a role (or leave empty for default)...</option>
                    {awsResources.iamRoles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="stepFunctionRoleName">Step Function Role</Label>
                  <select
                    id="stepFunctionRoleName"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                    value={awsResourceConfig.stepFunctionRoleName}
                    onChange={(e) => setAwsResourceConfig(prev => ({ ...prev, stepFunctionRoleName: e.target.value }))}
                  >
                    <option value="">Select a role (optional)...</option>
                    {awsResources.iamRoles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="stepFunctionName">Step Function Name</Label>
                  <select
                    id="stepFunctionName"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                    value={awsResourceConfig.stepFunctionName}
                    onChange={(e) => setAwsResourceConfig(prev => ({ ...prev, stepFunctionName: e.target.value }))}
                  >
                    <option value="">Select a step function (optional)...</option>
                    {awsResources.stepFunctions.map(stepFunc => (
                      <option key={stepFunc} value={stepFunc}>{stepFunc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="ecrRepositoryName">ECR Repository Name *</Label>
                  <select
                    id="ecrRepositoryName"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                    value={awsResourceConfig.ecrRepositoryName}
                    onChange={(e) => setAwsResourceConfig(prev => ({ ...prev, ecrRepositoryName: e.target.value }))}
                  >
                    <option value="">Select a repository...</option>
                    {awsResources.ecrRepositories.map(repo => (
                      <option key={repo} value={repo}>{repo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="apiGatewayName">API Gateway Name</Label>
                  <select
                    id="apiGatewayName"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                    value={awsResourceConfig.apiGatewayName}
                    onChange={(e) => setAwsResourceConfig(prev => ({ ...prev, apiGatewayName: e.target.value }))}
                  >
                    <option value="">Select an API (optional)...</option>
                    {awsResources.apiGateways.map(api => (
                      <option key={api} value={api}>{api}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newClusterName">New ECS Cluster Name</Label>
                <Input
                  id="newClusterName"
                  placeholder="Auto-generated if empty"
                  value={awsResourceConfig.clusterName}
                  onChange={(e) => setAwsResourceConfig(prev => ({ ...prev, clusterName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="newTaskFamily">New Task Definition Family</Label>
                <Input
                  id="newTaskFamily"
                  placeholder="Auto-generated if empty"
                  value={awsResourceConfig.taskDefinitionFamily}
                  onChange={(e) => setAwsResourceConfig(prev => ({ ...prev, taskDefinitionFamily: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="newExecutionRole">New ECS Execution Role</Label>
                <Input
                  id="newExecutionRole"
                  placeholder="Auto-generated if empty"
                  value={awsResourceConfig.executionRoleName}
                  onChange={(e) => setAwsResourceConfig(prev => ({ ...prev, executionRoleName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="newStepFunctionRole">New Step Function Role</Label>
                <Input
                  id="newStepFunctionRole"
                  placeholder="Auto-generated if empty"
                  value={awsResourceConfig.stepFunctionRoleName}
                  onChange={(e) => setAwsResourceConfig(prev => ({ ...prev, stepFunctionRoleName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="newStepFunction">New Step Function Name</Label>
                <Input
                  id="newStepFunction"
                  placeholder="Auto-generated if empty"
                  value={awsResourceConfig.stepFunctionName}
                  onChange={(e) => setAwsResourceConfig(prev => ({ ...prev, stepFunctionName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="newEcrRepo">New ECR Repository Name</Label>
                <Input
                  id="newEcrRepo"
                  placeholder="Auto-generated if empty"
                  value={awsResourceConfig.ecrRepositoryName}
                  onChange={(e) => setAwsResourceConfig(prev => ({ ...prev, ecrRepositoryName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="newApiGateway">New API Gateway Name</Label>
                <Input
                  id="newApiGateway"
                  placeholder="Auto-generated if empty"
                  value={awsResourceConfig.apiGatewayName}
                  onChange={(e) => setAwsResourceConfig(prev => ({ ...prev, apiGatewayName: e.target.value }))}
                />
              </div>
            </div>
          )}
          
          {/* IAM Role Policy Configuration */}
          <div className="space-y-4">
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">IAM Role Policy Configuration</h4>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="policyType">Role Policy Type</Label>
                  <select
                    id="policyType"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm mt-1"
                    value={awsResourceConfig.policyType}
                    onChange={(e) => setAwsResourceConfig(prev => ({ 
                      ...prev, 
                      policyType: e.target.value as 'default' | 'custom' 
                    }))}
                  >
                    <option value="default">Use Default Role Policies</option>
                    <option value="custom">Custom Role Policies (JSON)</option>
                  </select>
                  <p className="text-sm text-muted-foreground mt-1">
                    {awsResourceConfig.policyType === 'default' 
                      ? 'Use predefined role policies with standard permissions for ECS, Step Functions, and API Gateway roles'
                      : 'Provide custom JSON policies to attach to the IAM roles created for this deployment'
                    }
                  </p>
                </div>
                
                {awsResourceConfig.policyType === 'custom' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="customExecutionPolicy">ECS Execution Role Policy (JSON)</Label>
                      <Textarea
                        id="customExecutionPolicy"
                        placeholder='{"Version": "2012-10-17", "Statement": [...]}'
                        value={awsResourceConfig.customExecutionPolicy}
                        onChange={(e) => setAwsResourceConfig(prev => ({ 
                          ...prev, 
                          customExecutionPolicy: e.target.value 
                        }))}
                        className="mt-1 font-mono text-sm"
                        rows={4}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="customStepFunctionPolicy">Step Functions Role Policy (JSON)</Label>
                      <Textarea
                        id="customStepFunctionPolicy"
                        placeholder='{"Version": "2012-10-17", "Statement": [...]}'
                        value={awsResourceConfig.customStepFunctionPolicy}
                        onChange={(e) => setAwsResourceConfig(prev => ({ 
                          ...prev, 
                          customStepFunctionPolicy: e.target.value 
                        }))}
                        className="mt-1 font-mono text-sm"
                        rows={4}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="customApiGatewayPolicy">API Gateway Role Policy (JSON)</Label>
                      <Textarea
                        id="customApiGatewayPolicy"
                        placeholder='{"Version": "2012-10-17", "Statement": [...]}'
                        value={awsResourceConfig.customApiGatewayPolicy}
                        onChange={(e) => setAwsResourceConfig(prev => ({ 
                          ...prev, 
                          customApiGatewayPolicy: e.target.value 
                        }))}
                        className="mt-1 font-mono text-sm"
                        rows={4}
                      />
                    </div>
                    
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>⚠️ Warning:</strong> Custom role policies must be valid JSON and include all necessary permissions for the respective IAM roles. These policies will be attached to the ECS execution role, Step Functions role, and API Gateway role created during deployment.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {awsResourceConfig.useExisting ? (
              <div className="space-y-1">
                <p>⚠️ Make sure the selected resources exist and have proper permissions.</p>
                <p>💡 Click "Fetch Resources" to load available resources from your AWS account.</p>
              </div>
            ) : (
              <p>💡 Leave fields empty to auto-generate names based on deployment ID.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Environment Variables */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>
            Configure environment variables for your deployment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {envVariables.map((env, index) => (
            <div key={env.id} className="flex gap-4 items-center">
              <div className="flex-1">
                <Input
                  placeholder="Variable name (e.g., API_KEY)"
                  value={env.key}
                  onChange={(e) => updateEnvVariable(env.id, 'key', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Variable value"
                  value={env.value}
                  onChange={(e) => updateEnvVariable(env.id, 'value', e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeEnvVariable(env.id)}
                disabled={envVariables.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <Button
            variant="outline"
            onClick={addEnvVariable}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Environment Variable
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleDeploy} 
          disabled={!canProceed || isDeploying}
          size="lg"
          className="bg-gradient-primary hover:opacity-90"
        >
          {isDeploying ? 'Starting Deployment...' : 'Start Deployment →'}
        </Button>
      </div>
    </div>
  );
};

export default DeploymentStep;