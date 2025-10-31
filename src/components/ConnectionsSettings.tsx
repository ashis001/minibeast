import React, { useState } from "react";
import { Cloud, Database, Server, Workflow, Lock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import ConfigurationStep from './ConfigurationStep';

interface ConnectionCategory {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  services: ServiceCard[];
}

interface ServiceCard {
  id: string;
  name: string;
  logo: string;
  isActive: boolean;
  comingSoon: boolean;
  color: string;
}

const ConnectionsSettings = () => {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const handleConnectionsSaved = () => {
    window.dispatchEvent(new Event('connectionsUpdated'));
    setShowConfigModal(false);
    setSelectedService(null);
  };

  const categories: ConnectionCategory[] = [
    {
      id: 'cloud',
      title: 'Cloud Platforms',
      description: 'Infrastructure and compute services',
      icon: Cloud,
      color: 'blue',
      services: [
        { id: 'aws', name: 'Amazon Web Services', logo: '☁️', isActive: true, comingSoon: false, color: 'orange' },
        { id: 'gcp', name: 'Google Cloud Platform', logo: '🌐', isActive: false, comingSoon: true, color: 'blue' },
        { id: 'azure', name: 'Microsoft Azure', logo: '⚡', isActive: false, comingSoon: true, color: 'cyan' },
      ]
    },
    {
      id: 'oltp',
      title: 'OLTP Databases',
      description: 'Transactional database systems',
      icon: Database,
      color: 'green',
      services: [
        { id: 'mysql', name: 'MySQL', logo: '🐬', isActive: true, comingSoon: false, color: 'blue' },
        { id: 'postgresql', name: 'PostgreSQL', logo: '🐘', isActive: true, comingSoon: false, color: 'indigo' },
        { id: 'oracle', name: 'Oracle Database', logo: '🔴', isActive: false, comingSoon: true, color: 'red' },
        { id: 'sqlserver', name: 'SQL Server', logo: '🗄️', isActive: false, comingSoon: true, color: 'red' },
      ]
    },
    {
      id: 'olap',
      title: 'OLAP / Data Warehouses',
      description: 'Analytics and data warehouse platforms',
      icon: Server,
      color: 'purple',
      services: [
        { id: 'snowflake', name: 'Snowflake', logo: '❄️', isActive: true, comingSoon: false, color: 'cyan' },
        { id: 'bigquery', name: 'Google BigQuery', logo: '📊', isActive: true, comingSoon: false, color: 'blue' },
        { id: 'redshift', name: 'Amazon Redshift', logo: '📈', isActive: false, comingSoon: true, color: 'red' },
        { id: 'databricks', name: 'Databricks', logo: '🧱', isActive: false, comingSoon: true, color: 'orange' },
      ]
    },
    {
      id: 'etl',
      title: 'ETL / Data Pipeline',
      description: 'Data transformation and orchestration tools',
      icon: Workflow,
      color: 'amber',
      services: [
        { id: 'dbt', name: 'dbt (Data Build Tool)', logo: '🛠️', isActive: false, comingSoon: true, color: 'orange' },
      ]
    },
  ];

  const handleServiceClick = (service: ServiceCard) => {
    if (!service.isActive) return;
    setSelectedService(service.id);
    setShowConfigModal(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
          <Database className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white">Connection Hub</h1>
          <p className="text-slate-400 mt-1 text-lg">Configure your data infrastructure connections</p>
        </div>
      </div>

      {/* Categories */}
      {categories.map((category) => (
        <div key={category.id} className="space-y-4">
          {/* Category Header */}
          <div className="flex items-center gap-3 pb-2 border-b border-slate-700">
            <div className={`w-10 h-10 bg-${category.color}-500/20 rounded-lg flex items-center justify-center`}>
              <category.icon className={`h-5 w-5 text-${category.color}-400`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{category.title}</h2>
              <p className="text-sm text-slate-400">{category.description}</p>
            </div>
          </div>

          {/* Service Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {category.services.map((service) => (
              <Card
                key={service.id}
                onClick={() => handleServiceClick(service)}
                className={`relative transition-all duration-300 ${
                  service.isActive
                    ? `bg-gradient-to-br from-${service.color}-900/20 to-slate-900 border-${service.color}-500/30 hover:border-${service.color}-500/60 hover:scale-105 cursor-pointer shadow-lg hover:shadow-${service.color}-500/20`
                    : 'bg-slate-800/30 border-slate-700/50 opacity-50 cursor-not-allowed'
                }`}
              >
                <CardContent className="p-6">
                  {/* Status Badge */}
                  {service.isActive && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-brand-green/100/20 text-brand-green/80 border-brand-green/100/30 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  )}
                  {service.comingSoon && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-slate-600/20 text-slate-400 border-slate-500/30 text-xs">
                        <Lock className="h-3 w-3 mr-1" />
                        Soon
                      </Badge>
                    </div>
                  )}

                  {/* Logo */}
                  <div className="text-center mb-4">
                    <div className={`text-5xl mb-3 ${
                      service.isActive ? 'opacity-100' : 'opacity-40 grayscale'
                    }`}>
                      {service.logo}
                    </div>
                    <h3 className={`font-semibold text-lg ${
                      service.isActive ? 'text-white' : 'text-slate-500'
                    }`}>
                      {service.name}
                    </h3>
                  </div>

                  {/* Action */}
                  {service.isActive && (
                    <div className="text-center">
                      <span className={`text-sm text-${service.color}-400 font-medium`}>
                        Click to configure →
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Database className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Configure {selectedService === 'aws' ? 'AWS' : selectedService === 'snowflake' ? 'Snowflake' : selectedService === 'mysql' ? 'MySQL' : selectedService === 'postgresql' ? 'PostgreSQL' : selectedService === 'bigquery' ? 'BigQuery' : selectedService?.toUpperCase()}
                  </h2>
                  <p className="text-slate-400 text-sm">Set up your connection credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white transition-colors p-2"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <ConfigurationStep onNext={handleConnectionsSaved} selectedService={selectedService} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionsSettings;
