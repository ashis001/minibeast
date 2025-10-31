import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Activity,
  RefreshCw,
  CheckCircle, 
  AlertCircle,
  Terminal,
  Database,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface MigrationJob {
  jobId: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  speed: number;
  estimatedTime: string;
  source: {
    name: string;
    type: string;
  };
  destination: {
    name: string;
    type: string;
  };
  tables: string[];
  logs: Array<{timestamp: number, message: string}>;
}

const MigrationActivityLog = () => {
  const [currentJob, setCurrentJob] = useState<MigrationJob | null>(null);
  const [lastLogTimestamp, setLastLogTimestamp] = useState<number | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentJob?.logs]);

  // Poll for migration status and logs
  useEffect(() => {
    const jobId = localStorage.getItem('currentMigrationJobId');
    if (!jobId) return;

    const fetchMigrationData = async () => {
      try {
        // Get status
        const statusResponse = await fetch(`/api/migrate/status/${jobId}`);
        const statusData = await statusResponse.json();

        if (statusData.success) {
          // Get logs
          let logsUrl = `/api/migrate/logs/${jobId}`;
          if (lastLogTimestamp) {
            logsUrl += `?incremental=true&startTime=${lastLogTimestamp}`;
          }

          const logsResponse = await fetch(logsUrl);
          const logsData = await logsResponse.json();

          setCurrentJob(prev => {
            const existingLogs = prev?.logs || [];
            let newLogs = existingLogs;

            if (logsData.success && logsData.logs && logsData.logs.length > 0) {
              const existingTimestamps = new Set(existingLogs.map(log => log.timestamp));
              const uniqueNewLogs = logsData.logs.filter(
                (newLog: any) => !existingTimestamps.has(newLog.timestamp)
              );

              if (uniqueNewLogs.length > 0) {
                newLogs = [...existingLogs, ...uniqueNewLogs];
                setLastLogTimestamp(uniqueNewLogs[uniqueNewLogs.length - 1].timestamp);
              }
            }

            return {
              jobId,
              status: statusData.status || 'running',
              progress: statusData.progress || 0,
              speed: statusData.speed || 0,
              estimatedTime: statusData.estimatedTime || '',
              source: prev?.source || JSON.parse(localStorage.getItem('migrationSource') || '{}'),
              destination: prev?.destination || JSON.parse(localStorage.getItem('migrationDestination') || '{}'),
              tables: prev?.tables || JSON.parse(localStorage.getItem('migrationTables') || '[]'),
              logs: newLogs
            };
          });

          // Stop polling if completed or failed
          if (statusData.status === 'completed' || statusData.status === 'failed') {
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('Failed to fetch migration data:', error);
      }
    };

    // Initial fetch
    fetchMigrationData();

    // Poll every 3 seconds
    const pollInterval = setInterval(fetchMigrationData, 3000);

    return () => clearInterval(pollInterval);
  }, [lastLogTimestamp]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <AlertCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getConnectionIcon = (type: string) => {
    switch(type) {
      case 'mysql': return '🐬';
      case 'postgresql': return '🐘';
      case 'snowflake': return '❄️';
      case 'oracle': return '🔮';
      case 'bigquery': return '📊';
      default: return '🗄️';
    }
  };

  if (!currentJob) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Migration Activity Log</h1>
              <p className="text-muted-foreground">Monitor live migration logs and task status</p>
            </div>
          </div>
          <div className="text-center py-12">
            <Terminal className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No active migration</p>
            <p className="text-sm text-slate-500 mt-2">
              Start a migration from Launch Pad to see activity logs
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Migration Activity Log</h1>
            <p className="text-muted-foreground">Monitor live migration logs and task status</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Migration Info */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Current Migration
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <Badge className={`${getStatusColor(currentJob.status)} text-white`}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(currentJob.status)}
                      {currentJob.status.toUpperCase()}
                    </div>
                  </Badge>
                  <span className="text-xs text-slate-400">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>

                {/* Job ID */}
                <div>
                  <p className="text-xs text-slate-400 mb-1">Job ID</p>
                  <p className="text-sm text-slate-300 font-mono truncate">{currentJob.jobId}</p>
                </div>

                {/* Source & Destination */}
                <div>
                  <p className="text-xs text-slate-400 mb-2">Migration Path</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getConnectionIcon(currentJob.source.type)}</span>
                      <div>
                        <p className="text-white font-semibold text-sm">{currentJob.source.name}</p>
                        <p className="text-slate-400 text-xs">Source</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-4">
                      <ArrowRight className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getConnectionIcon(currentJob.destination.type)}</span>
                      <div>
                        <p className="text-white font-semibold text-sm">{currentJob.destination.name}</p>
                        <p className="text-slate-400 text-xs">Destination</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tables */}
                <div>
                  <p className="text-xs text-slate-400 mb-2">Tables ({currentJob.tables.length})</p>
                  <div className="space-y-1">
                    {currentJob.tables.map((table) => (
                      <div key={table} className="text-sm text-slate-300">• {table}</div>
                    ))}
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-white font-semibold">{currentJob.progress.toFixed(1)}%</span>
                  </div>
                  <Progress value={currentJob.progress} className="h-2" />
                </div>

                {/* Stats */}
                {currentJob.status === 'running' && (
                  <div className="text-xs text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Speed:</span>
                      <span className="text-white">{currentJob.speed > 0 ? `${currentJob.speed.toLocaleString()} rows/sec` : 'Starting...'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Remaining:</span>
                      <span className="text-white">{currentJob.estimatedTime || 'Calculating...'}</span>
                    </div>
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
                  <Badge className={`ml-2 ${getStatusColor(currentJob.status)} text-white`}>
                    {currentJob.status.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black rounded-lg p-4 h-[520px] overflow-y-auto font-mono text-sm relative">
                  {currentJob.logs.length === 0 ? (
                    <div className="text-slate-500 text-xs">
                      <span className="text-slate-400">[{new Date().toLocaleTimeString()}]</span> INFO - Connecting to log stream...
                    </div>
                  ) : (
                    currentJob.logs.map((log, index) => {
                      const isError = log.message.includes('ERROR') || log.message.includes('❌');
                      const isSuccess = log.message.includes('✅') || log.message.includes('SUCCESS');
                      const isWarning = log.message.includes('WARNING') || log.message.includes('⚠️');
                      const isInfo = log.message.includes('INFO') || log.message.includes('🚀') || log.message.includes('📊');
                      
                      const level = isError ? 'ERROR' : isSuccess ? 'INFO' : isWarning ? 'WARN' : 'INFO';
                      const levelColor = isError ? 'text-red-400' : isSuccess ? 'text-green-400' : isWarning ? 'text-yellow-400' : isInfo ? 'text-blue-400' : 'text-slate-200';
                      
                      return (
                        <div key={index} className="mb-1 flex hover:bg-slate-900 px-1 -mx-1 rounded">
                          <span className="text-slate-500 mr-3 flex-shrink-0 select-none">
                            [{new Date(log.timestamp).toLocaleTimeString()}]
                          </span>
                          <span className={`mr-2 flex-shrink-0 font-semibold select-none ${levelColor}`}>
                            {level}
                          </span>
                          <span className="text-slate-200 break-all leading-relaxed">
                            {log.message}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={logsEndRef} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationActivityLog;
