import { Activity, Cloud, Database } from "lucide-react";

const Header = () => {
  return (
    <header className="border-b border-border bg-gradient-card backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
                <Cloud className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-accent animate-pulse-glow">
                <Activity className="h-3 w-3 text-accent-foreground m-0.5" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                DeployForge
              </h1>
              <p className="text-sm text-muted-foreground">Industrial ECS Deployment Platform</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4" />
              <span>Enterprise Ready</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-sm">
              <span className="text-accent">●</span> Live
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;