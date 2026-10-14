/**
 * Roles and teams. Approval routing itself lives in the database
 * (public.approver_role_for) so RLS, the queue and emails agree.
 */

export type Role =
  | 'engineer'
  | 'frontend_engineer'
  | 'backend_engineer'
  | 'qa_engineer'
  | 'operations'
  | 'marketing'
  | 'product_designer'
  | 'product_manager'
  | 'frontend_line_manager'
  | 'backend_line_manager'
  | 'engineering_manager'
  | 'head_of_product'
  | 'head_of_operations'
  | 'line_manager';

/** Roles an admin can assign, in display order. */
export const ROLES: { value: Role; label: string }[] = [
  { value: 'frontend_engineer', label: 'Frontend Engineer' },
  { value: 'backend_engineer', label: 'Backend Engineer' },
  { value: 'qa_engineer', label: 'QA Engineer' },
  { value: 'operations', label: 'Operations' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'product_designer', label: 'Product Designer' },
  { value: 'product_manager', label: 'Product Manager' },
  { value: 'frontend_line_manager', label: 'Frontend Line Manager' },
  { value: 'backend_line_manager', label: 'Backend Line Manager' },
  { value: 'engineering_manager', label: 'Engineering Manager' },
  { value: 'head_of_product', label: 'Head of Product' },
  { value: 'head_of_operations', label: 'Head of Operations' },
  { value: 'engineer', label: 'Engineer (default)' },
];

export const MANAGER_ROLES: Role[] = [
  'frontend_line_manager',
  'backend_line_manager',
  'engineering_manager',
  'head_of_product',
  'head_of_operations',
  'line_manager',
];

export const LINE_MANAGER_ROLES: Role[] = ['frontend_line_manager', 'backend_line_manager', 'line_manager'];

export function isManager(role: string | null | undefined): boolean {
  return MANAGER_ROLES.includes(role as Role);
}

export function roleLabel(role: string): string {
  return ROLES.find((r) => r.value === role)?.label ?? role.replace(/_/g, ' ');
}

export const TEAMS = [
  { value: 'backend', label: 'Backend Engineering' },
  { value: 'frontend', label: 'Frontend Engineering' },
  { value: 'product', label: 'Product' },
  { value: 'design', label: 'Design' },
  { value: 'operations', label: 'Operations' },
  { value: 'marketing', label: 'Marketing' },
] as const;

export function teamLabel(team: string | null | undefined): string {
  if (!team) return '—';
  return TEAMS.find((t) => t.value === team)?.label ?? team.charAt(0).toUpperCase() + team.slice(1);
}
