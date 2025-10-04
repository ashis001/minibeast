import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';
import { AlertTriangle, Activity, Play, RefreshCw } from 'lucide-react';

interface ValidationRule {
  ID: string;
  VALIDATION_DESCRIPTION: string;
  VALIDATION_QUERY: string;
  OPERATOR: string;
  EXPECTED_OUTCOME: string;
  VALIDATED_BY: string;
  ENTITY: string;
  ITERATION: string;
  IS_ACTIVE: boolean;
  INSERTED_DATE: string;
  UPDATED_DATE: string;
  TEAM: string;
  METRIC_INDEX: number;
}

interface ViewValidationsProps {
  snowflakeConfig: any;
}

const ViewValidations = ({ snowflakeConfig }: ViewValidationsProps) => {
  const { toast } = useToast();
  const [lastRunResult, setLastRunResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Filter states
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [selectedDescriptions, setSelectedDescriptions] = useState<string[]>([]);
  const [entitySelectAll, setEntitySelectAll] = useState(true);
  const [descriptionSelectAll, setDescriptionSelectAll] = useState(true);
  
  // Data states
  const [entities, setEntities] = useState<string[]>([]);
  const [descriptions, setDescriptions] = useState<string[]>([]);
  const [validations, setValidations] = useState<ValidationRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Selection states for activation/deactivation
  const [selectedValidations, setSelectedValidations] = useState<string[]>([]);

  // Load entities on component mount
  useEffect(() => {
    if (snowflakeConfig) {
      loadEntities();
    }
  }, [snowflakeConfig]);

  // Load descriptions when entities change
  useEffect(() => {
    if (selectedEntities.length > 0) {
      loadDescriptions();
    } else {
      setDescriptions([]);
      setValidations([]);
    }
  }, [selectedEntities]);

  // Load validations when descriptions change
  useEffect(() => {
    if (selectedEntities.length > 0 && selectedDescriptions.length > 0) {
      loadValidations();
    } else {
      setValidations([]);
    }
  }, [selectedDescriptions]);

  const loadEntities = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3002/api/snowflake/entities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(snowflakeConfig),
      });

      const data = await response.json();
      if (data.success) {
        setEntities(data.entities);
        setSelectedEntities(data.entities); // Select all by default
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Failed to load entities from Snowflake",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const loadDescriptions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3002/api/snowflake/descriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...snowflakeConfig,
          entities: selectedEntities
        }),
      });

      const data = await response.json();
      if (data.success) {
        setDescriptions(data.descriptions);
        setSelectedDescriptions(data.descriptions); // Select all by default
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Failed to load descriptions from Snowflake",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const loadValidations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3002/api/snowflake/validations-filtered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...snowflakeConfig,
          entities: selectedEntities,
          descriptions: selectedDescriptions
        }),
      });

      const data = await response.json();
      if (data.success) {
        setValidations(data.validations);
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Failed to load validations from Snowflake",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const saveActivationChanges = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:3002/api/snowflake/update-validations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snowflakeConfig,
          selectedValidationIds: selectedValidations
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: data.message,
        });
        // Reload validations to show updated IS_ACTIVE status
        loadValidations();
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Failed to update validations in Snowflake",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const runValidations = async () => {
    setIsRunning(true);
    try {
      // Execute Step Function using saved deployment details
      const validationResponse = await fetch('http://localhost:3002/api/stepfunction/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const validationData = await validationResponse.json();
      
      if (validationResponse.ok && validationData.success) {
        setLastRunResult(validationData);
        toast({
          title: "Validations Started",
          description: `Step Function execution started successfully. Execution ARN: ${validationData.executionArn}`,
        });
      } else {
        toast({
          title: "Validation Run Failed",
          description: validationData.message || `API returned status ${validationResponse.status}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: `Could not connect to Step Function: ${error.message}`,
        variant: "destructive",
      });
    }
    setIsRunning(false);
  };

  if (!snowflakeConfig) {
    return (
      <div className="text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-semibold">Snowflake Configuration Required</h2>
        <p className="text-muted-foreground">
          Please configure Snowflake connection settings before viewing validations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Validation Rules</h2>
        <p className="text-muted-foreground mt-2">View and manage your data validation rules</p>
      </div>

      {/* Filters Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Entity Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Filter by Entity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={entitySelectAll}
                onChange={(e) => {
                  setEntitySelectAll(e.target.checked);
                  setSelectedEntities(e.target.checked ? entities : []);
                }}
              />
              <label className="text-sm font-medium">Select All</label>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {entities.map((entity) => (
                <div key={entity} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedEntities.includes(entity)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEntities([...selectedEntities, entity]);
                      } else {
                        setSelectedEntities(selectedEntities.filter(e => e !== entity));
                      }
                    }}
                  />
                  <label className="text-xs">{entity}</label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Description Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Filter by Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={descriptionSelectAll}
                onChange={(e) => {
                  setDescriptionSelectAll(e.target.checked);
                  setSelectedDescriptions(e.target.checked ? descriptions : []);
                }}
              />
              <label className="text-sm font-medium">Select All</label>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {descriptions.map((desc) => (
                <div key={desc} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedDescriptions.includes(desc)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDescriptions([...selectedDescriptions, desc]);
                      } else {
                        setSelectedDescriptions(selectedDescriptions.filter(d => d !== desc));
                      }
                    }}
                  />
                  <label className="text-xs">{desc}</label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={saveActivationChanges} 
              disabled={isSaving || selectedValidations.length === 0}
              className="w-full"
            >
              {isSaving ? 'Saving...' : 'Activate Selected'}
            </Button>
            <Button 
              onClick={runValidations} 
              disabled={isRunning}
              className="w-full flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Validations
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Validations Table */}
      {validations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Rules ({validations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-2 text-left">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedValidations(validations.map(v => v.ID));
                          } else {
                            setSelectedValidations([]);
                          }
                        }}
                      />
                    </th>
                    <th className="border border-gray-300 p-2 text-left">Active</th>
                    <th className="border border-gray-300 p-2 text-left">Description</th>
                    <th className="border border-gray-300 p-2 text-left">Entity</th>
                    <th className="border border-gray-300 p-2 text-left">Operator</th>
                    <th className="border border-gray-300 p-2 text-left">Expected</th>
                    <th className="border border-gray-300 p-2 text-left">Validated By</th>
                    <th className="border border-gray-300 p-2 text-left">Team</th>
                  </tr>
                </thead>
                <tbody>
                  {validations.map((validation) => (
                    <tr key={validation.ID} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-2">
                        <input
                          type="checkbox"
                          checked={selectedValidations.includes(validation.ID)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedValidations([...selectedValidations, validation.ID]);
                            } else {
                              setSelectedValidations(selectedValidations.filter(id => id !== validation.ID));
                            }
                          }}
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <span className={`px-2 py-1 rounded text-xs ${validation.IS_ACTIVE ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {validation.IS_ACTIVE ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="border border-gray-300 p-2 text-sm">{validation.VALIDATION_DESCRIPTION}</td>
                      <td className="border border-gray-300 p-2 text-sm">{validation.ENTITY}</td>
                      <td className="border border-gray-300 p-2 text-sm">{validation.OPERATOR}</td>
                      <td className="border border-gray-300 p-2 text-sm">{validation.EXPECTED_OUTCOME}</td>
                      <td className="border border-gray-300 p-2 text-sm">{validation.VALIDATED_BY}</td>
                      <td className="border border-gray-300 p-2 text-sm">{validation.TEAM}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {lastRunResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Last Validation Run Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Status:</strong> {lastRunResult.message || 'Completed'}</p>
              <p><strong>Execution ARN:</strong> {lastRunResult.executionArn}</p>
              <p><strong>Start Date:</strong> {lastRunResult.startDate}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      )}
    </div>
  );
};

export default ViewValidations;
