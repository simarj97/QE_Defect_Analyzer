import { createHash, randomBytes } from 'node:crypto';

export const ROLES = {
  ADMIN: 'Admin',
  QA_LEAD: 'QA Lead',
  QA_ENGINEER: 'QA Engineer',
  VIEWER: 'Viewer'
};

export const PERMISSIONS = {
  PROJECT_CREATE: 'project:create',
  PROJECT_DELETE: 'project:delete',
  REQUIREMENT_EDIT: 'requirement:edit',
  AI_GENERATE: 'ai:generate',
  TESTCASE_CREATE: 'testcase:create',
  TESTCASE_EDIT: 'testcase:edit',
  TESTCASE_APPROVE: 'testcase:approve',
  TESTCASE_DELETE: 'testcase:delete',
  EXECUTION_RECORD: 'execution:record',
  DEFECT_CREATE: 'defect:create',
  DEFECT_EDIT: 'defect:edit',
  MONDAY_CONFIG: 'monday:config',
  MONDAY_SYNC: 'monday:sync',
  EXPORT_DATA: 'export:data'
};

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.QA_LEAD]: [
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.REQUIREMENT_EDIT,
    PERMISSIONS.AI_GENERATE,
    PERMISSIONS.TESTCASE_CREATE,
    PERMISSIONS.TESTCASE_EDIT,
    PERMISSIONS.TESTCASE_APPROVE,
    PERMISSIONS.TESTCASE_DELETE,
    PERMISSIONS.EXECUTION_RECORD,
    PERMISSIONS.DEFECT_CREATE,
    PERMISSIONS.DEFECT_EDIT,
    PERMISSIONS.MONDAY_CONFIG,
    PERMISSIONS.MONDAY_SYNC,
    PERMISSIONS.EXPORT_DATA
  ],
  [ROLES.QA_ENGINEER]: [
    PERMISSIONS.REQUIREMENT_EDIT,
    PERMISSIONS.AI_GENERATE,
    PERMISSIONS.TESTCASE_CREATE,
    PERMISSIONS.TESTCASE_EDIT,
    PERMISSIONS.EXECUTION_RECORD,
    PERMISSIONS.DEFECT_CREATE,
    PERMISSIONS.DEFECT_EDIT,
    PERMISSIONS.EXPORT_DATA
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.EXPORT_DATA
  ]
};

export function hasPermission(role, permission) {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission);
}

export function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

export const INITIAL_USERS = [
  {
    id: 'user_admin',
    username: 'admin',
    name: 'System Administrator',
    role: ROLES.ADMIN,
    password_hash: hashPassword('admin123!'),
    created_at: new Date().toISOString()
  },
  {
    id: 'user_lead',
    username: 'qalead',
    name: 'Sarah Connor (QA Lead)',
    role: ROLES.QA_LEAD,
    password_hash: hashPassword('lead123!'),
    created_at: new Date().toISOString()
  },
  {
    id: 'user_engineer',
    username: 'qaengineer',
    name: 'Alex Rivera (QA Engineer)',
    role: ROLES.QA_ENGINEER,
    password_hash: hashPassword('engineer123!'),
    created_at: new Date().toISOString()
  },
  {
    id: 'user_viewer',
    username: 'viewer',
    name: 'Dana Scully (Stakeholder Viewer)',
    role: ROLES.VIEWER,
    password_hash: hashPassword('viewer123!'),
    created_at: new Date().toISOString()
  }
];

export function createAuthToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    issuedAt: Date.now()
  };
  const token = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return token;
}

export function verifyAuthToken(token) {
  try {
    if (!token) return null;
    const json = Buffer.from(token, 'base64url').toString('utf8');
    const payload = JSON.parse(json);
    if (!payload.username || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}
