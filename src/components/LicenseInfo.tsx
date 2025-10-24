import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Shield, Calendar, Users } from 'lucide-react';

export default function LicenseInfo() {
  const { user } = useAuth();

  if (!user || !user.license) return null;

  const { license, organization } = user;
  
  // Calculate days remaining
  const expiresAt = new Date(license.expires_at);
  const today = new Date();
  const daysRemaining = Math.floor((expiresAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  const isExpiringSoon = daysRemaining <= 7;
  const isExpired = daysRemaining < 0;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-400" />
          <h3 className="font-semibold text-white">License Information</h3>
        </div>
        <Badge variant={license.type === 'trial' ? 'secondary' : 'default'}>
          {license.type.toUpperCase()}
        </Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-slate-300">
          <Calendar className="h-4 w-4" />
          <span>
            {isExpired ? (
              <span className="text-red-400 font-semibold">Expired {Math.abs(daysRemaining)} days ago</span>
            ) : (
              <>
                <span className={isExpiringSoon ? 'text-orange-400 font-semibold' : ''}>
                  {daysRemaining} days remaining
                </span>
                {isExpiringSoon && ' ⚠️'}
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-300">
          <Users className="h-4 w-4" />
          <span>Organization: {organization.name}</span>
        </div>

        {license.features && license.features.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <p className="text-xs text-slate-400 mb-2">Enabled Features:</p>
            <div className="flex flex-wrap gap-2">
              {license.features.map((feature: string) => (
                <Badge key={feature} variant="outline" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
