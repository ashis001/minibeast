import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, TestTube, CheckCircle, AlertCircle, Snowflake, Cloud, Edit, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AWSConfig } from "@/types";

interface ConfigurationStepProps {
  onNext: (config: AWSConfig) => void;
}

const ConfigurationStep = ({ onNext }: ConfigurationStepProps) => {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [awsStatus, setAwsStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [snowflakeStatus, setSnowflakeStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [awsConfigSaved, setAwsConfigSaved] = useState(false);
  const [snowflakeConfigSaved, setSnowflakeConfigSaved] = useState(false);
  const [editingAws, setEditingAws] = useState(false);
  const [editingSnowflake, setEditingSnowflake] = useState(false);
  const [settingUpPermissions, setSettingUpPermissions] = useState(false);
  const [userName, setUserName] = useState('');
  
  const [awsConfig, setAwsConfig] = useState<AWSConfig>({
    accessKey: '',
    secretKey: '',
    region: 'us-east-1'
  });
  
  const [snowflakeConfig, setSnowflakeConfig] = useState({
    username: '',
    password: '',
    account: '',
    role: '',
    warehouse: '',
    database: '',
    schema: ''
  });

  const testAWSConnection = async () => {
    setAwsStatus('testing');
    setTesting(true);
    try {
      const response = await fetch('https://florida-alexander-geological-signs.trycloudflare.com/api/test-aws', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(awsConfig),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setAwsStatus('success');
        setAwsConfigSaved(true);
        localStorage.setItem('awsConfig', JSON.stringify(awsConfig));
        toast({
          title: "AWS Connection Successful",
          description: "Configuration saved successfully",
        });
      } else {
        setAwsStatus('error');
        toast({
          title: "AWS Connection Failed",
          description: data.message || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setAwsStatus('error');
      toast({
        title: "AWS Connection Failed",
        description: "Could not connect to the server. Is it running?",
        variant: "destructive",
      });
    }
    setTesting(false);
  };

  const testSnowflakeConnection = async () => {
    setSnowflakeStatus('testing');
    setTesting(true);
    try {
      const response = await fetch('https://florida-alexander-geological-signs.trycloudflare.com/api/test-snowflake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(snowflakeConfig),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSnowflakeStatus('success');
        setSnowflakeConfigSaved(true);
        localStorage.setItem('snowflakeConfig', JSON.stringify(snowflakeConfig));
        toast({
          title: "Snowflake Connection Successful",
          description: "Configuration saved successfully",
        });
      } else {
        setSnowflakeStatus('error');
        toast({
          title: "Snowflake Connection Failed",
          description: data.message || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setSnowflakeStatus('error');
      toast({
        title: "Snowflake Connection Failed",
        description: "Could not connect to the server. Is it running?",
        variant: "destructive",
      });
    }
    setTesting(false);
  };

  // Load saved configurations on component mount
  useEffect(() => {
    const savedAwsConfig = localStorage.getItem('awsConfig');
    const savedSnowflakeConfig = localStorage.getItem('snowflakeConfig');
    
    if (savedAwsConfig) {
      const parsedAwsConfig = JSON.parse(savedAwsConfig);
      setAwsConfig(parsedAwsConfig);
      setAwsStatus('success');
      setAwsConfigSaved(true);
    }
    
    if (savedSnowflakeConfig) {
      const parsedSnowflakeConfig = JSON.parse(savedSnowflakeConfig);
      setSnowflakeConfig(parsedSnowflakeConfig);
      setSnowflakeStatus('success');
      setSnowflakeConfigSaved(true);
    }
  }, []);

  const handleEditAws = () => {
    setEditingAws(true);
    setAwsStatus('idle');
    setAwsConfigSaved(false);
  };

  const handleEditSnowflake = () => {
    setEditingSnowflake(true);
    setSnowflakeStatus('idle');
    setSnowflakeConfigSaved(false);
  };

  const setupPermissions = async () => {
    if (!awsConfig.accessKey || !awsConfig.secretKey || !awsConfig.region || !userName) {
      toast({
        title: "Missing Information",
        description: "Please fill in AWS credentials and username first",
        variant: "destructive",
      });
      return;
    }

    setSettingUpPermissions(true);
    try {
      const response = await fetch('https://florida-alexander-geological-signs.trycloudflare.com/api/setup-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessKey: awsConfig.accessKey,
          secretKey: awsConfig.secretKey,
          region: awsConfig.region,
          userName: userName
        }),
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: "Permissions Setup Complete",
          description: `Policy '${data.policyName}' attached successfully!`,
        });
      } else {
        toast({
          title: "Permission Setup Failed",
          description: data.message || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Permission Setup Failed",
        description: "Could not connect to the server. Is it running?",
        variant: "destructive",
      });
    }
    setSettingUpPermissions(false);
  };

  const canProceed = awsStatus === 'success' && snowflakeStatus === 'success';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Service Configuration</h2>
        <p className="text-muted-foreground mt-2">
          Configure your AWS and Snowflake connections to proceed with deployment
        </p>
      </div>

      {/* Permission Setup Section */}
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
            <Shield className="h-5 w-5" />
            AWS Permissions Setup
          </CardTitle>
          <CardDescription>
            If you encounter permission errors during deployment, use this tool to automatically set up the required AWS permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aws-username">AWS IAM Username</Label>
              <Input
                id="aws-username"
                type="text"
                placeholder="your-iam-username"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={setupPermissions} 
                disabled={settingUpPermissions || !awsConfig.accessKey || !awsConfig.secretKey || !userName}
                className="w-full"
                variant="outline"
              >
                <Shield className="h-4 w-4 mr-2" />
                {settingUpPermissions ? 'Setting up...' : 'Setup Permissions'}
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            This will create and attach a policy called 'DataDeployerFullAccess' to your IAM user with all required permissions.
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="aws" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="aws" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            AWS Configuration
          </TabsTrigger>
          <TabsTrigger value="snowflake" className="flex items-center gap-2">
            <Snowflake className="h-4 w-4" />
            Snowflake Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="aws">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  AWS Credentials
                  {awsStatus === 'success' && <CheckCircle className="h-5 w-5 text-accent" />}
                  {awsStatus === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
                </div>
                {awsConfigSaved && !editingAws && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEditAws}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                Provide your AWS credentials for ECS, ECR, and other services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aws-access-key">Access Key ID</Label>
                  <Input
                    id="aws-access-key"
                    type="text"
                    placeholder="AKIA..."
                    value={awsConfig.accessKey}
                    onChange={(e) => setAwsConfig(prev => ({ ...prev, accessKey: e.target.value }))}
                    disabled={awsConfigSaved && !editingAws}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aws-region">Region</Label>
                  <Input
                    id="aws-region"
                    type="text"
                    placeholder="us-east-1"
                    value={awsConfig.region}
                    onChange={(e) => setAwsConfig(prev => ({ ...prev, region: e.target.value }))}
                    disabled={awsConfigSaved && !editingAws}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="aws-secret-key">Secret Access Key</Label>
                <div className="relative">
                  <Input
                    id="aws-secret-key"
                    type={showSecretKey ? "text" : "password"}
                    placeholder="Enter your secret access key"
                    value={awsConfig.secretKey}
                    onChange={(e) => setAwsConfig(prev => ({ ...prev, secretKey: e.target.value }))}
                    disabled={awsConfigSaved && !editingAws}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                  >
                    {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                onClick={testAWSConnection} 
                disabled={testing || !awsConfig.accessKey || !awsConfig.secretKey || (awsConfigSaved && !editingAws)}
                className="w-full"
                variant={awsStatus === 'success' ? 'default' : 'outline'}
              >
                <TestTube className="h-4 w-4 mr-2" />
                {awsStatus === 'testing' ? 'Testing Connection...' : 
                 awsConfigSaved && !editingAws ? 'Configuration Saved ✓' : 'Test AWS Connection'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="snowflake">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Snowflake className="h-5 w-5" />
                  Snowflake Configuration
                  {snowflakeStatus === 'success' && <CheckCircle className="h-5 w-5 text-accent" />}
                  {snowflakeStatus === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
                </div>
                {snowflakeConfigSaved && !editingSnowflake && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEditSnowflake}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                Configure your Snowflake data warehouse connection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sf-username">Username</Label>
                  <Input
                    id="sf-username"
                    type="text"
                    placeholder="your_username"
                    value={snowflakeConfig.username}
                    onChange={(e) => setSnowflakeConfig(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sf-account">Account</Label>
                  <Input
                    id="sf-account"
                    type="text"
                    placeholder="account.region"
                    value={snowflakeConfig.account}
                    onChange={(e) => setSnowflakeConfig(prev => ({ ...prev, account: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sf-password">Password</Label>
                <div className="relative">
                  <Input
                    id="sf-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={snowflakeConfig.password}
                    onChange={(e) => setSnowflakeConfig(prev => ({ ...prev, password: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sf-role">Role</Label>
                  <Input
                    id="sf-role"
                    type="text"
                    placeholder="SYSADMIN"
                    value={snowflakeConfig.role}
                    onChange={(e) => setSnowflakeConfig(prev => ({ ...prev, role: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sf-warehouse">Warehouse</Label>
                  <Input
                    id="sf-warehouse"
                    type="text"
                    placeholder="COMPUTE_WH"
                    value={snowflakeConfig.warehouse}
                    onChange={(e) => setSnowflakeConfig(prev => ({ ...prev, warehouse: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sf-database">Database</Label>
                  <Input
                    id="sf-database"
                    type="text"
                    placeholder="PROD_DB"
                    value={snowflakeConfig.database}
                    onChange={(e) => setSnowflakeConfig(prev => ({ ...prev, database: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sf-schema">Schema</Label>
                  <Input
                    id="sf-schema"
                    type="text"
                    placeholder="PUBLIC"
                    value={snowflakeConfig.schema}
                    onChange={(e) => setSnowflakeConfig(prev => ({ ...prev, schema: e.target.value }))}
                  />
                </div>
              </div>

              <Button 
                onClick={testSnowflakeConnection}
                disabled={testing || !snowflakeConfig.username || !snowflakeConfig.password || !snowflakeConfig.account}
                className="w-full"
                variant={snowflakeStatus === 'success' ? 'default' : 'outline'}
              >
                <TestTube className="h-4 w-4 mr-2" />
                {snowflakeStatus === 'testing' ? 'Testing Connection...' : 'Test Snowflake Connection'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button 
          onClick={() => {
            // Save Snowflake config to localStorage for use in Add Validation
            if (snowflakeConfigSaved) {
              localStorage.setItem('snowflakeConfig', JSON.stringify(snowflakeConfig));
            }
            onNext(awsConfig);
          }} 
          disabled={!canProceed}
          size="lg"
          className="bg-gradient-primary hover:opacity-90"
        >
          Continue to Deployment →
        </Button>
      </div>
    </div>
  );
};

export default ConfigurationStep;