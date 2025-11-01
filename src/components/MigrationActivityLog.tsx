import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Terminal,
  Activity,
  Download,
  Clock
} from 'lucide-react';
import { useToast } from './ui/use-toast';

interface LogEntry {
  timestamp: string;
  message: string;
  level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG';
  source: string;
}

interface MigrationExecution {
  jobId: string;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT';
  startTime: string;
  endTime?: string;
  logs: LogEntry[];
  source?: { name: string; type: string };
  destination?: { name: string; type: string };
  tables?: string[];
}

const MigrationActivityLog = () => {
  const { toast } = useToast();
  const [executions, setExecutions] = useState<MigrationExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [lastLogTimestamp, setLastLogTimestamp] = useState<string | null>(null);
  const [autoRefreshStartTime, setAutoRefreshStartTime] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(60);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const logsEndRef = useRef<HTMLDivElement>(null);
  const previousLogCountRef = useRef<number>(0);

  // Auto-scroll to bottom when new logs arrive
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Only scroll when NEW logs are added, not on every refresh
    const selectedExec = executions.find(exec => exec.jobId === selectedExecution);
    const currentLogCount = selectedExec?.logs?.length || 0;
    
    if (currentLogCount > previousLogCountRef.current && currentLogCount > 0) {
      scrollToBottom();
    }
    
    previousLogCountRef.current = currentLogCount;
  }, [executions, selectedExecution]);

  // Countdown timer effect
  useEffect(() => {
    if (!autoRefresh || !autoRefreshStartTime || isPaused) return;

    const timer = setInterval(() => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - autoRefreshStartTime;
      const remaining = Math.max(0, Math.ceil((60000 - elapsedTime) / 1000));
      setRemainingTime(remaining);
      
      if (remaining === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, autoRefreshStartTime, isPaused]);

  // Fetch executions from localStorage and verify status from backend
  const fetchExecutions = async () => {
    try {
      // Get migration history from localStorage
      const historyJson = localStorage.getItem('migrationHistory');
      const history = historyJson ? JSON.parse(historyJson) : [];
      
      if (history.length === 0) {
        setExecutions([]);
        return;
      }
      
      // Verify status for each migration from backend
      const executionsData = await Promise.all(
        history.map(async (job: any) => {
          try {
            // Fetch actual status from backend
            const statusResponse = await fetch(`/api/migrate/status/${job.jobId}`);
            const statusData = await statusResponse.json();
            
            if (statusData.success) {
              // Don't load logs from localStorage - they will be fetched fresh from CloudWatch
              return {
                jobId: job.jobId,
                status: statusData.status || job.status || 'SUCCEEDED',
                startTime: job.startTime || new Date().toISOString(),
                endTime: statusData.endTime || job.endTime,
                logs: [], // Start with empty logs, will be fetched from backend
                source: job.source,
                destination: job.destination,
                tables: job.tables
              };
            }
          } catch (err) {
            console.error(`Failed to fetch status for ${job.jobId}:`, err);
          }
          
          // Fallback: if backend call fails, assume old migrations are completed
          return {
            jobId: job.jobId,
            status: job.status === 'RUNNING' ? 'SUCCEEDED' : job.status,
            startTime: job.startTime || new Date().toISOString(),
            endTime: job.endTime,
            logs: [], // Start with empty logs, will be fetched from backend
            source: job.source,
            destination: job.destination,
            tables: job.tables
          };
        })
      );
      
      setExecutions(executionsData);
      
      // Auto-select the first migration (most recent) by default
      if (!selectedExecution && executionsData.length > 0) {
        setSelectedExecution(executionsData[0].jobId);
      }
    } catch (error) {
      console.error('Failed to fetch executions:', error);
    }
  };

  // Fetch logs for specific execution
  const fetchLogs = async (jobId: string, isInitialLoad = false) => {
    try {
      let url = `/api/migrate/logs/${encodeURIComponent(jobId)}`;
      
      if (!isInitialLoad && lastLogTimestamp) {
        const timestamp = new Date(lastLogTimestamp).getTime();
        url += `?incremental=true&startTime=${timestamp}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setExecutions(prev => prev.map(exec => {
          if (exec.jobId === jobId) {
            const newLogs = data.logs || [];
            
            if (isInitialLoad) {
              if (newLogs.length > 0) {
                setLastLogTimestamp(newLogs[newLogs.length - 1].timestamp);
              }
              console.log(`📥 Initial load: ${newLogs.length} logs`);
              
              // Parse logs as LogEntry format
              const formattedLogs = newLogs.map((log: any) => ({
                timestamp: new Date(log.timestamp).toISOString(),
                message: log.message,
                level: log.message.includes('ERROR') ? 'ERROR' as const :
                       log.message.includes('WARN') ? 'WARN' as const :
                       log.message.includes('INFO') ? 'INFO' as const : 'DEBUG' as const,
                source: 'ECS'
              }));
              
              return { ...exec, logs: formattedLogs };
            } else {
              if (newLogs.length > 0) {
                const existingLogs = exec.logs || [];
                const existingTimestamps = new Set(existingLogs.map(log => log.timestamp));
                const uniqueNewLogs = newLogs.filter((log: any) => 
                  !existingTimestamps.has(new Date(log.timestamp).toISOString())
                );
                
                if (uniqueNewLogs.length > 0) {
                  const formattedNewLogs = uniqueNewLogs.map((log: any) => ({
                    timestamp: new Date(log.timestamp).toISOString(),
                    message: log.message,
                    level: log.message.includes('ERROR') ? 'ERROR' as const :
                           log.message.includes('WARN') ? 'WARN' as const :
                           log.message.includes('INFO') ? 'INFO' as const : 'DEBUG' as const,
                    source: 'ECS'
                  }));
                  
                  const combinedLogs = [...existingLogs, ...formattedNewLogs];
                  setLastLogTimestamp(uniqueNewLogs[uniqueNewLogs.length - 1].timestamp);
                  console.log(`📝 Appended ${uniqueNewLogs.length} new unique logs`);
                  return { ...exec, logs: combinedLogs };
                }
              }
              return exec;
            }
          }
          return exec;
        }));
        
        // Update localStorage with logs
        const historyJson = localStorage.getItem('migrationHistory');
        const history = historyJson ? JSON.parse(historyJson) : [];
        const updatedHistory = history.map((job: any) => {
          if (job.jobId === jobId) {
            return { ...job, logs: data.logs };
          }
          return job;
        });
        localStorage.setItem('migrationHistory', JSON.stringify(updatedHistory));
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchExecutions();
  }, []);

  // Load logs when execution changes
  useEffect(() => {
    if (selectedExecution) {
      fetchLogs(selectedExecution, true);
      setLastLogTimestamp(null);
      previousLogCountRef.current = 0;
    }
  }, [selectedExecution]);

  // Watch for execution status changes and stop auto-refresh when complete
  useEffect(() => {
    const selectedData = executions.find(exec => exec.jobId === selectedExecution);
    
    // Stop auto-refresh immediately if status is not RUNNING
    if (selectedData && selectedData.status !== 'RUNNING') {
      if (autoRefresh) {
        console.log(`🛑 Auto-refresh stopped - execution ${selectedData.status}`);
        setAutoRefresh(false);
        setIsPaused(true);
        setAutoRefreshStartTime(null);
      }
    }
  }, [executions, selectedExecution, autoRefresh]);

  // Smart auto-refresh - only for the latest execution with 60-second timeout
  useEffect(() => {
    if (!autoRefresh || !selectedExecution || executions.length === 0) return;

    if (!autoRefreshStartTime) {
      setAutoRefreshStartTime(Date.now());
    }

    const sortedExecutions = [...executions].sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    const latestExecution = sortedExecutions[0];
    const isLatestExecution = selectedExecution === latestExecution?.jobId;
    
    if (!isLatestExecution) {
      console.log('🚫 Not auto-refreshing - this is not the latest execution');
      return;
    }

    console.log('✅ Starting auto-refresh interval for:', selectedExecution);

    const interval = setInterval(() => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - (autoRefreshStartTime || currentTime);
      
      if (elapsedTime >= 60000) {
        console.log('⏰ Auto-refresh stopped - 60 second timeout reached');
        setAutoRefresh(false);
        setIsPaused(true);
        setAutoRefreshStartTime(null);
        
        toast({
          title: "Auto-refresh stopped",
          description: "Auto-refresh automatically stopped after 60 seconds. Click Resume to restart.",
          duration: 4000,
        });
        return;
      }

      console.log('🔄 Auto-refreshing migration:', selectedExecution);
      fetchExecutions();
      fetchLogs(selectedExecution, false);
    }, 5000);

    return () => {
      console.log('🛑 Clearing auto-refresh interval');
      clearInterval(interval);
    };
  }, [autoRefresh, selectedExecution]);

  const handleResume = () => {
    const selectedData = executions.find(exec => exec.jobId === selectedExecution);
    
    if (selectedData && selectedData.status !== 'RUNNING') {
      toast({
        title: "Cannot resume auto-refresh",
        description: `Migration is ${selectedData.status.toLowerCase()}. Auto-refresh only works for running migrations.`,
        variant: "destructive",
        duration: 4000,
      });
      console.log(`🚫 Cannot resume - execution is ${selectedData.status}`);
      return;
    }
    
    setIsPaused(false);
    setAutoRefresh(true);
    setAutoRefreshStartTime(Date.now());
    setRemainingTime(60);
    if (selectedExecution) {
      fetchExecutions();
      fetchLogs(selectedExecution, false);
    }
    console.log('▶️ Auto-refresh resumed - new 60 second timer started');
  };

  const selectedExecutionData = executions.find(exec => exec.jobId === selectedExecution);
  
  const sortedExecutions = [...executions].sort((a, b) => 
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
  const latestExecutionId = sortedExecutions[0]?.jobId;
  const isLatestExecution = selectedExecution === latestExecutionId;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'bg-blue-500';
      case 'SUCCEEDED': return 'bg-brand-green/100';
      case 'FAILED': return 'bg-red-500';
      case 'TIMED_OUT': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'SUCCEEDED': return <CheckCircle className="h-4 w-4" />;
      case 'FAILED': return <AlertCircle className="h-4 w-4" />;
      case 'TIMED_OUT': return <Clock className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-400';
      case 'WARN': return 'text-yellow-400';
      case 'INFO': return 'text-blue-400';
      case 'DEBUG': return 'text-gray-400';
      default: return 'text-white';
    }
  };

  const downloadLogs = () => {
    if (!selectedExecutionData) return;
    
    const logsText = selectedExecutionData.logs
      .map(log => `[${log.timestamp}] ${log.level} - ${log.message}`)
      .join('\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration-logs-${selectedExecutionData.jobId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Migration Activity Log</h1>
            <p className="text-muted-foreground">Monitor live migration logs and task status</p>
          </div>
          
          <div className="flex items-center gap-4">
            {selectedExecutionData && (
              <Button
                variant="outline"
                onClick={downloadLogs}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Logs
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Executions List */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Migrations
                  </div>
                  {executions.length > 0 && (
                    <span className="text-xs text-slate-400">
                      {executions.length} total
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-[520px]">
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {executions.length === 0 ? (
                  <div className="text-center py-8">
                    <Terminal className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400">No migrations found</p>
                    <p className="text-sm text-slate-500 mt-2">
                      Start a migration to see activity logs
                    </p>
                  </div>
                ) : (
                  executions
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((execution, index) => {
                    const globalIndex = (currentPage - 1) * itemsPerPage + index;
                    const isLatest = globalIndex === 0;
                    return (
                      <div
                        key={execution.jobId}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedExecution === execution.jobId
                            ? 'bg-slate-700 border-blue-500'
                            : 'bg-slate-900 border-slate-600 hover:bg-slate-700'
                        }`}
                        onClick={() => setSelectedExecution(execution.jobId)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={`${getStatusColor(execution.status)} text-white`}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(execution.status)}
                                {execution.status}
                              </div>
                            </Badge>
                            {isLatest && (
                              <Badge className="bg-orange-500 text-white text-xs">
                                LATEST
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">
                            {new Date(execution.startTime).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        <p className="text-sm text-slate-300 truncate">
                          {execution.jobId}
                        </p>
                      </div>
                    );
                  })
                )}
                </div>
                
                {/* Pagination Controls */}
                {executions.length > itemsPerPage && (
                  <div className="flex items-center justify-between border-t border-slate-700 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="text-white"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-slate-400">
                      Page {currentPage} of {Math.ceil(executions.length / itemsPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(executions.length / itemsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(executions.length / itemsPerPage)}
                      className="text-white"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Live Logs */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Migration Logs
                  {selectedExecutionData && (
                    <Badge className={`ml-2 ${getStatusColor(selectedExecutionData.status)} text-white`}>
                      {selectedExecutionData.status}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedExecutionData ? (
                  <div className="text-center py-12">
                    <Terminal className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg">Select a migration to view logs</p>
                  </div>
                ) : (
                  <div className="bg-black rounded-lg p-4 h-[456px] overflow-y-auto font-mono text-sm relative">
                    {selectedExecutionData.logs.length === 0 ? (
                      <div className="text-slate-500 text-xs">
                        <span className="text-slate-400">[{new Date().toLocaleTimeString()}]</span> INFO - Connecting to log stream...
                      </div>
                    ) : (
                      selectedExecutionData.logs.map((log, index) => (
                        <div key={index} className="mb-1 flex hover:bg-slate-900 px-1 -mx-1 rounded">
                          <span className="text-slate-500 mr-3 flex-shrink-0 select-none">
                            [{new Date(log.timestamp).toLocaleTimeString()}]
                          </span>
                          <span className={`mr-2 flex-shrink-0 font-semibold select-none ${getLevelColor(log.level)}`}>
                            {log.level}
                          </span>
                          <span className="text-slate-200 break-all leading-relaxed">
                            {log.message}
                          </span>
                        </div>
                      ))
                    )}
                    <div ref={logsEndRef} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationActivityLog;
