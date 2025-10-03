import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Database, Table, CheckCircle, Lock, Edit, Plus, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { SnowflakeConfig } from "@/types";

interface ValidationStepProps {
  onNext: () => void;
  snowflakeConfig: SnowflakeConfig | null;
}

interface ValidationCase {
  validation_description: string;
  validation_query: string;
  operator: string;
  expected_outcome: string;
  validated_by: string;
  entity: string;
  iteration: string;
  team: string;
  metric_index: number;
}

interface TableInfo {
  name: string;
  exists: boolean;
}

const ValidationStep = ({ onNext, snowflakeConfig }: ValidationStepProps) => {
  const { toast } = useToast();
  
  // Step states
  const [availableTables, setAvailableTables] = useState<TableInfo[]>([]);
  const [configTableExists, setConfigTableExists] = useState(false);
  const [isConfigTableLocked, setIsConfigTableLocked] = useState(false);
  
  // Loading states
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isSubmittingValidation, setIsSubmittingValidation] = useState(false);
  const [isCreatingConfigTable, setIsCreatingConfigTable] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Form data
  const [validationCase, setValidationCase] = useState<ValidationCase>({
    validation_description: "",
    validation_query: "",
    operator: "=",
    expected_outcome: "",
    validated_by: "",
    entity: "",
    iteration: "1",
    team: "",
    metric_index: 1
  });

  // Load available tables on component mount
  useEffect(() => {
    if (snowflakeConfig) {
      loadAvailableTables();
    }
  }, [snowflakeConfig]);

  const loadAvailableTables = async () => {
    if (!snowflakeConfig) return;
    
    setIsLoadingTables(true);
    try {
      const response = await fetch('http://localhost:3002/api/snowflake/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(snowflakeConfig),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setAvailableTables(data.tables || []);
        
        // Check if TBL_VALIDATING_TEST_CASES exists
        const configTable = data.tables.find((table: TableInfo) => 
          table.name === 'TBL_VALIDATING_TEST_CASES'
        );
        setConfigTableExists(configTable?.exists || false);
        if (configTable?.exists) {
          setIsConfigTableLocked(true);
        }
      } else {
        toast({
          title: "Failed to Load Tables",
          description: data.message || "Could not connect to Snowflake",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Could not connect to Snowflake database",
        variant: "destructive",
      });
    }
    setIsLoadingTables(false);
  };

  const createConfigTable = async () => {
    if (!snowflakeConfig) return;
    
    setIsCreatingConfigTable(true);
    try {
      const response = await fetch('http://localhost:3002/api/snowflake/create-config-table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(snowflakeConfig),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setConfigTableExists(true);
        setIsConfigTableLocked(true);
        toast({
          title: "Config Table Created",
          description: "TBL_VALIDATING_TEST_CASES table created successfully",
        });
      } else {
        toast({
          title: "Failed to Create Table",
          description: data.message || "Could not create config table",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Creation Error",
        description: "Could not create config table",
        variant: "destructive",
      });
    }
    setIsCreatingConfigTable(false);
  };

  const handleConfigTableEdit = () => {
    setIsConfigTableLocked(false);
    setConfigTableExists(false);
  };

  const handleSubmitValidation = async () => {
    if (!snowflakeConfig || !configTableExists) return;
    
    // Validate required fields
    const requiredFields = ['validation_description', 'validation_query', 'expected_outcome', 'validated_by', 'entity', 'team'];
    const missingFields = requiredFields.filter(field => !validationCase[field as keyof ValidationCase]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingValidation(true);
    try {
      const response = await fetch('http://localhost:3002/api/snowflake/insert-validation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...snowflakeConfig,
          validationCase: {
            ...validationCase,
            validation_query: validationCase.validation_query
          }
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        // Show success state on button
        setShowSuccess(true);
        
        // Show success toast with checkmark
        toast({
          title: "✅ Success!",
          description: "Validation case added successfully. You can add another one.",
          duration: 4000,
        });
        
        // Reset form for next entry after a short delay
        setTimeout(() => {
          setValidationCase({
            validation_description: "",
            validation_query: "",
            operator: "=",
            expected_outcome: "",
            validated_by: "",
            entity: "",
            iteration: "1",
            team: "",
            metric_index: 1
          });
          setShowSuccess(false);
        }, 2000);
      } else {
        toast({
          title: "Failed to Insert",
          description: data.message || "Could not insert validation case",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Insertion Error",
        description: "Could not insert validation case",
        variant: "destructive",
      });
    }
    setIsSubmittingValidation(false);
  };

  const updateValidationCase = (field: keyof ValidationCase, value: string | number) => {
    setValidationCase(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const canProceedToForm = configTableExists && isConfigTableLocked;

  if (!snowflakeConfig) {
    return (
      <div className="text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-semibold">Snowflake Configuration Required</h2>
        <p className="text-muted-foreground">
          Please configure Snowflake connection settings before proceeding with validation setup.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Validation Configuration</h2>
        <p className="text-muted-foreground mt-2">
          Set up validation test cases for your Snowflake data
        </p>
      </div>

      {/* Step 1: Validation Config Table Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Step 1: Validation Config Table
            {isConfigTableLocked && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <Lock className="h-4 w-4" />
              </div>
            )}
          </CardTitle>
          <CardDescription>
            Create or verify the TBL_VALIDATING_TEST_CASES table in {snowflakeConfig.database}.{snowflakeConfig.schema}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              {configTableExists ? (
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">TBL_VALIDATING_TEST_CASES exists and is ready</span>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={createConfigTable}
                  disabled={isCreatingConfigTable}
                  className="w-full"
                >
                  {isCreatingConfigTable ? (
                    "Creating Config Table..."
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create TBL_VALIDATING_TEST_CASES
                    </>
                  )}
                </Button>
              )}
            </div>
            
            {isConfigTableLocked && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Recreate Config Table?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to recreate the configuration table? This may affect existing validation cases.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfigTableEdit}>
                      Yes, Recreate Table
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Add Validation Cases */}
      <Card className={cn(
        "transition-opacity",
        !canProceedToForm && "opacity-50 pointer-events-none"
      )}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Step 2: Add Validation Case
          </CardTitle>
          <CardDescription>
            Define validation rules for your data quality checks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="validation_description">Validation Description *</Label>
              <Input
                id="validation_description"
                placeholder="e.g., Check record count matches expected"
                value={validationCase.validation_description}
                onChange={(e) => updateValidationCase('validation_description', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="entity">Entity *</Label>
              <Input
                id="entity"
                placeholder="e.g., Customer, Order, Product"
                value={validationCase.entity}
                onChange={(e) => updateValidationCase('entity', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="validated_by">Validated By *</Label>
              <Input
                id="validated_by"
                placeholder="Your name or team"
                value={validationCase.validated_by}
                onChange={(e) => updateValidationCase('validated_by', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="team">Team *</Label>
              <Input
                id="team"
                placeholder="e.g., Data Engineering, QA"
                value={validationCase.team}
                onChange={(e) => updateValidationCase('team', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="operator">Operator</Label>
              <Select
                value={validationCase.operator}
                onValueChange={(value) => updateValidationCase('operator', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="=">=</SelectItem>
                  <SelectItem value="!=">!=</SelectItem>
                  <SelectItem value=">">&gt;</SelectItem>
                  <SelectItem value=">=">&gt;=</SelectItem>
                  <SelectItem value="<">&lt;</SelectItem>
                  <SelectItem value="<=">&lt;=</SelectItem>
                  <SelectItem value="LIKE">LIKE</SelectItem>
                  <SelectItem value="NOT LIKE">NOT LIKE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="expected_outcome">Expected Outcome *</Label>
              <Input
                id="expected_outcome"
                placeholder="e.g., 1000, 'SUCCESS', 0"
                value={validationCase.expected_outcome}
                onChange={(e) => updateValidationCase('expected_outcome', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="iteration">Iteration</Label>
              <Input
                id="iteration"
                placeholder="1"
                value={validationCase.iteration}
                onChange={(e) => updateValidationCase('iteration', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="metric_index">Metric Index</Label>
              <Input
                id="metric_index"
                type="number"
                placeholder="1"
                value={validationCase.metric_index}
                onChange={(e) => updateValidationCase('metric_index', parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="validation_query">Validation Query *</Label>
            <Textarea
              id="validation_query"
              placeholder="SELECT COUNT(*) FROM YOUR_TABLE WHERE condition"
              className="min-h-[100px] font-mono"
              value={validationCase.validation_query}
              onChange={(e) => updateValidationCase('validation_query', e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter your SQL query for data validation
            </p>
          </div>
          
          <Button
            onClick={handleSubmitValidation}
            disabled={isSubmittingValidation || showSuccess || !canProceedToForm}
            className={cn(
              "w-full transition-all duration-300",
              showSuccess && "bg-green-600 hover:bg-green-600"
            )}
            size="lg"
          >
            {showSuccess ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2 animate-pulse" />
                Saved Successfully!
              </>
            ) : isSubmittingValidation ? (
              "Saving to Database..."
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Save Validation Case
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ValidationStep;
