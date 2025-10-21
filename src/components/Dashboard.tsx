import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";
import {
  Database,
  GitBranch,
  Shield,
  Zap,
  Eye,
  Activity,
  BarChart3,
  Settings,
  CheckCircle,
  Rocket,
  Upload,
  TrendingUp,
  Users,
  Clock,
  AlertTriangle,
  Home,
  Server,
  Lock,
  Cloud,
  Gauge,
  Globe,
  Cog,
} from "lucide-react";
import DeploymentWizard from "./DeploymentWizard";
import ValidationStep from "./ValidationStep";
import ViewValidations from "./ViewValidations";
import ActivityLog from "./ActivityLog";

const Dashboard = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('home');
  
  // Snowflake config state - will be populated from configuration
  const [snowflakeConfig, setSnowflakeConfig] = useState(null);
  
  // Function to load Snowflake config
  const loadSnowflakeConfig = React.useCallback(async () => {
    // First try localStorage
    const savedConfig = localStorage.getItem('snowflakeConfig');
    if (savedConfig) {
      try {
        setSnowflakeConfig(JSON.parse(savedConfig));
        return;
      } catch (error) {
        console.error('Failed to parse saved Snowflake config:', error);
      }
    }
    
    // Fallback: try to load from backend if localStorage is empty
    try {
      const response = await fetch('/api/config/snowflake');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setSnowflakeConfig(data.config);
          // Save to localStorage for future use
          localStorage.setItem('snowflakeConfig', JSON.stringify(data.config));
        }
      }
    } catch (error) {
      console.error('Failed to load Snowflake config from backend:', error);
    }
  }, []);

  // Load Snowflake config on mount and when view changes to validation pages
  React.useEffect(() => {
    loadSnowflakeConfig();
  }, [loadSnowflakeConfig]);

  // Reload config when switching to validation views
  React.useEffect(() => {
    if (currentView === 'add-validation' || currentView === 'view-validations') {
      loadSnowflakeConfig();
    }
  }, [currentView, loadSnowflakeConfig]);
  const menuItems = [
    { icon: Home, label: "Home", id: "home" },
    { icon: Database, label: "Migrator", id: "migrator" },
    { icon: GitBranch, label: "Reconciliator", id: "reconciliator" },
    { icon: Shield, label: "Validator", id: "validator" },
    { icon: Zap, label: "Add Validation", id: "add-validation" },
    { icon: Eye, label: "View Validations", id: "view-validations" },
    { icon: Activity, label: "Activity Logs", id: "activity-logs" },
    { icon: BarChart3, label: "Validation Summary", id: "validation-summary" },
    { icon: Settings, label: "Config", id: "config" },
  ];

  const handleMenuClick = (id: string) => {
    setCurrentView(id);
  };

  const stats = [
    {
      title: "Active Deployments",
      value: "0",
      icon: Zap,
      color: "text-blue-500",
    },
    {
      title: "Modules Available",
      value: "3",
      icon: Cog,
      color: "text-green-500",
    },
    {
      title: "AWS Regions",
      value: "1",
      icon: Database,
      color: "text-orange-500",
      badge: "AWS",
    },
    {
      title: "Success",
      value: "100%",
      icon: CheckCircle,
      color: "text-green-500",
    },
  ];

  const deploymentSteps = [
    {
      title: "Configuration",
      subtitle: "AWS & Snowflake setup",
      status: "completed",
      icon: Settings,
    },
    {
      title: "Package Upload",
      subtitle: "Upload your Python files",
      status: "completed",
      icon: Upload,
    },
    {
      title: "Deployment",
      subtitle: "Deploy to AWS ECS",
      status: "current",
      icon: Rocket,
    },
    {
      title: "Complete",
      subtitle: "Deployment successful",
      status: "pending",
      icon: CheckCircle,
    },
  ];

  const renderContent = () => {
    if (currentView === 'config') {
    return <DeploymentWizard />;
  } else if (currentView === 'home') {
      return (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <SidebarTrigger className="text-white" />
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <Database className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Mini Beast Data Deployer
                  </h1>
                  <p className="text-slate-400">
                    Industrial-grade data validation and deployment platform
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Section */}
          <div className="mb-12">
            <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div>
                    <h2 className="text-4xl font-bold text-white mb-4">
                      Enterprise Data Validation
                    </h2>
                    <p className="text-slate-300 text-lg mb-6">
                      Deploy robust data validation pipelines with military-grade security, 
                      real-time monitoring, and seamless AWS integration. Built for scale, 
                      designed for reliability.
                    </p>
                    <div className="flex space-x-4">
                      <button 
                        onClick={() => handleMenuClick('config')}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                      >
                        Start Deployment
                      </button>
                      <button className="border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 px-6 py-3 rounded-lg font-medium transition-colors">
                        View Documentation
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                      <Server className="h-8 w-8 text-emerald-400 mb-2" />
                      <h3 className="text-white font-semibold mb-1">High Performance</h3>
                      <p className="text-slate-400 text-sm">99.9% uptime guaranteed</p>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                      <Lock className="h-8 w-8 text-emerald-400 mb-2" />
                      <h3 className="text-white font-semibold mb-1">Enterprise Security</h3>
                      <p className="text-slate-400 text-sm">SOC2 Type II compliant</p>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                      <Cloud className="h-8 w-8 text-emerald-400 mb-2" />
                      <h3 className="text-white font-semibold mb-1">Cloud Native</h3>
                      <p className="text-slate-400 text-sm">AWS ECS deployment</p>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                      <Gauge className="h-8 w-8 text-emerald-400 mb-2" />
                      <h3 className="text-white font-semibold mb-1">Real-time Monitoring</h3>
                      <p className="text-slate-400 text-sm">Live performance metrics</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <Card key={index} className="bg-slate-800 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm font-medium">
                        {stat.title}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <p className="text-3xl font-bold text-white">
                          {stat.value}
                        </p>
                        {stat.badge && (
                          <Badge className="bg-orange-500 text-white">
                            {stat.badge}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Database className="h-5 w-5 text-emerald-400" />
                  <span>Data Migration</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Seamlessly migrate data between systems with zero downtime and full integrity validation.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-emerald-400" />
                  <span>Data Validation</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Advanced validation rules with custom business logic and real-time error detection.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-emerald-400" />
                  <span>Global Scale</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Deploy across multiple AWS regions with automatic failover and load balancing.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* System Status */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">System Status</CardTitle>
              <p className="text-slate-400">
                All systems operational - Ready for deployment
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-slate-300">AWS Services</span>
                  <Badge className="bg-green-500 text-white ml-auto">Online</Badge>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-slate-300">Snowflake Connection</span>
                  <Badge className="bg-green-500 text-white ml-auto">Active</Badge>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-slate-300">Validation Engine</span>
                  <Badge className="bg-green-500 text-white ml-auto">Ready</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      );
    } else if (currentView === 'add-validation') {
      return <ValidationStep onNext={() => setCurrentView('home')} snowflakeConfig={snowflakeConfig} />;
    } else if (currentView === 'view-validations') {
      return <ViewValidations 
        snowflakeConfig={snowflakeConfig} 
        onNavigate={() => setCurrentView('activity-logs')} 
      />;
    } else if (currentView === 'activity-logs') {
      return <ActivityLog />;
    } else if (currentView === 'config') {
      return <DeploymentWizard />;
    } else {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <SidebarTrigger className="text-white mb-8" />
            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Cog className="h-12 w-12 text-slate-400 animate-spin" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Coming Soon</h2>
            <p className="text-slate-400 text-lg mb-8 max-w-md">
              The {menuItems.find(item => item.id === currentView)?.label} module is currently under development. 
              Stay tuned for updates!
            </p>
            <button 
              onClick={() => setCurrentView('home')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-950">
        <Sidebar className="border-r border-slate-800">
          <SidebarContent className="bg-slate-900">
            <div className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <Database className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-white font-semibold">Mini Beast</h1>
                  <p className="text-slate-400 text-sm">Data Deployer</p>
                </div>
              </div>
            </div>
            
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item, index) => (
                    <SidebarMenuItem key={index}>
                      <SidebarMenuButton
                        onClick={() => handleMenuClick(item.id)}
                        className={`w-full justify-start cursor-pointer ${
                          currentView === item.id
                            ? "bg-emerald-500 text-white hover:bg-emerald-600"
                            : "text-slate-300 hover:text-white hover:bg-slate-800"
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className="mt-auto p-4">
              <p className="text-slate-400 text-sm">© 2024 Mini Beast</p>
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {renderContent()}

          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
