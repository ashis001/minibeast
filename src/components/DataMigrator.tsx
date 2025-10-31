import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Database, 
  ArrowRight, 
  ArrowLeft, 
  Search, 
  CheckCircle, 
  Loader2,
  Play,
  Clock,
  Zap,
  HardDrive,
  AlertCircle
} from 'lucide-react';

interface Connection {
  id: string;
  type: string;
  name: string;
  host?: string;
  account?: string;
  database: string;
  status: 'connected' | 'disconnected';
}

interface TableInfo {
  name: string;
  rowCount: number;
  sizeGB: number;
  lastUpdated: string;
}

const DataMigrator = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSource, setSelectedSource] = useState<Connection | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Connection | null>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [migrationStarted, setMigrationStarted] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  
  // Fetch connections from localStorage (Settings/Connections)
  useEffect(() => {
    const loadConnections = () => {
      try {
        setLoadingConnections(true);
        const loadedConnections: Connection[] = [];
        
        // Load Snowflake connection
        const snowflakeConfig = localStorage.getItem('snowflakeConfig');
        if (snowflakeConfig) {
          try {
            const config = JSON.parse(snowflakeConfig);
            loadedConnections.push({
              id: 'snowflake',
              type: 'Snowflake',
              name: 'Snowflake Connection',
              account: config.account,
              database: config.database,
              status: 'connected'
            });
          } catch (e) {
            console.error('Failed to parse Snowflake config:', e);
          }
        }
        
        // Load MySQL connection
        const mysqlConfig = localStorage.getItem('mysqlConfig');
        if (mysqlConfig) {
          try {
            const config = JSON.parse(mysqlConfig);
            loadedConnections.push({
              id: 'mysql',
              type: 'MySQL',
              name: 'MySQL Connection',
              host: config.host,
              database: config.database,
              status: 'connected'
            });
          } catch (e) {
            console.error('Failed to parse MySQL config:', e);
          }
        }
        
        // Load PostgreSQL connection
        const postgresConfig = localStorage.getItem('postgresConfig');
        if (postgresConfig) {
          try {
            const config = JSON.parse(postgresConfig);
            loadedConnections.push({
              id: 'postgresql',
              type: 'PostgreSQL',
              name: 'PostgreSQL Connection',
              host: config.host,
              database: config.database,
              status: 'connected'
            });
          } catch (e) {
            console.error('Failed to parse PostgreSQL config:', e);
          }
        }
        
        // Load BigQuery connection
        const bigqueryConfig = localStorage.getItem('bigqueryConfig');
        if (bigqueryConfig) {
          try {
            const config = JSON.parse(bigqueryConfig);
            loadedConnections.push({
              id: 'bigquery',
              type: 'BigQuery',
              name: 'BigQuery Connection',
              account: config.project_id,
              database: config.dataset,
              status: 'connected'
            });
          } catch (e) {
            console.error('Failed to parse BigQuery config:', e);
          }
        }
        
        setConnections(loadedConnections);
      } catch (error) {
        console.error('Failed to load connections:', error);
        setConnections([]);
      } finally {
        setLoadingConnections(false);
      }
    };
    
    loadConnections();
    
    // Listen for connection updates from Settings page
    const handleConnectionsUpdated = () => {
      loadConnections();
    };
    window.addEventListener('connectionsUpdated', handleConnectionsUpdated);
    
    return () => {
      window.removeEventListener('connectionsUpdated', handleConnectionsUpdated);
    };
  }, []);

  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);

  // Load tables when source is selected
  useEffect(() => {
    const loadTablesFromSource = async () => {
      if (!selectedSource) {
        setTables([]);
        return;
      }

      setLoadingTables(true);
      try {
        // Get connection config from localStorage
        const configKey = `${selectedSource.id}Config`;
        const configStr = localStorage.getItem(configKey);
        if (!configStr) {
          console.error('No config found for', selectedSource.id);
          setLoadingTables(false);
          return;
        }

        const config = JSON.parse(configStr);
        
        // Call appropriate API based on connection type
        let response;
        if (selectedSource.type === 'Snowflake') {
          response = await fetch('/api/snowflake/tables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
          });
        } else if (selectedSource.type === 'PostgreSQL') {
          response = await fetch('/api/postgres/tables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
          });
        } else if (selectedSource.type === 'MySQL') {
          response = await fetch('/api/mysql/tables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
          });
        }

        if (response && response.ok) {
          const data = await response.json();
          if (data.success && data.tables) {
            // Transform API response to TableInfo format
            const tableList: TableInfo[] = data.tables.map((t: any) => ({
              name: t.name || t.TABLE_NAME,
              rowCount: parseInt(t.rowCount || t.row_count || 0),
              sizeGB: parseFloat(t.sizeGB || t.size_gb || 0),
              lastUpdated: t.lastUpdated || t.last_updated || 'Unknown'
            }));
            setTables(tableList);
          }
        }
      } catch (error) {
        console.error('Failed to load tables:', error);
      }
      setLoadingTables(false);
    };

    loadTablesFromSource();
  }, [selectedSource]);

  const filteredTables = tables.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedTablesData = tables.filter(t => selectedTables.includes(t.name));
  const totalRows = selectedTablesData.reduce((sum, t) => sum + t.rowCount, 0);
  const totalSize = selectedTablesData.reduce((sum, t) => sum + t.sizeGB, 0);

  const getConnectionIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'PostgreSQL': '📊',
      'Snowflake': '❄️',
      'MySQL': '🐬',
      'BigQuery': '🌩️'
    };
    return icons[type] || '💾';
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {[1, 2, 3, 4, 5].map((step) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step < currentStep ? 'bg-green-500 text-white' :
                step === currentStep ? 'bg-blue-500 text-white' :
                'bg-slate-700 text-slate-400'
              }`}>
                {step < currentStep ? <CheckCircle className="h-5 w-5" /> : step}
              </div>
              <span className="text-xs mt-2 text-slate-400">
                {step === 1 && 'Source'}
                {step === 2 && 'Destination'}
                {step === 3 && 'Tables'}
                {step === 4 && 'Configure'}
                {step === 5 && 'Review'}
              </span>
            </div>
            {step < 5 && (
              <div className={`flex-1 h-1 mx-2 ${
                step < currentStep ? 'bg-green-500' : 'bg-slate-700'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">Select Source Connection</h2>
        <p className="text-slate-400">Choose the database you want to migrate data from</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search connections..."
          className="pl-10 bg-slate-800 border-slate-700 text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loadingConnections ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-slate-400">Loading connections...</span>
        </div>
      ) : connections.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-8 text-center">
            <Database className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">No Connections Found</h3>
            <p className="text-slate-400 mb-4">
              Please configure database connections in Settings → Connections before starting a migration.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map((conn) => (
            <Card 
            key={conn.id}
            className={`bg-slate-800 border-2 cursor-pointer transition-all ${
              selectedSource?.id === conn.id 
                ? 'border-blue-500' 
                : 'border-slate-700 hover:border-slate-600'
            }`}
            onClick={() => setSelectedSource(conn)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getConnectionIcon(conn.type)}</span>
                  <div>
                    <h3 className="text-white font-semibold">{conn.name}</h3>
                    <p className="text-slate-400 text-sm">
                      {conn.host || conn.account} • {conn.database}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-500 text-white">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                  {selectedSource?.id === conn.id && (
                    <CheckCircle className="h-6 w-6 text-blue-500" />
                  )}
                </div>
              </div>
            </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">Select Destination Connection</h2>
        <p className="text-slate-400">Choose where to migrate the data to</p>
        {selectedSource && (
          <div className="mt-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
            <span className="text-slate-400 text-sm">Source: </span>
            <span className="text-white font-medium">
              {getConnectionIcon(selectedSource.type)} {selectedSource.name} → {selectedSource.database}
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {connections
          .filter(conn => conn.id !== selectedSource?.id)
          .map((conn) => (
            <Card 
              key={conn.id}
              className={`bg-slate-800 border-2 cursor-pointer transition-all ${
                selectedDestination?.id === conn.id 
                  ? 'border-blue-500' 
                  : 'border-slate-700 hover:border-slate-600'
              }`}
              onClick={() => setSelectedDestination(conn)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getConnectionIcon(conn.type)}</span>
                    <div>
                      <h3 className="text-white font-semibold">{conn.name}</h3>
                      <p className="text-slate-400 text-sm">
                        {conn.host || conn.account} • {conn.database}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-500 text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                    {selectedDestination?.id === conn.id && (
                      <CheckCircle className="h-6 w-6 text-blue-500" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">Select Tables to Migrate</h2>
        <p className="text-slate-400">Choose which tables you want to migrate</p>
        <div className="mt-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              {getConnectionIcon(selectedSource!.type)} {selectedSource!.name} → 
              {getConnectionIcon(selectedDestination!.type)} {selectedDestination!.name}
            </span>
          </div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search tables..."
          className="pl-10 bg-slate-800 border-slate-700 text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {selectedTables.length > 0 && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-400">
              {selectedTables.length} tables selected • {totalRows.toLocaleString()} rows • ~{totalSize.toFixed(1)} GB
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTables([])}
              className="text-blue-400 hover:text-blue-300"
            >
              Clear All
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredTables.map((table) => (
          <Card
            key={table.name}
            className={`bg-slate-800 border-2 cursor-pointer transition-all ${
              selectedTables.includes(table.name)
                ? 'border-blue-500'
                : 'border-slate-700 hover:border-slate-600'
            }`}
            onClick={() => {
              setSelectedTables(prev =>
                prev.includes(table.name)
                  ? prev.filter(t => t !== table.name)
                  : [...prev, table.name]
              );
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedTables.includes(table.name)}
                    onChange={() => {}}
                    className="w-4 h-4"
                  />
                  <div>
                    <h3 className="text-white font-semibold">{table.name}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                      <span>📊 {table.rowCount.toLocaleString()} rows</span>
                      <span>💾 {table.sizeGB.toFixed(2)} GB</span>
                      <span>🕒 Updated {table.lastUpdated}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">Configure Migration Settings</h2>
        <p className="text-slate-400">Optimize performance and data handling</p>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Performance Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-white">Parallel Workers</Label>
            <select className="w-full mt-2 p-2 bg-slate-900 border border-slate-700 rounded text-white">
              <option value="2">2 workers</option>
              <option value="4" selected>4 workers (Recommended)</option>
              <option value="8">8 workers</option>
            </select>
            <p className="text-sm text-slate-400 mt-1">More workers = faster migration</p>
          </div>

          <div>
            <Label className="text-white">Batch Size</Label>
            <select className="w-full mt-2 p-2 bg-slate-900 border border-slate-700 rounded text-white">
              <option value="10000">10,000 rows</option>
              <option value="50000" selected>50,000 rows (Recommended)</option>
              <option value="100000">100,000 rows</option>
            </select>
            <p className="text-sm text-slate-400 mt-1">Rows per batch</p>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="s3-staging" defaultChecked className="w-4 h-4" />
            <Label htmlFor="s3-staging" className="text-white">
              Use S3 Staging (10x faster for Snowflake)
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">📊 Estimated Migration Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total rows:</span>
              <span className="text-white font-semibold">{totalRows.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Workers:</span>
              <span className="text-white font-semibold">4 parallel</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Batch size:</span>
              <span className="text-white font-semibold">50,000 rows</span>
            </div>
            <div className="border-t border-slate-700 pt-3 mt-3">
              <div className="flex justify-between">
                <span className="text-white font-semibold">⏱️ Estimated time:</span>
                <span className="text-green-400 font-bold">8-12 minutes</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-white font-semibold">💰 Estimated cost:</span>
                <span className="text-green-400 font-bold">~$0.15</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">Review Migration</h2>
        <p className="text-slate-400">Confirm your migration settings before starting</p>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Migration Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-slate-400 text-sm mb-2">Source:</h4>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getConnectionIcon(selectedSource!.type)}</span>
              <div>
                <p className="text-white font-semibold">{selectedSource!.name}</p>
                <p className="text-slate-400 text-sm">Database: {selectedSource!.database}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-slate-400 text-sm mb-2">Destination:</h4>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getConnectionIcon(selectedDestination!.type)}</span>
              <div>
                <p className="text-white font-semibold">{selectedDestination!.name}</p>
                <p className="text-slate-400 text-sm">Database: {selectedDestination!.database}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-slate-400 text-sm mb-2">Tables: {selectedTables.length} selected</h4>
            <div className="space-y-2">
              {selectedTablesData.map((table) => (
                <div key={table.name} className="flex justify-between text-sm">
                  <span className="text-white">• {table.name}</span>
                  <span className="text-slate-400">
                    {table.rowCount.toLocaleString()} rows, {table.sizeGB.toFixed(2)} GB
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Total:</span>
              <span className="text-white font-semibold">
                {totalRows.toLocaleString()} rows • ~{totalSize.toFixed(1)} GB
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Estimated time:</span>
              <span className="text-green-400 font-semibold">8-12 minutes</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-orange-400 font-semibold">Ready to Start</p>
          <p className="text-slate-300 text-sm mt-1">
            This will start an ECS Fargate task and begin migrating data. You can monitor progress in real-time.
          </p>
        </div>
      </div>
    </div>
  );

  const renderMigrationInProgress = () => (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Migration In Progress</CardTitle>
              <p className="text-slate-400 text-sm mt-1">
                {getConnectionIcon(selectedSource!.type)} {selectedSource!.name} → 
                {getConnectionIcon(selectedDestination!.type)} {selectedDestination!.name}
              </p>
            </div>
            <Badge className="bg-blue-500 text-white">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Running
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Overall Progress</span>
              <span className="text-white font-semibold">{migrationProgress}%</span>
            </div>
            <Progress value={migrationProgress} className="h-3" />
            <div className="flex justify-between text-xs mt-2 text-slate-400">
              <span>Current speed: 6,234 rows/sec</span>
              <span>Estimated remaining: 6 minutes</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-semibold">Table Progress</h4>
            {selectedTables.slice(0, 2).map((table, idx) => (
              <div key={table} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white">
                    {idx === 0 ? '✅' : '🔄'} {table}
                  </span>
                  <span className="text-slate-400">{idx === 0 ? '100%' : '52%'}</span>
                </div>
                <Progress value={idx === 0 ? 100 : 52} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {!migrationStarted ? (
        <>
          {renderStepIndicator()}
          
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-8">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
              {currentStep === 5 && renderStep5()}

              <div className="flex justify-between mt-8 pt-6 border-t border-slate-700">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                  disabled={currentStep === 1}
                  className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                {currentStep < 5 ? (
                  <Button
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    disabled={
                      (currentStep === 1 && !selectedSource) ||
                      (currentStep === 2 && !selectedDestination) ||
                      (currentStep === 3 && selectedTables.length === 0)
                    }
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setMigrationStarted(true);
                      // Simulate progress
                      const interval = setInterval(() => {
                        setMigrationProgress(prev => {
                          if (prev >= 100) {
                            clearInterval(interval);
                            return 100;
                          }
                          return prev + 10;
                        });
                      }, 1000);
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Migration
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        renderMigrationInProgress()
      )}
    </div>
  );
};

export default DataMigrator;
