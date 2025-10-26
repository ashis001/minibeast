# Role-Based Access Control Implementation

## User Roles & Permissions

### 1. **ADMIN**
- **Description**: System administrator
- **Access**: Auth portal only (NOT MiniBeast)
- **Purpose**: Manage organizations, users, licenses

### 2. **DEVELOPER**
- **Description**: Full development access
- **MiniBeast Modules**:
  - ✅ Dashboard
  - ✅ Validator
  - ✅ Reconciliator
  - ✅ Config
  - ✅ Migrator
- **Purpose**: Complete access to all features

### 3. **TESTER**
- **Description**: Testing and validation access
- **MiniBeast Modules**:
  - ✅ Dashboard
  - ✅ Validator
  - ✅ Reconciliator
  - ❌ Config
  - ❌ Migrator
- **Purpose**: Run validations, view results, perform reconciliation

### 4. **OPS**
- **Description**: Operations monitoring access
- **MiniBeast Modules**:
  - ✅ Dashboard
  - ✅ Validator
  - ❌ Reconciliator
  - ❌ Config
  - ❌ Migrator
- **Purpose**: Monitor validators and dashboards only

## Implementation

### Backend (Auth Server)

1. **Updated UserRole enum** (`app/models/user.py`):
   ```python
   class UserRole(str, enum.Enum):
       ADMIN = "admin"
       DEVELOPER = "developer"
       TESTER = "tester"
       OPS = "ops"
   ```

2. **Created permissions module** (`app/core/permissions.py`):
   - Defines module access for each role
   - Functions: `get_user_permissions()`, `can_access_module()`

3. **Updated login endpoint** (`app/api/auth.py`):
   - Returns `permissions` in user object
   - Format: `{"modules": ["dashboard", "validator", ...], "description": "..."}`

### Frontend (MiniBeast)

Implement in your MiniBeast app:

```typescript
// src/utils/permissions.ts
export const canAccessModule = (userPermissions: string[], module: string): boolean => {
  return userPermissions.includes(module.toLowerCase());
};

// In your navigation/menu component
import { useAuth } from './contexts/AuthContext';
import { canAccessModule } from './utils/permissions';

function Navigation() {
  const { user } = useAuth();
  const permissions = user?.permissions?.modules || [];

  return (
    <nav>
      {/* Dashboard - All roles except ADMIN */}
      {canAccessModule(permissions, 'dashboard') && (
        <Link to="/dashboard">Dashboard</Link>
      )}

      {/* Validator - All roles except ADMIN */}
      {canAccessModule(permissions, 'validator') && (
        <Link to="/validator">Validator</Link>
      )}

      {/* Reconciliator - DEVELOPER and TESTER only */}
      {canAccessModule(permissions, 'reconciliator') && (
        <Link to="/reconciliator">Reconciliator</Link>
      )}

      {/* Config - DEVELOPER only */}
      {canAccessModule(permissions, 'config') && (
        <Link to="/config">Config</Link>
      )}

      {/* Migrator - DEVELOPER only */}
      {canAccessModule(permissions, 'migrator') && (
        <Link to="/migrator">Migrator</Link>
      )}
    </nav>
  );
}
```

### Route Protection

```typescript
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canAccessModule } from '../utils/permissions';

interface Props {
  module: string;
  children: React.ReactNode;
}

export const ModuleProtectedRoute: React.FC<Props> = ({ module, children }) => {
  const { user } = useAuth();
  const permissions = user?.permissions?.modules || [];

  if (!canAccessModule(permissions, module)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// Usage in routes
<Route 
  path="/config" 
  element={
    <ModuleProtectedRoute module="config">
      <ConfigPage />
    </ModuleProtectedRoute>
  } 
/>
```

## Testing

### Create Test Users

```sql
-- Developer user
INSERT INTO users (email, password_hash, full_name, role, organization_id)
VALUES ('dev@test.com', '<hash>', 'Dev User', 'developer', '<org_id>');

-- Tester user
INSERT INTO users (email, password_hash, full_name, role, organization_id)
VALUES ('tester@test.com', '<hash>', 'Tester User', 'tester', '<org_id>');

-- Ops user
INSERT INTO users (email, password_hash, full_name, role, organization_id)
VALUES ('ops@test.com', '<hash>', 'Ops User', 'ops', '<org_id>');
```

### Test Matrix

| Role      | Dashboard | Validator | Reconciliator | Config | Migrator |
|-----------|-----------|-----------|---------------|--------|----------|
| ADMIN     | ❌        | ❌        | ❌            | ❌     | ❌       |
| DEVELOPER | ✅        | ✅        | ✅            | ✅     | ✅       |
| TESTER    | ✅        | ✅        | ✅            | ❌     | ❌       |
| OPS       | ✅        | ✅        | ❌            | ❌     | ❌       |

## Migration

Run migration to update existing users:
```bash
docker exec auth-backend alembic upgrade head
```

Default behavior: All existing `user` and `viewer` roles → `developer`
