import React from 'react';
import { Database } from 'lucide-react';

interface DatabaseIconProps {
  type: string;
  className?: string;
}

export const DatabaseIcon: React.FC<DatabaseIconProps> = ({ type, className = "w-12 h-12" }) => {
  const getIconColor = (dbType: string) => {
    switch (dbType) {
      case 'Snowflake': return '#29B5E8';
      case 'PostgreSQL': return '#336791';
      case 'MySQL': return '#00758F';
      case 'BigQuery': return '#4285F4';
      case 'Oracle': return '#F80000';
      default: return '#64748b';
    }
  };

  const getIcon = (dbType: string) => {
    const color = getIconColor(dbType);
    
    switch (dbType) {
      case 'Snowflake':
        return (
          <svg className={className} viewBox="0 0 256 256" fill="none">
            <path d="M128 0L256 128L128 256L0 128L128 0Z" fill={color} opacity="0.1"/>
            <path d="M128 32L224 128L128 224L32 128L128 32Z" fill={color}/>
            <path d="M128 64L192 128L128 192L64 128L128 64Z" fill="white"/>
          </svg>
        );
      
      case 'PostgreSQL':
        return (
          <svg className={className} viewBox="0 0 256 256" fill="none">
            <ellipse cx="128" cy="128" rx="96" ry="112" fill={color}/>
            <path d="M128 40C90 40 60 76 60 120C60 164 90 200 128 200C166 200 196 164 196 120C196 76 166 40 128 40Z" fill="white" opacity="0.9"/>
            <text x="128" y="145" fontSize="80" fill={color} textAnchor="middle" fontWeight="bold">P</text>
          </svg>
        );
      
      case 'MySQL':
        return (
          <svg className={className} viewBox="0 0 256 256" fill="none">
            <rect x="32" y="64" width="192" height="128" rx="16" fill={color}/>
            <path d="M64 96H96V160H64V96Z M112 96H144V160H112V96Z M160 96H192V160H160V96Z" fill="white"/>
            <circle cx="80" cy="128" r="8" fill={color}/>
            <circle cx="128" cy="128" r="8" fill={color}/>
            <circle cx="176" cy="128" r="8" fill={color}/>
          </svg>
        );
      
      case 'BigQuery':
        return (
          <svg className={className} viewBox="0 0 256 256" fill="none">
            <path d="M128 20L220 128L128 236L36 128L128 20Z" fill={color}/>
            <path d="M128 60L180 128L128 196L76 128L128 60Z" fill="white"/>
            <path d="M128 90L150 128L128 166L106 128L128 90Z" fill={color}/>
          </svg>
        );
      
      case 'Oracle':
        return (
          <svg className={className} viewBox="0 0 256 256" fill="none">
            <ellipse cx="128" cy="128" rx="100" ry="80" fill={color}/>
            <ellipse cx="128" cy="128" rx="70" ry="50" fill="white"/>
            <text x="128" y="145" fontSize="60" fill={color} textAnchor="middle" fontWeight="bold">O</text>
          </svg>
        );
      
      default:
        return <Database className={className} style={{ color }} />;
    }
  };

  return <div className="flex items-center justify-center">{getIcon(type)}</div>;
};
