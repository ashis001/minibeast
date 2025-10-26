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
  const [isCheckingRequirements, setIsCheckingRequirements] = useState(true);
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

  // Auto-check requirements and create table if needed on component mount
  useEffect(() => {
    if (snowflakeConfig) {
      checkAndCreateTable();
    }
  }, [snowflakeConfig]);

  const checkAndCreateTable = async () => {
    setIsCheckingRequirements(true);
    
    // First, check if table exists
    await loadAvailableTables();
    
    // If table doesn't exist, create it automatically
    if (!configTableExists) {
      await createConfigTable();
    }
    
    setIsCheckingRequirements(false);
  };

  const loadAvailableTables = async () => {
    if (!snowflakeConfig) return;
    
    setIsLoadingTables(true);
    try {
      const response = await fetch('/api/snowflake/tables', {
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
        const tableExists = configTable?.exists || false;
        setConfigTableExists(tableExists);
        if (tableExists) {
          setIsConfigTableLocked(true);
        }
        return tableExists;
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
      return false;
    }
    setIsLoadingTables(false);
    return false;
  };

  const createConfigTable = async () => {
    if (!snowflakeConfig) return;
    
    setIsCreatingConfigTable(true);
    try {
      const response = await fetch('/api/snowflake/create-config-table', {
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
        // Silent success - no toast needed for automatic creation
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
      const response = await fetch('/api/snowflake/insert-validation', {
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

  // Show loading animation while checking requirements
  if (isCheckingRequirements) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-brand-green200 border-t-brand-green rounded-full animate-spin"></div>
          <CheckCircle className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-brand-green" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-foreground">Checking all requirements...</h3>
          <p className="text-muted-foreground">
            Verifying database configuration and validating table structure
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Add Validation Case</h2>
        <p className="text-muted-foreground mt-2">
          Define validation rules for your data quality checks
        </p>
      </div>

      {/* Validation Case Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Validation Details
          </CardTitle>
          <CardDescription>
            Enter the details for your data validation test case
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
              showSuccess && "bg-brand-green hover:bg-brand-green"
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
