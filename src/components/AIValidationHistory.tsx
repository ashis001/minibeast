import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Eye, CheckCircle, XCircle, AlertCircle, Trash2, Play, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIValidation {
  id: string;
  prompt: string;
  sql: string;
  database: string;
  schema: string;
  testResult: any;
  createdAt: string;
  isActive: boolean;
}

interface AIValidationHistoryProps {
  snowflakeConfig: any;
}

const AIValidationHistory = ({ snowflakeConfig }: AIValidationHistoryProps) => {
  const { toast } = useToast();
  const [validations, setValidations] = useState<AIValidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [expandedSQL, setExpandedSQL] = useState<string | null>(null);

  useEffect(() => {
    loadAIValidations();
  }, []);

  const loadAIValidations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-validations');
      const data = await response.json();
      
      if (data.success) {
        setValidations(data.validations || []);
      }
    } catch (error) {
      console.error('Failed to load AI validations:', error);
      toast({
        title: "Load Failed",
        description: "Could not load AI validation history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
        // Update local state
        setValidations(prev => prev.map(v => 
          v.id === id ? { ...v, isActive: !currentStatus } : v
        ));
        
        toast({
          title: !currentStatus ? "✅ Validation Activated" : "⏸️ Validation Deactivated",
          description: !currentStatus 
            ? "Validation is now active and visible in View Validations" 
            : "Validation has been deactivated",
        });
      } else {
        toast({
          title: "Toggle Failed",
          description: data.message || "Failed to toggle validation status",
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this AI validation?')) {
      return;
    }

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
        setValidations(prev => prev.filter(v => v.id !== id));
        toast({
          title: "🗑️ Validation Deleted",
          description: "AI validation has been removed",
        });
      } else {
        toast({
          title: "Delete Failed",
          description: data.message || "Failed to delete validation",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Could not connect to the server",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (testResult: any) => {
    if (!testResult || !testResult.results || testResult.results.length === 0) {
      return <Badge variant="outline" className="bg-slate-700 text-slate-300">Unknown</Badge>;
    }

    const status = testResult.results[0]?.Status;
    if (status === 0) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✓ Pass</Badge>;
    } else if (status === 1) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">✗ Fail</Badge>;
    } else if (status === 2) {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">⚠ Warning</Badge>;
    }
    return <Badge variant="outline">-</Badge>;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
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
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-white">AI Validation History</h1>
          <p className="text-slate-400 mt-1 text-lg">Manage your AI-generated validations</p>
        </div>
        <Button 
          onClick={loadAIValidations}
          variant="outline"
          className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
        >
          Refresh
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-purple-500/10 border-purple-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-purple-400 mt-0.5" />
            <div className="text-sm text-slate-300">
              <p className="font-medium text-purple-400 mb-1">How it works:</p>
              <ul className="space-y-1 text-slate-400">
                <li>• Toggle <strong className="text-white">Active</strong> to save the validation to Snowflake config table</li>
                <li>• Active validations appear in <strong className="text-white">View Validations</strong> page</li>
                <li>• Inactive validations stay in history but won't be executed</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validations List */}
      {validations.length === 0 ? (
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-12 text-center">
            <Sparkles className="h-16 w-16 mx-auto text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-slate-400 mb-2">No AI Validations Yet</h3>
            <p className="text-slate-500 mb-4">
              Generate your first validation using AI Validation Generator
            </p>
            <Button 
              onClick={() => window.location.hash = '#/ai-validation'}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate AI Validation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {validations.map((validation) => (
            <Card 
              key={validation.id} 
              className={`border-2 transition-all ${
                validation.isActive 
                  ? 'border-green-500/50 bg-green-500/5' 
                  : 'border-slate-700 bg-slate-900'
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-white text-lg">
                        {validation.prompt}
                      </CardTitle>
                      {validation.isActive && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-4 text-sm">
                      <span>📊 {validation.database}.{validation.schema}</span>
                      <span>•</span>
                      <span>🕒 {new Date(validation.createdAt).toLocaleString()}</span>
                      <span>•</span>
                      {getStatusBadge(validation.testResult)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExpandedSQL(expandedSQL === validation.id ? null : validation.id)}
                      className="border-slate-600 text-slate-300 hover:text-white"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {expandedSQL === validation.id ? 'Hide' : 'View'} SQL
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleToggleActive(validation.id, validation.isActive)}
                      disabled={activating === validation.id}
                      className={
                        validation.isActive
                          ? "bg-orange-600 hover:bg-orange-700"
                          : "bg-green-600 hover:bg-green-700"
                      }
                    >
                      {activating === validation.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : validation.isActive ? (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(validation.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {expandedSQL === validation.id && (
                <CardContent>
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-700 overflow-x-auto">
                    <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap">
                      {validation.sql}
                    </pre>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIValidationHistory;
