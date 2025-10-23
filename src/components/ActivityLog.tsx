import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Play, 
  Square, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Terminal,
  Activity,
  Download
} from 'lucide-react';
import { useToast } from './ui/use-toast';

interface LogEntry {
  timestamp: string;
  message: string;
  level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG';
  source: string;
}

interface TaskExecution {
  executionArn: string;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT';
  startTime: string;
  endTime?: string;
  taskArn?: string;
  logs: LogEntry[];
}

const ActivityLog = () => {
  const { toast } = useToast();
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [lastLogCount, setLastLogCount] = useState(0);
  const [noNewLogsCount, setNoNewLogsCount] = useState(0);
  const [lastLogTimestamp, setLastLogTimestamp] = useState<string | null>(null);
  const [autoRefreshStartTime, setAutoRefreshStartTime] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(60);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Only scroll when logs change for the selected execution
    const selectedExec = executions.find(exec => exec.executionArn === selectedExecution);
    if (selectedExec?.logs && selectedExec.logs.length > 0) {
      scrollToBottom();
    }
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
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, [autoRefresh, autoRefreshStartTime, isPaused]);

  // Fetch executions and logs
  const fetchExecutions = async () => {
    try {
      const response = await fetch('/api/activity/executions');
      const data = await response.json();
      
      if (data.success) {
        // Preserve existing logs when updating executions to prevent flickering
        setExecutions(prev => {
          return data.executions.map((newExec: TaskExecution) => {
            const existingExec = prev.find(e => e.executionArn === newExec.executionArn);
            // Keep existing logs if they exist, otherwise use new logs
            return {
              ...newExec,
              logs: existingExec?.logs || newExec.logs || []
            };
          });
        });
        
        // Auto-select the most recent execution if none selected
        if (!selectedExecution && data.executions.length > 0) {
          setSelectedExecution(data.executions[0].executionArn);
        }
      }
    } catch (error) {
      console.error('Failed to fetch executions:', error);
    }
  };

  // Fetch logs for specific execution
  const fetchLogs = async (executionArn: string, isInitialLoad = false) => {
    try {
      let url = `/api/activity/logs/${encodeURIComponent(executionArn)}`;
      
      if (!isInitialLoad && lastLogTimestamp) {
        // For incremental load, send the last timestamp
        const timestamp = new Date(lastLogTimestamp).getTime();
        url += `?incremental=true&startTime=${timestamp}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setExecutions(prev => prev.map(exec => {
          if (exec.executionArn === executionArn) {
            const newLogs = data.logs || [];
            
            if (isInitialLoad) {
              // Initial load - replace all logs
              if (newLogs.length > 0) {
                setLastLogTimestamp(newLogs[newLogs.length - 1].timestamp);
              }
              return { ...exec, logs: newLogs, taskArn: data.taskArn };
            } else {
              // Incremental load - append new logs (server already filtered them)
              if (newLogs.length > 0) {
                const existingLogs = exec.logs || [];
                const combinedLogs = [...existingLogs, ...newLogs];
                setLastLogTimestamp(newLogs[newLogs.length - 1].timestamp);
                console.log(`📝 Appended ${newLogs.length} new logs`);
                return { ...exec, logs: combinedLogs, taskArn: data.taskArn };
              }
              
              // No new logs, return existing
              return exec;
            }
          }
          return exec;
        }));
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
      fetchLogs(selectedExecution, true); // Initial load
      setLastLogCount(0);
      setNoNewLogsCount(0);
      setIsPaused(false);
      setLastLogTimestamp(null);
    }
  }, [selectedExecution]);

  // Watch for execution status changes and stop auto-refresh when complete
  useEffect(() => {
    if (!autoRefresh || !selectedExecution) return;
    
    const selectedData = executions.find(exec => exec.executionArn === selectedExecution);
    
    // Stop auto-refresh immediately if execution is FAILED or SUCCEEDED
    if (selectedData && (selectedData.status === 'FAILED' || selectedData.status === 'SUCCEEDED')) {
      console.log(`🛑 Auto-refresh stopped - execution ${selectedData.status}`);
      setAutoRefresh(false);
      setIsPaused(true);
      setAutoRefreshStartTime(null);
      
      toast({
        title: "Auto-refresh stopped",
        description: `Execution ${selectedData.status.toLowerCase()}. Auto-refresh stopped automatically.`,
        duration: 4000,
      });
    }
  }, [executions, selectedExecution, autoRefresh]);

  // Smart auto-refresh - only for the latest execution with 60-second timeout
  useEffect(() => {
    if (!autoRefresh || !selectedExecution || executions.length === 0) return;

    // Set start time when auto-refresh begins
    if (!autoRefreshStartTime) {
      setAutoRefreshStartTime(Date.now());
    }

    // Check if this is the latest (most recent) execution
    const sortedExecutions = [...executions].sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    const latestExecution = sortedExecutions[0];
    const isLatestExecution = selectedExecution === latestExecution?.executionArn;
    
    // Only auto-refresh for the latest execution
    if (!isLatestExecution) {
      console.log('🚫 Not auto-refreshing - this is not the latest execution');
      return;
    }

    const interval = setInterval(() => {
      // Check if 60 seconds have passed
      const currentTime = Date.now();
      const elapsedTime = currentTime - (autoRefreshStartTime || currentTime);
      
      if (elapsedTime >= 60000) { // 60 seconds
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

      // Always fetch latest execution status and logs during auto-refresh
      // This ensures we detect status changes (RUNNING -> SUCCEEDED/FAILED) immediately
      console.log(`🔄 Auto-refreshing execution (${remainingTime}s remaining):`, selectedExecution.split(':').pop());
      fetchExecutions(); // Always fetch to get latest status from AWS
      fetchLogs(selectedExecution, false); // Incremental load
      
      // Track log changes
      const selectedData = executions.find(exec => exec.executionArn === selectedExecution);
      const currentLogCount = selectedData?.logs?.length || 0;
      if (currentLogCount === lastLogCount) {
        setNoNewLogsCount(prev => prev + 1);
      } else {
        setLastLogCount(currentLogCount);
        setNoNewLogsCount(0);
        setIsPaused(false);
      }
    }, 5000); // Check every 5 seconds for faster response

    return () => clearInterval(interval);
  }, [autoRefresh, selectedExecution, executions, lastLogCount, noNewLogsCount, autoRefreshStartTime, remainingTime]);

  const handleResume = () => {
    const selectedData = executions.find(exec => exec.executionArn === selectedExecution);
    
    // Prevent resume if execution is not RUNNING
    if (selectedData && selectedData.status !== 'RUNNING') {
      toast({
        title: "Cannot resume auto-refresh",
        description: `Task is ${selectedData.status.toLowerCase()}. Auto-refresh only works for running tasks.`,
        variant: "destructive",
        duration: 4000,
      });
      console.log(`🚫 Cannot resume - execution is ${selectedData.status}`);
      return;
    }
    
    setIsPaused(false);
    setNoNewLogsCount(0);
    setAutoRefresh(true);
    setAutoRefreshStartTime(Date.now()); // Reset 60-second timer
    setRemainingTime(60); // Reset countdown display
    if (selectedExecution) {
      fetchExecutions();
      fetchLogs(selectedExecution, false); // Incremental load
    }
    console.log('▶️ Auto-refresh resumed - new 60 second timer started');
  };

  const selectedExecutionData = executions.find(exec => exec.executionArn === selectedExecution);
  
  // Determine if current selection is the latest execution
  const sortedExecutions = [...executions].sort((a, b) => 
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
  const latestExecutionArn = sortedExecutions[0]?.executionArn;
  const isLatestExecution = selectedExecution === latestExecutionArn;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'bg-blue-500';
      case 'SUCCEEDED': return 'bg-green-500';
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
    a.download = `execution-logs-${selectedExecutionData.executionArn.split(':').pop()}.txt`;
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
            <h1 className="text-3xl font-bold text-white mb-2">Activity Log</h1>
            <p className="text-muted-foreground">Monitor live execution logs and task status</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              disabled={selectedExecutionData && selectedExecutionData.status !== 'RUNNING'}
              onClick={() => {
                const selectedData = executions.find(exec => exec.executionArn === selectedExecution);
                
                // Prevent enabling auto-refresh for non-running tasks
                if (selectedData && selectedData.status !== 'RUNNING') {
                  toast({
                    title: "Cannot enable auto-refresh",
                    description: `Task is ${selectedData.status.toLowerCase()}. Auto-refresh only works for running tasks.`,
                    variant: "destructive",
                    duration: 4000,
                  });
                  return;
                }
                
                const newAutoRefresh = !autoRefresh;
                setAutoRefresh(newAutoRefresh);
                if (newAutoRefresh) {
                  setAutoRefreshStartTime(Date.now()); // Reset 60-second timer
                  setRemainingTime(60); // Reset countdown display
                  setIsPaused(false);
                  console.log('▶️ Auto-refresh enabled - 60 second timer started');
                } else {
                  setAutoRefreshStartTime(null);
                  setRemainingTime(60);
                  console.log('⏹️ Auto-refresh disabled');
                }
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh && !isPaused ? 'animate-spin' : ''}`} />
              {selectedExecutionData && selectedExecutionData.status !== 'RUNNING' ? (
                `Task ${selectedExecutionData.status.toLowerCase()} - Auto-refresh disabled`
              ) : autoRefresh ? (
                isPaused ? 'Auto-refresh (Paused)' : 
                `Auto-refresh ON (${remainingTime}s)`
              ) : 'Auto-refresh OFF'}
            </Button>
            
            
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
                    Recent Executions
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
                    <p className="text-slate-400">No executions found</p>
                    <p className="text-sm text-slate-500 mt-2">
                      Run validations to see activity logs
                    </p>
                  </div>
                ) : (
                  executions
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((execution, index) => {
                    const globalIndex = (currentPage - 1) * itemsPerPage + index;
                    const isLatest = globalIndex === 0; // First in sorted list is latest
                    return (
                      <div
                        key={execution.executionArn}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedExecution === execution.executionArn
                            ? 'bg-slate-700 border-blue-500'
                            : 'bg-slate-900 border-slate-600 hover:bg-slate-700'
                        }`}
                        onClick={() => setSelectedExecution(execution.executionArn)}
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
                          {execution.executionArn.split(':').pop()}
                        </p>
                        
                        {execution.taskArn && (
                          <p className="text-xs text-slate-500 mt-1">
                            Task: {execution.taskArn.split('/').pop()}
                          </p>
                        )}
                        
                        {isLatest && autoRefresh && selectedExecution === execution.executionArn && (
                          <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            Auto-refreshing
                          </p>
                        )}
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
                  Execution Logs
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
                    <p className="text-slate-400 text-lg">Select an execution to view logs</p>
                  </div>
                ) : (
                  <div className="bg-black rounded-lg p-4 h-[456px] overflow-y-auto font-mono text-sm relative">
                    {/* CloudWatch-style pause notification */}
                    {isPaused && (
                      <div className="sticky top-0 bg-orange-100 border border-orange-300 rounded-md p-2 mb-4 text-center text-sm">
                        <span className="text-orange-800">
                          Auto retry paused.{' '}
                          <button 
                            onClick={handleResume}
                            className="text-blue-600 hover:text-blue-800 underline font-medium"
                          >
                            Resume
                          </button>
                        </span>
                      </div>
                    )}
                    
                    {/* Always show the log container, no waiting animation */}
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

export default ActivityLog;
