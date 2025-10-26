import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { AlertTriangle, Activity, Play, RefreshCw, ChevronDown, Edit, X } from 'lucide-react';

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
  onNavigate?: () => void;
}

interface EditValidationFormProps {
  validation: ValidationRule;
  onUpdate: (validation: ValidationRule) => void;
  onCancel: () => void;
  isUpdating: boolean;
}

const EditValidationForm = ({ validation, onUpdate, onCancel, isUpdating }: EditValidationFormProps) => {
  const [formData, setFormData] = useState<ValidationRule>(validation);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  const handleChange = (field: keyof ValidationRule, value: string | boolean | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Validation Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Validation Description *
          </label>
          <input
            type="text"
            value={formData.VALIDATION_DESCRIPTION}
            onChange={(e) => handleChange('VALIDATION_DESCRIPTION', e.target.value)}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="e.g., Check record count matches expected"
            required
          />
        </div>

        {/* Entity */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Entity *
          </label>
          <input
            type="text"
            value={formData.ENTITY}
            onChange={(e) => handleChange('ENTITY', e.target.value)}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="e.g., Customer, Order, Product"
            required
          />
        </div>

        {/* Validated By */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Validated By *
          </label>
          <input
            type="text"
            value={formData.VALIDATED_BY}
            onChange={(e) => handleChange('VALIDATED_BY', e.target.value)}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Your name or team"
            required
          />
        </div>

        {/* Team */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Team *
          </label>
          <input
            type="text"
            value={formData.TEAM}
            onChange={(e) => handleChange('TEAM', e.target.value)}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="e.g., Data Engineering, QA"
            required
          />
        </div>

        {/* Operator */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Operator
          </label>
          <select
            value={formData.OPERATOR}
            onChange={(e) => handleChange('OPERATOR', e.target.value)}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="=">=</option>
            <option value=">">&gt;</option>
            <option value="<">&lt;</option>
            <option value=">=">&gt;=</option>
            <option value="<=">&lt;=</option>
            <option value="!=">&ne;</option>
          </select>
        </div>

        {/* Expected Outcome */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Expected Outcome *
          </label>
          <input
            type="text"
            value={formData.EXPECTED_OUTCOME}
            onChange={(e) => handleChange('EXPECTED_OUTCOME', e.target.value)}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="e.g., 1000, 'SUCCESS', 0"
            required
          />
        </div>

        {/* Iteration */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Iteration
          </label>
          <input
            type="text"
            value={formData.ITERATION}
            onChange={(e) => handleChange('ITERATION', e.target.value)}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="1"
          />
        </div>

        {/* Metric Index */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Metric Index
          </label>
          <input
            type="number"
            value={formData.METRIC_INDEX}
            onChange={(e) => handleChange('METRIC_INDEX', parseInt(e.target.value) || 0)}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="1"
          />
        </div>
      </div>

      {/* Validation Query */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-300">
          Validation Query *
        </label>
        <textarea
          value={formData.VALIDATION_QUERY}
          onChange={(e) => handleChange('VALIDATION_QUERY', e.target.value)}
          className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-32 resize-none"
          placeholder="SELECT COUNT(*) FROM YOUR_TABLE WHERE condition"
          required
        />
        <p className="text-xs text-gray-400 mt-1">Enter your SQL query for data validation</p>
      </div>

      {/* Active Status */}
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.IS_ACTIVE}
          onChange={(e) => handleChange('IS_ACTIVE', e.target.checked)}
          className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
        />
        <label htmlFor="isActive" className="text-sm font-medium text-gray-300">
          Active
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center pt-6">
        <Button
          type="submit"
          disabled={isUpdating}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center gap-2 min-w-[120px] justify-center"
        >
          {isUpdating ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            'Update'
          )}
        </Button>
      </div>
    </form>
  );
};

const ViewValidations = ({ snowflakeConfig, onNavigate }: ViewValidationsProps) => {
  const { toast } = useToast();
  const [lastRunResult, setLastRunResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Filter states
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [selectedDescriptions, setSelectedDescriptions] = useState<string[]>([]);
  const [entitySelectAll, setEntitySelectAll] = useState(false);
  const [descriptionSelectAll, setDescriptionSelectAll] = useState(false);
  
  // Data states
  const [entities, setEntities] = useState<string[]>([]);
  const [descriptions, setDescriptions] = useState<string[]>([]);
  const [validations, setValidations] = useState<ValidationRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Selection states for activation/deactivation
  const [selectedValidations, setSelectedValidations] = useState<string[]>([]);
  
  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingValidation, setEditingValidation] = useState<ValidationRule | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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
      setSelectedDescriptions([]);
      setDescriptionSelectAll(false);
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
      const response = await fetch('/api/snowflake/entities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(snowflakeConfig),
      });

      const data = await response.json();
      if (data.success) {
        setEntities(data.entities);
        setSelectedEntities(data.entities); // Auto-select all entities
        setEntitySelectAll(true); // Mark select all as checked
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
      const response = await fetch('/api/snowflake/descriptions', {
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
        setSelectedDescriptions(data.descriptions); // Auto-select all descriptions
        setDescriptionSelectAll(true); // Mark select all as checked
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
      const response = await fetch('/api/snowflake/validations-filtered', {
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
      const response = await fetch('/api/snowflake/update-validations', {
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

  const updateValidation = async (updatedValidation: ValidationRule) => {
    setIsUpdating(true);
    try {
      const response = await fetch('/api/snowflake/update-validation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snowflakeConfig,
          validation: updatedValidation
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Update the local state
        setValidations(prev => prev.map(v => 
          v.ID === updatedValidation.ID ? updatedValidation : v
        ));
        
        setIsEditModalOpen(false);
        setEditingValidation(null);
        
        toast({
          title: "Success",
          description: "Validation rule updated successfully",
        });
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
        description: "Failed to update validation rule in Snowflake",
        variant: "destructive",
      });
    }
    setIsUpdating(false);
  };

  const runValidations = async () => {
    setIsRunning(true);
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('access_token');
      
      // Pass validation IDs instead of entities to avoid duplicate entity names
      // This allows filtering by specific validation rules (entity + description combination)
      const validationResponse = await fetch('/api/stepfunction/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          validationIds: selectedValidations
        }),
      });

      const validationData = await validationResponse.json();
      
      if (validationResponse.ok && validationData.success) {
        setLastRunResult(validationData);
        toast({
          title: "Validations Started",
          description: `Step Function execution started successfully. Redirecting to Activity Log...`,
        });
        
        // Redirect to Activity Log after successful start
        setTimeout(() => {
          if (onNavigate) {
            onNavigate();
          }
        }, 1500); // Small delay to show the success message
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
        {/* Entity Filter Dropdown */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Filter by Entity</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {selectedEntities.length === 0 
                  ? "Select entities..." 
                  : `${selectedEntities.length} selected`
                }
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-64 overflow-y-auto"
              onCloseAutoFocus={(e) => e.preventDefault()}
              sideOffset={4}
            >
              <DropdownMenuCheckboxItem
                checked={entitySelectAll}
                onCheckedChange={(checked) => {
                  setEntitySelectAll(checked);
                  setSelectedEntities(checked ? entities : []);
                }}
                onSelect={(e) => e.preventDefault()}
              >
                Select All
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {entities.map((entity) => (
                <DropdownMenuCheckboxItem
                  key={entity}
                  checked={selectedEntities.includes(entity)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      const newSelected = [...selectedEntities, entity];
                      setSelectedEntities(newSelected);
                      if (newSelected.length === entities.length) {
                        setEntitySelectAll(true);
                      }
                    } else {
                      setSelectedEntities(selectedEntities.filter(e => e !== entity));
                      setEntitySelectAll(false);
                    }
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  {entity}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description Filter Dropdown */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Filter by Description</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {selectedDescriptions.length === 0 
                  ? "Select descriptions..." 
                  : `${selectedDescriptions.length} selected`
                }
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-64 overflow-y-auto"
              align="start"
              onCloseAutoFocus={(e) => e.preventDefault()}
              sideOffset={4}
            >
              <DropdownMenuCheckboxItem
                checked={descriptionSelectAll}
                onCheckedChange={(checked) => {
                  setDescriptionSelectAll(checked);
                  setSelectedDescriptions(checked ? descriptions : []);
                }}
                onSelect={(e) => e.preventDefault()}
              >
                Select All
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {descriptions.map((desc) => (
                <DropdownMenuCheckboxItem
                  key={desc}
                  checked={selectedDescriptions.includes(desc)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      const newSelected = [...selectedDescriptions, desc];
                      setSelectedDescriptions(newSelected);
                      if (newSelected.length === descriptions.length) {
                        setDescriptionSelectAll(true);
                      }
                    } else {
                      setSelectedDescriptions(selectedDescriptions.filter(d => d !== desc));
                      setDescriptionSelectAll(false);
                    }
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  <span className="text-sm">{desc}</span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Run Validations Button */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Actions</label>
          <Button 
            onClick={runValidations} 
            disabled={isRunning || selectedValidations.length === 0}
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
        </div>
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
                  <tr className="bg-black">
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
                    <th className="border border-gray-300 p-2 text-left text-white">Entity</th>
                    <th className="border border-gray-300 p-2 text-left text-white">Description</th>
                    <th className="border border-gray-300 p-2 text-left text-white">Active</th>
                    <th className="border border-gray-300 p-2 text-left text-white">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {validations.map((validation) => (
                    <tr key={validation.ID}>
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
                      <td className="border border-gray-300 p-2 text-sm">{validation.ENTITY}</td>
                      <td className="border border-gray-300 p-2 text-sm">{validation.VALIDATION_DESCRIPTION}</td>
                      <td className="border border-gray-300 p-2">
                        <span className={`px-2 py-1 rounded text-xs ${validation.IS_ACTIVE ? 'bg-brand-green/20 text-brand-green' : 'bg-gray-100 text-gray-800'}`}>
                          {validation.IS_ACTIVE ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="border border-gray-300 p-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingValidation(validation);
                            setIsEditModalOpen(true);
                          }}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                      </td>
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

      {/* Edit Modal */}
      {isEditModalOpen && editingValidation && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Edit Validation Rule</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingValidation(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <EditValidationForm
              validation={editingValidation}
              onUpdate={updateValidation}
              onCancel={() => {
                setIsEditModalOpen(false);
                setEditingValidation(null);
              }}
              isUpdating={isUpdating}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewValidations;
