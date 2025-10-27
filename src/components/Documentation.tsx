import React from 'react';
import { X, Shield, Database, GitBranch, CheckCircle, Zap, Lock, Cloud, Server, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentationProps {
  onClose: () => void;
}

export const Documentation: React.FC<DocumentationProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-green/20 to-blue-600/20 border-b border-slate-700 p-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white mb-2">MiniBeast Documentation</h1>
            <p className="text-slate-300">Enterprise Data Validation & Migration Platform</p>
          </div>
          <Button 
            onClick={onClose}
            variant="ghost" 
            size="icon"
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-100px)] p-8 space-y-8">
          {/* Overview */}
          <section className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="h-6 w-6 text-brand-green" />
              Platform Overview
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              MiniBeast is an enterprise-grade data validation and migration platform designed to streamline data operations 
              between AWS and Snowflake. Built with cutting-edge technology, it provides high-performance, scalable solutions 
              for modern data teams.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                <div className="text-brand-green font-bold text-2xl mb-1">10x</div>
                <div className="text-slate-400 text-sm">Faster</div>
              </div>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                <div className="text-brand-green font-bold text-2xl mb-1">50%</div>
                <div className="text-slate-400 text-sm">Lower Memory Usage</div>
              </div>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                <div className="text-brand-green font-bold text-2xl mb-1">&lt;100ms</div>
                <div className="text-slate-400 text-sm">Response Times</div>
              </div>
            </div>
          </section>

          {/* Core Modules */}
          <section className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Database className="h-6 w-6 text-brand-green" />
              Core Modules
            </h2>
            
            <div className="space-y-6">
              {/* Validator */}
              <div className="bg-slate-900 p-5 rounded-lg border border-slate-700">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-brand-green/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-brand-green" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">Validator Module</h3>
                    <p className="text-slate-300 mb-3">
                      Advanced data quality validation engine that ensures data integrity across your pipelines.
                    </p>
                    <ul className="space-y-2 text-slate-400 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-brand-green mt-1">✓</span>
                        <span>Real-time data validation with custom rules</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-brand-green mt-1">✓</span>
                        <span>Schema validation and type checking</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-brand-green mt-1">✓</span>
                        <span>Business rule validation and constraints</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-brand-green mt-1">✓</span>
                        <span>Detailed validation reports and logging</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Migrator */}
              <div className="bg-slate-900 p-5 rounded-lg border border-slate-700">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <GitBranch className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">Migrator Module</h3>
                    <p className="text-slate-300 mb-3">
                      Seamless data migration between AWS S3 and Snowflake with transformation capabilities.
                    </p>
                    <ul className="space-y-2 text-slate-400 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-brand-green mt-1">✓</span>
                        <span>High-performance bulk data transfers</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-brand-green mt-1">✓</span>
                        <span>Data transformation during migration</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-brand-green mt-1">✓</span>
                        <span>Incremental and full load support</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-brand-green mt-1">✓</span>
                        <span>Error handling and retry mechanisms</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Reconciliator */}
              <div className="bg-slate-900 p-5 rounded-lg border border-slate-700">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Activity className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">Reconciliator Module</h3>
                    <p className="text-slate-300 mb-3">
                      Automated data reconciliation to ensure consistency between source and target systems.
                    </p>
                    <ul className="space-y-2 text-slate-400 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-brand-green mt-1">✓</span>
                        <span>Row count and sum reconciliation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-brand-green mt-1">✓</span>
                        <span>Column-level data comparison</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-brand-green mt-1">✓</span>
                        <span>Discrepancy detection and reporting</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-brand-green mt-1">✓</span>
                        <span>Scheduled reconciliation jobs</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>


          {/* Deployment */}
          <section className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Cloud className="h-6 w-6 text-brand-green" />
              Deployment Process
            </h2>
            
            <div className="space-y-4">
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-brand-green/20 rounded-full flex items-center justify-center">
                    <span className="text-brand-green font-bold text-sm">1</span>
                  </div>
                  <h4 className="font-bold text-white">Configure Connections</h4>
                </div>
                <p className="text-slate-400 text-sm ml-11">
                  Set up AWS and Snowflake credentials. Test connections to ensure proper configuration.
                </p>
              </div>
              
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-brand-green/20 rounded-full flex items-center justify-center">
                    <span className="text-brand-green font-bold text-sm">2</span>
                  </div>
                  <h4 className="font-bold text-white">Select Module</h4>
                </div>
                <p className="text-slate-400 text-sm ml-11">
                  Choose Validator, Migrator, or Reconciliator based on your requirements.
                </p>
              </div>
              
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-brand-green/20 rounded-full flex items-center justify-center">
                    <span className="text-brand-green font-bold text-sm">3</span>
                  </div>
                  <h4 className="font-bold text-white">Configure Deployment</h4>
                </div>
                <p className="text-slate-400 text-sm ml-11">
                  Set module parameters, AWS resources (ECS, Step Functions, API Gateway).
                </p>
              </div>
              
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-brand-green/20 rounded-full flex items-center justify-center">
                    <span className="text-brand-green font-bold text-sm">4</span>
                  </div>
                  <h4 className="font-bold text-white">Deploy & Monitor</h4>
                </div>
                <p className="text-slate-400 text-sm ml-11">
                  Deploy to AWS infrastructure and monitor real-time execution through dashboard.
                </p>
              </div>
            </div>
          </section>

          {/* Support */}
          <section className="bg-gradient-to-r from-brand-green/10 to-blue-600/10 rounded-xl p-6 border border-brand-green/30">
            <h2 className="text-2xl font-bold text-white mb-4">Need Help?</h2>
            <p className="text-slate-300 mb-4">
              Our team is here to support your data operations journey.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="text-sm">
                <span className="text-slate-400">Email:</span>{' '}
                <span className="text-brand-green font-medium">support@dataction.com</span>
              </div>
              <div className="text-sm">
                <span className="text-slate-400">Product:</span>{' '}
                <span className="text-white font-medium">MiniBeast by DataAction</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
