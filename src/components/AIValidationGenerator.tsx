import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TestTube, CheckCircle, AlertCircle, Database, Play, Save, Loader2, History, Eye, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIValidationGeneratorProps {
  onNext: () => void;
  snowflakeConfig: any;
}

const AIValidationGenerator = ({ onNext, snowflakeConfig }: AIValidationGeneratorProps) => {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [database, setDatabase] = useState("");
  const [schema, setSchema] = useState("");
  const [tables, setTables] = useState<string[]>([]);
  const [tableName, setTableName] = useState("");
  const [tableColumns, setTableColumns] = useState<any[]>([]);
  const [generatedSQL, setGeneratedSQL] = useState("");
  const [generating, setGenerating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [healingLog, setHealingLog] = useState<string[]>([]);
  const [aiHistory, setAiHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [expandedSQL, setExpandedSQL] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    // Check if Gemini is configured
    checkGeminiConfig();
    
    // Load Snowflake config
    if (snowflakeConfig) {
      setDatabase(snowflakeConfig.database || "");
      setSchema(snowflakeConfig.schema || "");
    }
    
    // Load AI history
    loadAIHistory();
  }, [snowflakeConfig]);

  const checkGeminiConfig = async () => {
    try {
      const response = await fetch('/api/connections');
      const data = await response.json();
      if (data.success && data.connections?.gemini) {
        setGeminiConfigured(true);
      }
    } catch (error) {
      console.error('Failed to check Gemini config:', error);
    }
  };

  const loadAIHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch('/api/ai-validations');
      const data = await response.json();
      
      if (data.success) {
        setAiHistory(data.validations || []);
      }
    } catch (error) {
      console.error('Failed to load AI history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setActivating(id);
    
    try {
      const response = await fetch('/api/toggle-ai-validation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          isActive: !currentStatus,
          snowflakeConfig
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAiHistory(prev => prev.map(v => 
          v.id === id ? { ...v, isActive: !currentStatus } : v
        ));
        
        toast({
          title: !currentStatus ? "✅ Validation Activated" : "⏸️ Validation Deactivated",
          description: !currentStatus 
            ? "Validation is now active in View Validations" 
            : "Validation has been deactivated",
        });
        await loadAIHistory();
      } else {
        toast({
          title: "Toggle Failed",
          description: data.message || "Failed to toggle validation",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Toggle Failed",
        description: "Could not connect to the server",
        variant: "destructive",
      });
    } finally {
      setActivating(null);
    }
  };

  const handleDeleteValidation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this validation?')) return;
    
    try {
      const response = await fetch('/api/delete-ai-validation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAiHistory(prev => prev.filter(v => v.id !== id));
        toast({
          title: "🗑️ Deleted",
          description: "Validation removed from history",
        });
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Could not delete validation",
        variant: "destructive",
      });
    }
  };

  const fetchTableSchema = async (table: string) => {
    try {
      // Parse fully qualified table name (e.g., "TESTING.MIGRATED.RESERVATION" -> "RESERVATION")
      let actualTableName = table;
      let actualDatabase = database;
      let actualSchema = schema;
      
      const parts = table.split('.');
      if (parts.length === 3) {
        actualDatabase = parts[0];
        actualSchema = parts[1];
        actualTableName = parts[2];
        setDatabase(actualDatabase);
        setSchema(actualSchema);
      } else if (parts.length === 2) {
        actualSchema = parts[0];
        actualTableName = parts[1];
        setSchema(actualSchema);
      } else {
        actualTableName = parts[0];
      }
      
      const response = await fetch('/api/get-table-schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableName: actualTableName,
          database: actualDatabase,
          schema: actualSchema,
          snowflakeConfig
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setTableColumns(data.columns);
        return data.columns;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch table schema:', error);
      return null;
    }
  };

  const handleGenerate = async (isRetry = false, previousError = '', previousSQL = '') => {
    if (!prompt.trim() && !isRetry) {
      toast({
        title: "Prompt Required",
        description: "Please describe what you want to validate",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    if (!isRetry) {
      setGeneratedSQL("");
      setTestResult(null);
      setRetryCount(0);
      setHealingLog([]);
    }

    // Fetch table schema if table name is provided
    let columns = tableColumns;
    let parsedTableName = tableName;
    
    if (tableName && !isRetry) {
      setHealingLog(prev => [...prev, `📋 Fetching schema for table: ${tableName}...`]);
      columns = await fetchTableSchema(tableName);
      if (columns) {
        setHealingLog(prev => [...prev, `✅ Found ${columns.length} columns`]);
        
        // Extract just the table name if fully qualified
        const parts = tableName.split('.');
        parsedTableName = parts[parts.length - 1];
      }
    }

    try {
      if (isRetry) {
        setHealingLog(prev => [...prev, `🔄 Retry #${retryCount + 1}: Asking AI to fix the error...`]);
      } else {
        setHealingLog(prev => [...prev, `🤖 Generating SQL from prompt...`]);
      }

      const response = await fetch('/api/generate-validation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          database,
          schema,
          tables: parsedTableName ? [parsedTableName] : (tables.length > 0 ? tables : undefined),
          tableColumns: columns,
          previousError: isRetry ? previousError : undefined,
          previousSQL: isRetry ? previousSQL : undefined
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setGeneratedSQL(data.sql);
        setHealingLog(prev => [...prev, `✅ SQL generated successfully`]);
        
        if (!isRetry) {
          toast({
            title: "✨ Validation Generated",
            description: "AI has generated your validation query",
          });
        }

        // Auto-test the generated query
        await autoTestAndSave(data.sql);
      } else {
        toast({
          title: "Generation Failed",
          description: data.message || "Failed to generate validation",
          variant: "destructive",
        });
        setGenerating(false);
      }
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Could not connect to the server",
        variant: "destructive",
      });
      setGenerating(false);
    }
  };

  const autoTestAndSave = async (sql: string) => {
    setHealingLog(prev => [...prev, `🧪 Auto-testing query in Snowflake...`]);
    setTesting(true);

    try {
      const response = await fetch('/api/test-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: sql,
          snowflakeConfig
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestResult({
          success: true,
          results: data.results,
          rowCount: data.rowCount
        });
        setHealingLog(prev => [...prev, `✅ Query test passed! Returned ${data.rowCount} row(s)`]);
        
        // Auto-save on success
        setHealingLog(prev => [...prev, `💾 Auto-saving to history...`]);
        await handleSaveToHistory(sql, data);
        
        setGenerating(false);
        setTesting(false);
      } else {
        // Test failed - retry with self-healing
        const errorMessage = data.message || "Query execution failed";
        setHealingLog(prev => [...prev, `❌ Test failed: ${errorMessage}`]);
        
        if (retryCount < 3) {
          const newRetryCount = retryCount + 1;
          setRetryCount(newRetryCount);
          setTestResult(null);
          setTesting(false);
          
          setHealingLog(prev => [...prev, `⏳ Retry attempt ${newRetryCount}/3...`]);
          
          // Self-heal: Ask AI to fix the query
          await handleGenerate(true, errorMessage, sql);
        } else {
          setHealingLog(prev => [...prev, `⚠️ Max retries reached (3). Please review the query manually.`]);
          setTestResult({
            success: false,
            error: errorMessage
          });
          toast({
            title: "Self-Healing Failed",
            description: "Could not auto-fix the query after 3 attempts. Please review manually.",
            variant: "destructive",
          });
          setGenerating(false);
          setTesting(false);
        }
      }
    } catch (error) {
      setHealingLog(prev => [...prev, `❌ Connection error: Could not connect to server`]);
      setTestResult({
        success: false,
        error: "Could not connect to the server"
      });
      setGenerating(false);
      setTesting(false);
    }
  };

  const handleTestQuery = async () => {
    if (!generatedSQL.trim()) {
      toast({
        title: "No Query to Test",
        description: "Please generate a validation query first",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/test-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: generatedSQL,
          snowflakeConfig
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestResult({
          success: true,
          results: data.results,
          rowCount: data.rowCount
        });
        toast({
          title: "✅ Query Executed Successfully",
          description: `Returned ${data.rowCount} row(s)`,
        });
      } else {
        setTestResult({
          success: false,
          error: data.message || "Query execution failed"
        });
        toast({
          title: "Query Failed",
          description: data.message || "Failed to execute query",
          variant: "destructive",
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: "Could not connect to the server"
      });
      toast({
        title: "Test Failed",
        description: "Could not connect to the server",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveToHistory = async (sql?: string, testData?: any) => {
    const sqlToSave = sql || generatedSQL;
    const testResultToSave = testData || testResult;
    
    if (!sqlToSave.trim() || !testResultToSave?.success) {
      if (!sql) {
        toast({
          title: "Cannot Save",
          description: "Please test the query successfully before saving",
          variant: "destructive",
        });
      }
      return;
    }

    try {
      const response = await fetch('/api/save-ai-validation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          sql: sqlToSave,
          database,
          schema,
          testResult: testResultToSave.results
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setHealingLog(prev => [...prev, `✅ Saved to AI Validation History successfully!`]);
        toast({
          title: "💾 Saved to AI History",
          description: "Validation auto-saved! Scroll down to activate it.",
        });
        
        // Reload history to show the new validation
        await loadAIHistory();
        
        if (!sql) {
          // Only clear form on manual save
          setPrompt("");
          setGeneratedSQL("");
          setTestResult(null);
          setTableName("");
          setTableColumns([]);
          setHealingLog([]);
          setRetryCount(0);
        }
      } else {
        toast({
          title: "Save Failed",
          description: data.message || "Failed to save validation",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not connect to the server",
        variant: "destructive",
      });
    }
  };

  if (!geminiConfigured) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-400">
              <AlertCircle className="h-6 w-6" />
              Gemini AI Not Configured
            </CardTitle>
            <CardDescription>
              Please configure your Gemini API key in Settings before using AI validation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/#/settings'} className="w-full">
              Go to Settings → AI Models
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white">AI Validation Generator</h1>
          <p className="text-slate-400 mt-1 text-lg">Generate validation queries with AI</p>
        </div>
      </div>

      {/* Generator Form */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Database className="h-5 w-5" />
            Validation Details
          </CardTitle>
          <CardDescription>Describe what you want to validate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="database">Database</Label>
              <Input
                id="database"
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
                placeholder="WARNER_BASE"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schema">Schema</Label>
              <Input
                id="schema"
                value={schema}
                onChange={(e) => setSchema(e.target.value)}
                placeholder="APS"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tableName">Table Name (required for schema fetch)</Label>
            <Input
              id="tableName"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="RESERVATION"
              className="bg-slate-800 border-slate-700 text-white"
            />
            <p className="text-xs text-slate-400">AI will fetch column names automatically</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">What do you want to validate?</Label>
            <textarea
              id="prompt"
              className="w-full min-h-[120px] p-3 rounded-md border border-slate-700 bg-slate-800 text-white"
              placeholder="Example: Check if all reservations in staging match base table, with a threshold of 50 mismatches as warning"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <Button 
            onClick={() => handleGenerate()}
            disabled={generating || !prompt.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating & Testing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate, Test & Save
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Healing Log */}
      {healingLog.length > 0 && (
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              🔬 AI Self-Healing Log
            </CardTitle>
            <CardDescription>Watch AI automatically fix errors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-700 space-y-2 max-h-64 overflow-y-auto">
              {healingLog.map((log, idx) => (
                <div key={idx} className="text-sm text-slate-300 font-mono">
                  {log}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Query */}
      {generatedSQL && (
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              Generated Query
            </CardTitle>
            <CardDescription>Review and test the AI-generated validation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-700 overflow-x-auto">
              <pre className="text-sm text-slate-300 font-mono">{generatedSQL}</pre>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleTestQuery}
                disabled={testing}
                variant="outline"
                className="flex-1"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Test Query
                  </>
                )}
              </Button>

              <Button 
                onClick={() => handleSaveToHistory()}
                disabled={!testResult?.success}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Manual Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {testResult && (
        <Card className={`border-2 ${testResult.success ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-green-400">Query Test Successful</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <span className="text-red-400">Query Test Failed</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResult.success ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">
                  Query returned {testResult.rowCount} row(s)
                </p>
                {testResult.results && testResult.results.length > 0 && (
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-700 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          {Object.keys(testResult.results[0]).map((key) => (
                            <th key={key} className="text-left p-2 text-slate-300 font-semibold">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {testResult.results.map((row: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-800">
                            {Object.values(row).map((value: any, vidx: number) => (
                              <td key={vidx} className="p-2 text-slate-400">
                                {value === 0 ? (
                                  <span className="text-green-400 font-semibold">✓ Pass</span>
                                ) : value === 1 ? (
                                  <span className="text-red-400 font-semibold">✗ Fail</span>
                                ) : value === 2 ? (
                                  <span className="text-yellow-400 font-semibold">⚠ Warning</span>
                                ) : (
                                  String(value)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-red-950/50 p-4 rounded-lg border border-red-500/50">
                <p className="text-red-400 text-sm font-mono">{testResult.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Validation History */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <History className="h-5 w-5" />
            AI Validation History
          </CardTitle>
          <CardDescription>
            Previously generated validations. Activate to add them to View Validations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" />
              <p className="text-slate-400 mt-2">Loading history...</p>
            </div>
          ) : aiHistory.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 mx-auto text-slate-600 mb-2" />
              <p className="text-slate-400">No AI validations generated yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {aiHistory
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((validation) => (
                <Card key={validation.id} className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-white text-lg">
                          {validation.prompt}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {validation.database}.{validation.schema}
                          {validation.testResult && (
                            <span className="ml-3">
                              {validation.testResult.rowCount || 0} validation(s)
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {validation.isActive ? (
                          <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full border border-green-500/30">
                            ✓ Active
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-slate-600/20 text-slate-400 text-sm rounded-full border border-slate-600/30">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* SQL Query */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-slate-300">Generated SQL</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedSQL(expandedSQL === validation.id ? null : validation.id)}
                          className="text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          {expandedSQL === validation.id ? 'Hide' : 'View'}
                        </Button>
                      </div>
                      {expandedSQL === validation.id && (
                        <div className="bg-slate-950 p-3 rounded border border-slate-700 overflow-x-auto">
                          <pre className="text-xs text-slate-300 font-mono">{validation.sql}</pre>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleToggleActive(validation.id, validation.isActive)}
                        disabled={activating === validation.id}
                        className={validation.isActive ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700"}
                        size="sm"
                      >
                        {activating === validation.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Play className="h-3 w-3 mr-1" />
                        )}
                        {validation.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        onClick={() => handleDeleteValidation(validation.id)}
                        variant="outline"
                        size="sm"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>

                    {/* Created Date */}
                    <p className="text-xs text-slate-500 pt-2">
                      Created: {new Date(validation.createdAt).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}

              {/* Pagination */}
              {aiHistory.length > itemsPerPage && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-slate-400">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, aiHistory.length)} of {aiHistory.length}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(aiHistory.length / itemsPerPage), prev + 1))}
                      disabled={currentPage >= Math.ceil(aiHistory.length / itemsPerPage)}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AIValidationGenerator;
