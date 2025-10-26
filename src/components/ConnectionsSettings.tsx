import React from "react";
import { Cloud, Database } from "lucide-react";
import ConfigurationStep from './ConfigurationStep';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

const ConnectionsSettings = () => {
  const handleConnectionsSaved = () => {
    // Trigger re-check in Dashboard parent component
    window.dispatchEvent(new Event('connectionsUpdated'));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
          <Cloud className="h-6 w-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Connections</h1>
          <p className="text-slate-400 mt-1">Configure AWS and Snowflake connections for deployments</p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-900/20 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-400" />
            Connection Configuration
          </CardTitle>
          <CardDescription className="text-slate-300">
            Set up your cloud infrastructure connections. These credentials will be used for all module deployments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-slate-300">
            <p>✓ AWS credentials for ECS, ECR, and other services</p>
            <p>✓ Snowflake connection details for data operations</p>
            <p>✓ Secure storage in browser localStorage</p>
            <p className="text-amber-400 mt-4">⚠️ Make sure to test your connections before deploying modules</p>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <ConfigurationStep onNext={handleConnectionsSaved} />
    </div>
  );
};

export default ConnectionsSettings;
