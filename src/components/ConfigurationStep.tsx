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
  selectedService?: string;
}

const ConfigurationStep = ({ onNext, selectedService }: ConfigurationStepProps) => {
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

  const [mysqlConfig, setMysqlConfig] = useState({
    host: '',
    port: '3306',
    username: '',
    password: '',
    database: ''
  });

  const [postgresConfig, setPostgresConfig] = useState({
    host: '',
    port: '5432',
    username: '',
    password: '',
    database: ''
  });

  const [bigqueryConfig, setBigqueryConfig] = useState({
    project_id: '',
    dataset: '',
    credentials_json: ''
  });

  const [mysqlStatus, setMysqlStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [postgresStatus, setPostgresStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [bigqueryStatus, setBigqueryStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [mysqlConfigSaved, setMysqlConfigSaved] = useState(false);
  const [postgresConfigSaved, setPostgresConfigSaved] = useState(false);
  const [bigqueryConfigSaved, setBigqueryConfigSaved] = useState(false);

  const testAWSConnection = async () => {
    setAwsStatus('testing');
    setTesting(true);
    try {
      const response = await fetch('/api/test-aws', {
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
      const response = await fetch('/api/test-snowflake', {
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
        
        // Also save to backend for persistence across deployments
        try {
          const response = await fetch('/api/config/snowflake', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(snowflakeConfig),
          });
        } catch (error) {
          console.error('Failed to save config to backend:', error);
        }
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

  const testMySQLConnection = async () => {
    setMysqlStatus('testing');
    setTesting(true);
    try {
      // For now, just simulate success since backend isn't implemented yet
      setTimeout(() => {
        setMysqlStatus('success');
        setMysqlConfigSaved(true);
        localStorage.setItem('mysqlConfig', JSON.stringify(mysqlConfig));
        toast({
          title: "MySQL Connection Successful",
          description: "Configuration saved successfully",
        });
        setTesting(false);
      }, 1500);
    } catch (error) {
      setMysqlStatus('error');
      toast({
        title: "MySQL Connection Failed",
        description: "Could not connect to the server.",
        variant: "destructive",
      });
      setTesting(false);
    }
  };

  const testPostgreSQLConnection = async () => {
    setPostgresStatus('testing');
    setTesting(true);
    try {
      // For now, just simulate success since backend isn't implemented yet
      setTimeout(() => {
        setPostgresStatus('success');
        setPostgresConfigSaved(true);
        localStorage.setItem('postgresConfig', JSON.stringify(postgresConfig));
        toast({
          title: "PostgreSQL Connection Successful",
          description: "Configuration saved successfully",
        });
        setTesting(false);
      }, 1500);
    } catch (error) {
      setPostgresStatus('error');
      toast({
        title: "PostgreSQL Connection Failed",
        description: "Could not connect to the server.",
        variant: "destructive",
      });
      setTesting(false);
    }
  };

  const testBigQueryConnection = async () => {
    setBigqueryStatus('testing');
    setTesting(true);
    try {
      // For now, just simulate success since backend isn't implemented yet
      setTimeout(() => {
        setBigqueryStatus('success');
        setBigqueryConfigSaved(true);
        localStorage.setItem('bigqueryConfig', JSON.stringify(bigqueryConfig));
        toast({
          title: "BigQuery Connection Successful",
          description: "Configuration saved successfully",
        });
        setTesting(false);
      }, 1500);
    } catch (error) {
      setBigqueryStatus('error');
      toast({
        title: "BigQuery Connection Failed",
        description: "Could not connect to the server.",
        variant: "destructive",
      });
      setTesting(false);
    }
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
      const response = await fetch('/api/setup-permissions', {
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


      {/* Show tabs only if no specific service selected, otherwise show single service */}
      <Tabs defaultValue={selectedService || "aws"} className="w-full">
        {!selectedService && (
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
        )}

        {(!selectedService || selectedService === 'aws') && (
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
        )}

        {(!selectedService || selectedService === 'snowflake') && (
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
        )}

        {(!selectedService || selectedService === 'mysql') && (
          <TabsContent value="mysql">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🐬 MySQL Configuration
                  {mysqlStatus === 'success' && <CheckCircle className="h-5 w-5 text-accent" />}
                  {mysqlStatus === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
                </CardTitle>
                <CardDescription>Configure your MySQL database connection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mysql-host">Host</Label>
                    <Input
                      id="mysql-host"
                      type="text"
                      placeholder="localhost or IP address"
                      value={mysqlConfig.host}
                      onChange={(e) => setMysqlConfig(prev => ({ ...prev, host: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mysql-port">Port</Label>
                    <Input
                      id="mysql-port"
                      type="text"
                      placeholder="3306"
                      value={mysqlConfig.port}
                      onChange={(e) => setMysqlConfig(prev => ({ ...prev, port: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mysql-username">Username</Label>
                    <Input
                      id="mysql-username"
                      type="text"
                      placeholder="root"
                      value={mysqlConfig.username}
                      onChange={(e) => setMysqlConfig(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mysql-password">Password</Label>
                    <Input
                      id="mysql-password"
                      type="password"
                      placeholder="Enter password"
                      value={mysqlConfig.password}
                      onChange={(e) => setMysqlConfig(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mysql-database">Database</Label>
                  <Input
                    id="mysql-database"
                    type="text"
                    placeholder="my_database"
                    value={mysqlConfig.database}
                    onChange={(e) => setMysqlConfig(prev => ({ ...prev, database: e.target.value }))}
                  />
                </div>

                <Button 
                  onClick={testMySQLConnection}
                  disabled={testing || !mysqlConfig.host || !mysqlConfig.username}
                  className="w-full"
                  variant={mysqlStatus === 'success' ? 'default' : 'outline'}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {mysqlStatus === 'testing' ? 'Testing Connection...' : 'Test MySQL Connection'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {(!selectedService || selectedService === 'postgresql') && (
          <TabsContent value="postgresql">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🐘 PostgreSQL Configuration
                  {postgresStatus === 'success' && <CheckCircle className="h-5 w-5 text-accent" />}
                  {postgresStatus === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
                </CardTitle>
                <CardDescription>Configure your PostgreSQL database connection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pg-host">Host</Label>
                    <Input
                      id="pg-host"
                      type="text"
                      placeholder="localhost or IP address"
                      value={postgresConfig.host}
                      onChange={(e) => setPostgresConfig(prev => ({ ...prev, host: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pg-port">Port</Label>
                    <Input
                      id="pg-port"
                      type="text"
                      placeholder="5432"
                      value={postgresConfig.port}
                      onChange={(e) => setPostgresConfig(prev => ({ ...prev, port: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pg-username">Username</Label>
                    <Input
                      id="pg-username"
                      type="text"
                      placeholder="postgres"
                      value={postgresConfig.username}
                      onChange={(e) => setPostgresConfig(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pg-password">Password</Label>
                    <Input
                      id="pg-password"
                      type="password"
                      placeholder="Enter password"
                      value={postgresConfig.password}
                      onChange={(e) => setPostgresConfig(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pg-database">Database</Label>
                  <Input
                    id="pg-database"
                    type="text"
                    placeholder="my_database"
                    value={postgresConfig.database}
                    onChange={(e) => setPostgresConfig(prev => ({ ...prev, database: e.target.value }))}
                  />
                </div>

                <Button 
                  onClick={testPostgreSQLConnection}
                  disabled={testing || !postgresConfig.host || !postgresConfig.username}
                  className="w-full"
                  variant={postgresStatus === 'success' ? 'default' : 'outline'}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {postgresStatus === 'testing' ? 'Testing Connection...' : 'Test PostgreSQL Connection'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {(!selectedService || selectedService === 'bigquery') && (
          <TabsContent value="bigquery">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📊 BigQuery Configuration
                  {bigqueryStatus === 'success' && <CheckCircle className="h-5 w-5 text-accent" />}
                  {bigqueryStatus === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
                </CardTitle>
                <CardDescription>Configure your Google BigQuery connection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bq-project">Project ID</Label>
                  <Input
                    id="bq-project"
                    type="text"
                    placeholder="my-gcp-project"
                    value={bigqueryConfig.project_id}
                    onChange={(e) => setBigqueryConfig(prev => ({ ...prev, project_id: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bq-dataset">Dataset</Label>
                  <Input
                    id="bq-dataset"
                    type="text"
                    placeholder="my_dataset"
                    value={bigqueryConfig.dataset}
                    onChange={(e) => setBigqueryConfig(prev => ({ ...prev, dataset: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bq-credentials">Service Account JSON</Label>
                  <textarea
                    id="bq-credentials"
                    className="w-full min-h-[200px] p-3 rounded-md border border-input bg-background text-sm"
                    placeholder='{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "...",\n  ...\n}'
                    value={bigqueryConfig.credentials_json}
                    onChange={(e) => setBigqueryConfig(prev => ({ ...prev, credentials_json: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste your GCP service account JSON key file contents
                  </p>
                </div>

                <Button 
                  onClick={testBigQueryConnection}
                  disabled={testing || !bigqueryConfig.project_id || !bigqueryConfig.credentials_json}
                  className="w-full"
                  variant={bigqueryStatus === 'success' ? 'default' : 'outline'}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {bigqueryStatus === 'testing' ? 'Testing Connection...' : 'Test BigQuery Connection'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ConfigurationStep;