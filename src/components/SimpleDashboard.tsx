import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Settings, Database, Sparkles } from "lucide-react";

const SimpleDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">MINIBEAST 2.0</h1>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-emerald-400" />
            <p className="text-xs font-medium text-slate-500 tracking-wider">POWERED BY DATACTION</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Zap className="h-5 w-5 text-emerald-500" />
                Add Validation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 mb-4">
                Configure validation rules for your Snowflake data
              </p>
              <Button 
                onClick={() => navigate('/add-validation')}
                className="w-full bg-emerald-500 hover:bg-emerald-600"
              >
                Configure Validation
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Settings className="h-5 w-5 text-blue-500" />
                Deploy Application
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 mb-4">
                Deploy your Docker containers to AWS ECS
              </p>
              <Button 
                onClick={() => navigate('/deploy')}
                className="w-full bg-blue-500 hover:bg-blue-600"
              >
                Start Deployment
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Database className="h-5 w-5 text-purple-500" />
                View Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 mb-4">
                Monitor your validation results and deployments
              </p>
              <Button 
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                disabled
              >
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button 
                  onClick={() => navigate('/add-validation')}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Add Validation Rules
                </Button>
                <Button 
                  onClick={() => navigate('/deploy')}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Deploy to AWS
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SimpleDashboard;
