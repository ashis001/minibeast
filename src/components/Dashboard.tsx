import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessModule } from "@/utils/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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
  ChevronDown,
  ChevronRight,
  Sparkles,
  LogOut,
} from "lucide-react";
import DeploymentWizard from "./DeploymentWizard";
import ConnectionsSettings from "./ConnectionsSettings";
import ModuleDeployment from "./ModuleDeployment";
import ValidationStep from "./ValidationStep";
import ViewValidations from "./ViewValidations";
import ActivityLog from "./ActivityLog";
import ValidationSummary from "./ValidationSummary";
import LicenseInfo from "./LicenseInfo";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState('home');
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [connectionsConfigured, setConnectionsConfigured] = useState(false);
  
  // Real-time data states
  const [deploymentStats, setDeploymentStats] = useState({
    activeDeployments: 0,
    totalValidations: 0,
    successRate: 0,
    awsRegions: 1
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [deploymentTrend, setDeploymentTrend] = useState([]);
  const [validationMetrics, setValidationMetrics] = useState([]);
  
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

  // Reload config whenever view changes to ensure latest config is loaded
  React.useEffect(() => {
    loadSnowflakeConfig();
  }, [currentView, loadSnowflakeConfig]);

  // Check if connections are configured
  React.useEffect(() => {
    const checkConnections = () => {
      // Check if AWS and Snowflake configs exist
      const awsConfig = localStorage.getItem('awsConfig');
      const snowflakeConfigStr = localStorage.getItem('snowflakeConfig');
      const hasConnections = !!(awsConfig && snowflakeConfigStr);
      setConnectionsConfigured(hasConnections);
    };
    
    checkConnections();
    // Re-check when view changes to connections
    if (currentView === 'connections') {
      checkConnections();
    }
  }, [currentView]);

  // Fetch real deployment statistics
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch deployment statistics
        const statsResponse = await fetch('/api/dashboard/stats');
        if (statsResponse.ok) {
          const data = await statsResponse.json();
          if (data.success) {
            setDeploymentStats(data.stats);
          }
        }

        // Fetch recent activity
        const activityResponse = await fetch('/api/dashboard/activity');
        if (activityResponse.ok) {
          const data = await activityResponse.json();
          if (data.success) {
            setRecentActivity(data.activity);
          }
        }

        // Fetch deployment trend data (last 7 days)
        const trendResponse = await fetch('/api/dashboard/trend');
        if (trendResponse.ok) {
          const data = await trendResponse.json();
          if (data.success) {
            setDeploymentTrend(data.trend);
          }
        }

        // Fetch validation metrics
        const metricsResponse = await fetch('/api/dashboard/metrics');
        if (metricsResponse.ok) {
          const data = await metricsResponse.json();
          if (data.success) {
            setValidationMetrics(data.metrics);
          }
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
    };

    if (currentView === 'home') {
      fetchDashboardData();
      // Refresh data every 30 seconds
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [currentView]);

  // Get user permissions
  const userPermissions = user?.permissions?.modules || [];

  // Base menu items (all possible items)
  const allMenuItems = [
    { icon: Home, label: "Home", id: "home", module: "dashboard" },
    { icon: Database, label: "Migrator", id: "migrator", module: "migrator" },
    { icon: GitBranch, label: "Reconciliator", id: "reconciliator", module: "reconciliator" },
    { 
      icon: Shield, 
      label: "Validator", 
      id: "validator",
      module: "validator",
      children: [
        { icon: Zap, label: "Add Validation", id: "add-validation" },
        { icon: Eye, label: "View Validations", id: "view-validations" },
        { icon: Activity, label: "Activity Logs", id: "activity-logs" },
        { icon: BarChart3, label: "Validation Summary", id: "validation-summary" },
      ]
    },
    { 
      icon: Settings, 
      label: "Settings", 
      id: "settings",
      module: "config",
      children: [
        { icon: Cloud, label: "Connections", id: "connections" },
        { icon: Rocket, label: "Deployment", id: "deployment", requiresConnection: true },
      ]
    },
  ];

  // Filter menu items based on user permissions
  const menuItems = React.useMemo(() => {
    return allMenuItems.filter(item => {
      // Home/Dashboard is always visible if user has dashboard permission
      if (item.id === 'home') {
        return canAccessModule(userPermissions, 'dashboard');
      }
      // Check if user has permission for this module
      return item.module ? canAccessModule(userPermissions, item.module) : true;
    });
  }, [userPermissions]);

  const handleMenuClick = (id: string, hasChildren?: boolean, requiresConnection?: boolean) => {
    if (hasChildren) {
      // Toggle expand/collapse
      setExpandedMenus(prev => 
        prev.includes(id) 
          ? prev.filter(item => item !== id)
          : [...prev, id]
      );
    } else {
      // Check if this view requires connections
      if (requiresConnection && !connectionsConfigured) {
        // Show alert that connections must be configured first
        alert('⚠️ Please configure AWS and Snowflake connections first before accessing Deployment.');
        return;
      }
      setCurrentView(id);
    }
  };

  const stats = [
    {
      title: "Active Deployments",
      value: deploymentStats.activeDeployments.toString(),
      icon: Zap,
      color: "text-blue-500",
    },
    {
      title: "Total Validations",
      value: deploymentStats.totalValidations.toString(),
      icon: Cog,
      color: "text-brand-green/100",
    },
    {
      title: "AWS Regions",
      value: deploymentStats.awsRegions.toString(),
      icon: Database,
      color: "text-orange-500",
      badge: "AWS",
    },
    {
      title: "Success Rate",
      value: `${deploymentStats.successRate}%`,
      icon: CheckCircle,
      color: "text-brand-green/100",
    },
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  const moduleDistribution = [
    { name: 'Validator', value: 45 },
    { name: 'Migrator', value: 30 },
    { name: 'Reconciliator', value: 25 },
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
    if (currentView === 'connections') {
      return <ConnectionsSettings />;
    } else if (currentView === 'deployment') {
      return <ModuleDeployment />;
    } else if (currentView === 'config') {
      return <DeploymentWizard />;
    } else if (currentView === 'home') {
      return (
        <>
          {/* License Info */}
          <div className="mb-6">
            <LicenseInfo />
          </div>

          {/* Hero Section */}
          <div className="mb-12">
            {/* Three Module Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Migration Module */}
              <Card className="bg-gradient-to-br from-blue-900/20 to-slate-900 border-blue-500/30 hover:border-blue-500/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <GitBranch className="h-6 w-6 text-blue-400" />
                    </div>
                    <Button onClick={() => {
                      if (!connectionsConfigured) {
                        setExpandedMenus(['settings']);
                        setCurrentView('connections');
                      } else {
                        setExpandedMenus(['settings']);
                        setCurrentView('deployment');
                      }
                    }} size="sm" className="bg-primary hover:bg-primary/90 text-white">
                      <Rocket className="h-3 w-3 mr-1" />
                      {connectionsConfigured ? 'Deploy' : 'Setup'}
                    </Button>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Migration</h3>
                  <p className="text-slate-400 mb-4">Seamless data transfer between systems with zero downtime</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-brand-green" />
                      <span className="text-sm text-slate-300">Schema mapping</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-brand-green" />
                      <span className="text-sm text-slate-300">Bulk data transfer</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-brand-green" />
                      <span className="text-sm text-slate-300">Progress tracking</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Validator Module */}
              <Card className="bg-gradient-to-br from-slate-900/20 to-slate-900 border-brand-green/30 hover:border-brand-green/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-brand-green/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-brand-green/20 rounded-lg flex items-center justify-center">
                      <Shield className="h-6 w-6 text-brand-green" />
                    </div>
                    <Button onClick={() => {
                      if (!connectionsConfigured) {
                        setExpandedMenus(['settings']);
                        setCurrentView('connections');
                      } else {
                        setExpandedMenus(['settings']);
                        setCurrentView('deployment');
                      }
                    }} size="sm" className="bg-primary hover:bg-primary/90 text-white">
                      <Rocket className="h-3 w-3 mr-1" />
                      {connectionsConfigured ? 'Deploy' : 'Setup'}
                    </Button>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Validator</h3>
                  <p className="text-slate-400 mb-4">Real-time data quality checks with automated alerting</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-brand-green" />
                      <span className="text-sm text-slate-300">Custom rules engine</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-brand-green" />
                      <span className="text-sm text-slate-300">Email notifications</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-brand-green" />
                      <span className="text-sm text-slate-300">Detailed reports</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Reconciliation Module */}
              <Card className="bg-gradient-to-br from-purple-900/20 to-slate-900 border-purple-500/30 hover:border-purple-500/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Activity className="h-6 w-6 text-purple-400" />
                    </div>
                    <Button onClick={() => {
                      if (!connectionsConfigured) {
                        setExpandedMenus(['settings']);
                        setCurrentView('connections');
                      } else {
                        setExpandedMenus(['settings']);
                        setCurrentView('deployment');
                      }
                    }} size="sm" className="bg-primary hover:bg-primary/90 text-white">
                      <Rocket className="h-3 w-3 mr-1" />
                      {connectionsConfigured ? 'Deploy' : 'Setup'}
                    </Button>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Reconciliation</h3>
                  <p className="text-slate-400 mb-4">Cross-system data matching and discrepancy detection</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-brand-green" />
                      <span className="text-sm text-slate-300">Multi-source compare</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-brand-green" />
                      <span className="text-sm text-slate-300">Anomaly detection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-brand-green" />
                      <span className="text-sm text-slate-300">Reconciliation reports</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Deployment Trend Chart */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Deployment Trend</CardTitle>
                <p className="text-slate-400 text-sm">Last 7 days activity</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={deploymentTrend.length > 0 ? deploymentTrend : [
                    { date: 'Mon', deployments: 4 },
                    { date: 'Tue', deployments: 7 },
                    { date: 'Wed', deployments: 5 },
                    { date: 'Thu', deployments: 9 },
                    { date: 'Fri', deployments: 6 },
                    { date: 'Sat', deployments: 8 },
                    { date: 'Sun', deployments: 10 },
                  ]}>
                    <defs>
                      <linearGradient id="colorDeployments" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                      labelStyle={{ color: '#f1f5f9' }}
                    />
                    <Area type="monotone" dataKey="deployments" stroke="#10b981" fillOpacity={1} fill="url(#colorDeployments)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Validation Metrics */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Validation Performance</CardTitle>
                <p className="text-slate-400 text-sm">Success vs Failed validations</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={validationMetrics.length > 0 ? validationMetrics : [
                    { module: 'Validator', success: 42, failed: 3 },
                    { module: 'Migrator', success: 28, failed: 2 },
                    { module: 'Reconciliator', success: 35, failed: 1 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="module" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                      labelStyle={{ color: '#f1f5f9' }}
                    />
                    <Bar dataKey="success" fill="#10b981" />
                    <Bar dataKey="failed" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Module Distribution & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Module Distribution Pie Chart */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Module Distribution</CardTitle>
                <p className="text-slate-400 text-sm">Usage by module type</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={moduleDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {moduleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                      labelStyle={{ color: '#f1f5f9' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {moduleDistribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                        <span className="text-slate-300 text-sm">{item.name}</span>
                      </div>
                      <span className="text-white font-semibold">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-slate-800 border-slate-700 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-white">Recent Activity</CardTitle>
                <p className="text-slate-400 text-sm">Latest deployments and validations</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(recentActivity.length > 0 ? recentActivity : [
                    { module: 'Validator', action: 'Deployment completed', time: '2 mins ago', status: 'success' },
                    { module: 'Migrator', action: 'Data migration started', time: '15 mins ago', status: 'running' },
                    { module: 'Reconciliator', action: 'Validation passed', time: '1 hour ago', status: 'success' },
                    { module: 'Validator', action: 'New validation added', time: '2 hours ago', status: 'info' },
                  ]).slice(0, 4).map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.status === 'success' ? 'bg-brand-green/100' :
                          activity.status === 'running' ? 'bg-blue-500 animate-pulse' :
                          activity.status === 'failed' ? 'bg-red-500' :
                          'bg-slate-500'
                        }`}></div>
                        <div>
                          <p className="text-white font-medium">{activity.module}</p>
                          <p className="text-slate-400 text-sm">{activity.action}</p>
                        </div>
                      </div>
                      <span className="text-slate-400 text-sm">{activity.time}</span>
                    </div>
                  ))}
                </div>
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
                  <div className="w-3 h-3 bg-brand-green/100 rounded-full"></div>
                  <span className="text-slate-300">AWS Services</span>
                  <Badge className="bg-brand-green/100 text-white ml-auto">Online</Badge>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-brand-green/100 rounded-full"></div>
                  <span className="text-slate-300">Snowflake Connection</span>
                  <Badge className="bg-brand-green/100 text-white ml-auto">Active</Badge>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-brand-green/100 rounded-full"></div>
                  <span className="text-slate-300">Validation Engine</span>
                  <Badge className="bg-brand-green/100 text-white ml-auto">Ready</Badge>
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
    } else if (currentView === 'validation-summary') {
      return <ValidationSummary />;
    } else if (currentView === 'config') {
      return <DeploymentWizard />;
    } else {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
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
              className="bg-brand-green hover:bg-brand-green text-white px-6 py-3 rounded-lg font-medium transition-colors"
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
                <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center">
                  <Database className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-white font-semibold">MINIBEAST 2.0</h1>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Sparkles className="h-2.5 w-2.5 text-brand-green" />
                    <p className="text-[10px] font-medium text-slate-500 tracking-wider">POWERED BY DATACTION</p>
                  </div>
                </div>
              </div>
            </div>
            
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item, index) => (
                    <React.Fragment key={index}>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleMenuClick(item.id, !!item.children)}
                          className={`w-full justify-start cursor-pointer ${
                            currentView === item.id
                              ? "bg-brand-green text-white hover:bg-brand-green"
                              : "text-slate-300 hover:text-white hover:bg-slate-800"
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                          {item.children && (
                            <span className="ml-auto transition-transform duration-300">
                              <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${
                                expandedMenus.includes(item.id) ? 'rotate-90' : 'rotate-0'
                              }`} />
                            </span>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      
                      {/* Child menu items with smooth animation */}
                      {item.children && (
                        <div 
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            expandedMenus.includes(item.id) 
                              ? 'max-h-96 opacity-100' 
                              : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="ml-6 mt-1 space-y-1">
                            {item.children.map((child: any, childIndex) => {
                              const isDisabled = child.requiresConnection && !connectionsConfigured;
                              return (
                                <SidebarMenuItem key={childIndex}>
                                  <SidebarMenuButton
                                    onClick={() => !isDisabled && handleMenuClick(child.id, false, child.requiresConnection)}
                                    disabled={isDisabled}
                                    className={`w-full justify-start transition-all duration-200 ${
                                      isDisabled
                                        ? "cursor-not-allowed opacity-50 text-slate-500 hover:bg-slate-800/50"
                                        : currentView === child.id
                                        ? "cursor-pointer bg-brand-green text-white hover:bg-brand-green"
                                        : "cursor-pointer text-slate-300 hover:text-white hover:bg-slate-800"
                                    }`}
                                  >
                                    <child.icon className="h-4 w-4" />
                                    <span>{child.label}</span>
                                    {isDisabled && (
                                      <Lock className="h-3 w-3 ml-auto text-orange-400" />
                                    )}
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className="mt-auto p-4 space-y-3 border-t border-slate-800">
              {/* User info */}
              <div className="px-2 py-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                </div>
                {user?.role && (
                  <div className="mt-2">
                    <Badge className={`text-xs ${
                      user.role === 'developer' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                      user.role === 'tester' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                      user.role === 'ops' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                      'bg-slate-500/20 text-slate-400 border-slate-500/30'
                    }`}>
                      {user.role.toUpperCase()}
                    </Badge>
                  </div>
                )}
              </div>
              
              {/* Logout button */}
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
              
              <p className="text-slate-500 text-xs text-center">© 2025 Mini Beast</p>
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
