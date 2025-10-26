import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Activity,
  Calendar,
  Download,
  Filter,
  Search,
} from 'lucide-react';
import { useToast } from './ui/use-toast';

interface ValidationResult {
  [key: string]: any;
}

const ValidationSummary = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<ValidationResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    passed: 0,
    failed: 0,
    successRate: 0
  });

  const fetchValidationResults = async () => {
    setLoading(true);
    try {
      // Get Snowflake config from localStorage
      const snowflakeConfigStr = localStorage.getItem('snowflakeConfig');
      if (!snowflakeConfigStr) {
        throw new Error('Snowflake configuration not found. Please configure Snowflake connection first.');
      }
      
      const snowflakeConfig = JSON.parse(snowflakeConfigStr);
      
      const response = await fetch('/api/validation-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(snowflakeConfig),
      });
      const data = await response.json();

      if (data.success) {
        setResults(data.data);
        setFilteredResults(data.data);
        calculateStats(data.data);
        
        toast({
          title: "Data Loaded",
          description: `${data.count} validation results loaded successfully`,
          duration: 3000,
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: "Error Loading Data",
        description: error.message || "Failed to fetch validation results",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: ValidationResult[]) => {
    const total = data.length;
    const passed = data.filter(r => {
      const status = (r.STATUS || r.status || r.Status)?.toString().toUpperCase();
      return status === 'PASSED' || status === 'PASS' || status === 'SUCCESS';
    }).length;
    const failed = total - passed;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    setStats({ total, passed, failed, successRate });
  };

  useEffect(() => {
    fetchValidationResults();
  }, []);

  useEffect(() => {
    let filtered = results;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(result =>
        Object.values(result).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => {
        const status = (r.STATUS || r.status || r.Status)?.toString().toUpperCase();
        return status === statusFilter.toUpperCase() || 
               (statusFilter === 'PASSED' && (status === 'PASS' || status === 'SUCCESS'));
      });
    }

    setFilteredResults(filtered);
    calculateStats(filtered);
  }, [searchTerm, statusFilter, results]);

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status?.toString().toUpperCase();
    if (normalizedStatus === 'PASSED' || normalizedStatus === 'PASS' || normalizedStatus === 'SUCCESS') {
      return <Badge className="bg-green-500 text-white"><CheckCircle className="h-3 w-3 mr-1" />Passed</Badge>;
    } else if (normalizedStatus === 'FAILED' || normalizedStatus === 'FAIL' || normalizedStatus === 'ERROR') {
      return <Badge className="bg-red-500 text-white"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    } else {
      return <Badge className="bg-yellow-500 text-white"><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
    }
  };

  const downloadCSV = () => {
    if (filteredResults.length === 0) return;

    const headers = Object.keys(filteredResults[0]).join(',');
    const rows = filteredResults.map(row => 
      Object.values(row).map(val => `"${val}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation-results-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `${filteredResults.length} records exported to CSV`,
      duration: 3000,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          {/* Animated Loading Spinner */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin"></div>
            <div className="absolute inset-4 border-4 border-transparent border-t-blue-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <BarChart3 className="h-12 w-12 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 animate-pulse">Loading Validation Results</h2>
          <p className="text-slate-400">Fetching data from Snowflake...</p>
          <div className="flex justify-center space-x-1 mt-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Animation */}
        <div className="mb-8 animate-fadeIn">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-xl flex items-center justify-center animate-pulse">
                  <BarChart3 className="h-7 w-7 text-white" />
                </div>
                <span>Validation Summary</span>
              </h1>
              <p className="text-slate-400 text-lg">Real-time validation results and analytics</p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={fetchValidationResults}
                className="bg-emerald-500 hover:bg-emerald-600 text-white transition-all duration-200 hover:scale-105"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={downloadCSV}
                disabled={filteredResults.length === 0}
                className="bg-primary hover:bg-primary/90 text-white transition-all duration-200 hover:scale-105"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Stats Cards with Stagger Animation */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Validations', value: stats.total, icon: Activity, color: 'from-blue-500 to-blue-600', delay: 0 },
              { label: 'Passed', value: stats.passed, icon: CheckCircle, color: 'from-green-500 to-green-600', delay: 100 },
              { label: 'Failed', value: stats.failed, icon: XCircle, color: 'from-red-500 to-red-600', delay: 200 },
              { label: 'Success Rate', value: `${stats.successRate}%`, icon: TrendingUp, color: 'from-emerald-500 to-emerald-600', delay: 300 },
            ].map((stat, index) => (
              <Card 
                key={index} 
                className="bg-slate-800 border-slate-700 overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/20 animate-slideInUp"
                style={{ animationDelay: `${stat.delay}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm font-medium mb-2">{stat.label}</p>
                      <p className="text-4xl font-bold text-white">{stat.value}</p>
                    </div>
                    <div className={`w-16 h-16 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center transform transition-transform duration-300 hover:rotate-12`}>
                      <stat.icon className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div className="mt-4 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${stat.color} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: index === 3 ? `${stats.successRate}%` : '100%' }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>


        {/* Results Table */}
        <Card className="bg-slate-800 border-slate-700 animate-fadeIn" style={{ animationDelay: '500ms' }}>
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Activity className="h-5 w-5 text-emerald-400" />
              <span>Validation Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredResults.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">No validation results found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-700">
                      {Object.keys(filteredResults[0]).map((key) => (
                        <th key={key} className="px-4 py-3 text-slate-300 font-semibold text-sm uppercase tracking-wider">
                          {key.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((result, index) => (
                      <tr 
                        key={index} 
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-all duration-200 animate-fadeIn"
                        style={{ animationDelay: `${600 + index * 50}ms` }}
                      >
                        {Object.entries(result).map(([key, value], cellIndex) => (
                          <td key={cellIndex} className="px-4 py-4 text-slate-300">
                            {key.toUpperCase().includes('STATUS') ? (
                              getStatusBadge(String(value))
                            ) : key.toUpperCase().includes('DATE') || key.toUpperCase().includes('TIME') ? (
                              <span className="text-blue-400">{String(value)}</span>
                            ) : (
                              <span>{String(value)}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
          opacity: 0;
        }
        
        .animate-slideInUp {
          animation: slideInUp 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default ValidationSummary;
