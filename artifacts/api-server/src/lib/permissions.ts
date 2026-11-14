import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

const statement = {
  ...defaultStatements,
  workspace: ["read", "update", "delete"],
  businessRecord: ["read", "create", "update", "delete"],
  finance: ["read", "create", "update", "delete"],
  team: ["read", "invite", "updateRole", "remove"],
  branch: ["read", "create", "update", "delete"],
  reports: ["read"],
} as const;

export const organizationAccess = createAccessControl(statement);

export const ownerRole = organizationAccess.newRole({
  ...ownerAc.statements,
  workspace: [...statement.workspace],
  businessRecord: [...statement.businessRecord],
  finance: [...statement.finance],
  team: [...statement.team],
  branch: [...statement.branch],
  reports: [...statement.reports],
});

export const adminRole = organizationAccess.newRole({
  ...adminAc.statements,
  workspace: ["read", "update"],
  businessRecord: [...statement.businessRecord],
  finance: ["read", "create", "update"],
  team: ["read", "invite", "remove"],
  branch: ["read", "create", "update"],
  reports: [...statement.reports],
});

export const managerRole = organizationAccess.newRole({
  ...memberAc.statements,
  workspace: ["read"],
  businessRecord: ["read", "create", "update"],
  finance: ["read"],
  team: ["read"],
  branch: ["read"],
  reports: ["read"],
});

export const employeeRole = organizationAccess.newRole({
  ...memberAc.statements,
  workspace: ["read"],
  businessRecord: ["read", "create", "update"],
  finance: [],
  team: [],
  branch: ["read"],
  reports: [],
});

export const readOnlyMemberRole = organizationAccess.newRole({
  ...memberAc.statements,
  workspace: ["read"],
  businessRecord: ["read"],
  finance: [],
  team: [],
  branch: ["read"],
  reports: [],
});

export const organizationRoles = {
  owner: ownerRole,
  admin: adminRole,
  manager: managerRole,
  employee: employeeRole,
  member: readOnlyMemberRole,
};
