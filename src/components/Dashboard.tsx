import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import DeploymentWizard from "./DeploymentWizard";
import ValidationStep from "./ValidationStep";
import ViewValidations from "./ViewValidations";
import ActivityLog from "./ActivityLog";
import ValidationSummary from "./ValidationSummary";

const Dashboard = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('home');
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  
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

  // Reload config when switching to validation views
  React.useEffect(() => {
    if (currentView === 'add-validation' || currentView === 'view-validations') {
      loadSnowflakeConfig();
    }
  }, [currentView, loadSnowflakeConfig]);

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
  const menuItems = [
    { icon: Home, label: "Home", id: "home" },
    { icon: Database, label: "Migrator", id: "migrator" },
    { icon: GitBranch, label: "Reconciliator", id: "reconciliator" },
    { 
      icon: Shield, 
      label: "Validator", 
      id: "validator",
      children: [
        { icon: Zap, label: "Add Validation", id: "add-validation" },
        { icon: Eye, label: "View Validations", id: "view-validations" },
        { icon: Activity, label: "Activity Logs", id: "activity-logs" },
        { icon: BarChart3, label: "Validation Summary", id: "validation-summary" },
      ]
    },
    { icon: Settings, label: "Config", id: "config" },
  ];

  const handleMenuClick = (id: string, hasChildren?: boolean) => {
    if (hasChildren) {
      // Toggle expand/collapse
      setExpandedMenus(prev => 
        prev.includes(id) 
          ? prev.filter(item => item !== id)
          : [...prev, id]
      );
    } else {
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
      color: "text-green-500",
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
      color: "text-green-500",
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
    if (currentView === 'config') {
    return <DeploymentWizard />;
  } else if (currentView === 'home') {
      return (
        <>
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
                          activity.status === 'success' ? 'bg-green-500' :
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
                  <h1 className="text-white font-semibold">MINIBEAST 2.0</h1>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Sparkles className="h-2.5 w-2.5 text-emerald-400" />
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
                              ? "bg-emerald-500 text-white hover:bg-emerald-600"
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
                            {item.children.map((child, childIndex) => (
                              <SidebarMenuItem key={childIndex}>
                                <SidebarMenuButton
                                  onClick={() => handleMenuClick(child.id)}
                                  className={`w-full justify-start cursor-pointer transition-all duration-200 ${
                                    currentView === child.id
                                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                                  }`}
                                >
                                  <child.icon className="h-4 w-4" />
                                  <span>{child.label}</span>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            ))}
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className="mt-auto p-4">
              <p className="text-slate-400 text-sm">© 2025 Mini Beast</p>
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
