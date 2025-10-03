import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import ValidationStep from "../components/ValidationStep";
import { SnowflakeConfig } from "../types";

const AddValidation = () => {
  const [snowflakeConfig, setSnowflakeConfig] = useState<SnowflakeConfig | null>(null);

  // Load Snowflake config from localStorage or previous configuration
  useEffect(() => {
    // Try to get Snowflake config from localStorage or API
    const savedConfig = localStorage.getItem('snowflakeConfig');
    if (savedConfig) {
      try {
        setSnowflakeConfig(JSON.parse(savedConfig));
      } catch (error) {
        console.error('Failed to parse saved Snowflake config:', error);
      }
    }
  }, []);

  const handleValidationComplete = () => {
    // Navigate back to dashboard or show success message
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <ValidationStep 
            onNext={handleValidationComplete} 
            snowflakeConfig={snowflakeConfig} 
          />
        </div>
      </main>
    </div>
  );
};

export default AddValidation;
