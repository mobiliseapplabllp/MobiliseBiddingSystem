'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import {
  Users, Shield, UserCircle, Download, Upload, Plus, UserCog,
  X, Check, Loader2, Pencil, Trash2, ShieldCheck, ChevronDown,
} from 'lucide-react';
import { RoleGate } from '@/components/auth/role-gate';
import { ROLES, getRoleLabel } from '@/lib/auth-context';

// ── Types ───────────────────────────────────────────────────────────────────────

interface UserWithRoles {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
  userOrgRoles: { role: string; bu: { name: string; code: string } | null }[];
}

interface Organisation { id: string; name: string; }

interface RoleWithPermissions {
  role: string;
  permissions: string[];
  isBuiltIn: boolean;
}

// ── Permission Categories ───────────────────────────────────────────────────────

const PERMISSION_CATEGORIES = [
  { name: 'Organisation', permissions: ['ORG_CREATE', 'ORG_UPDATE', 'ORG_VIEW'] },
  { name: 'Business Units', permissions: ['BU_CREATE', 'BU_UPDATE', 'BU_VIEW'] },
  { name: 'Users', permissions: ['USER_CREATE', 'USER_UPDATE', 'USER_VIEW', 'USER_ASSIGN_ROLE'] },
  { name: 'Events', permissions: ['EVENT_CREATE', 'EVENT_UPDATE', 'EVENT_VIEW', 'EVENT_PUBLISH', 'EVENT_DELETE'] },
  { name: 'Auctions', permissions: ['AUCTION_CREATE', 'AUCTION_START', 'AUCTION_CLOSE', 'AUCTION_VIEW'] },
  { name: 'Bids', permissions: ['BID_SUBMIT', 'BID_VIEW_OWN', 'BID_VIEW_ALL'] },
  { name: 'Evaluation', permissions: ['EVAL_SCORE', 'EVAL_VIEW', 'EVAL_MANAGE'] },
  { name: 'Awards', permissions: ['AWARD_RECOMMEND', 'AWARD_APPROVE', 'AWARD_VIEW'] },
  { name: 'Contracts', permissions: ['CONTRACT_CREATE', 'CONTRACT_VIEW', 'CONTRACT_SIGN'] },
  { name: 'Suppliers', permissions: ['SUPPLIER_VIEW', 'SUPPLIER_MANAGE'] },
  { name: 'Admin', permissions: ['ANALYTICS_VIEW', 'ADMIN_SETTINGS', 'ADMIN_AUDIT_LOG'] },
];

const ALL_PERMISSIONS = PERMISSION_CATEGORIES.flatMap((c) => c.permissions);

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  PLATFORM_ADMIN: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  ORG_ADMIN:      { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  BU_HEAD:        { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  EVENT_MANAGER:  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  BUYER:          { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  EVALUATOR:      { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  OBSERVER:       { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
  SUPPLIER:       { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
};

function getRoleColor(role: string) {
  return ROLE_COLORS[role] ?? { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' };
}

const USER_ROLE_BADGES: Record<string, string> = {
  PLATFORM_ADMIN: 'bg-red-100 text-red-700',
  ORG_ADMIN: 'bg-blue-100 text-blue-700',
  BU_HEAD: 'bg-amber-100 text-amber-700',
  EVENT_MANAGER: 'bg-emerald-100 text-emerald-700',
  EVALUATOR: 'bg-cyan-100 text-cyan-700',
  OBSERVER: 'bg-gray-100 text-gray-600',
  SUPPLIER: 'bg-violet-100 text-violet-700',
  BUYER: 'bg-indigo-100 text-indigo-700',
};

// ── Permission Matrix Modal ─────────────────────────────────────────────────────

function PermissionModal({
  role,
  initialPermissions,
  onSave,
  onClose,
}: {
  role: string;
  initialPermissions: string[];
  onSave: (role: string, permissions: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialPermissions));
  const [saving, setSaving] = useState(false);

  function togglePermission(perm: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  }

  function toggleCategory(perms: string[]) {
    const allSelected = perms.every((p) => selected.has(p));
    setSelected((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => (allSelected ? next.delete(p) : next.add(p)));
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(role, Array.from(selected));
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const colors = getRoleColor(role);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colors.bg}`}>
              <ShieldCheck className={`h-5 w-5 ${colors.text}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{getRoleLabel(role)}</h3>
              <p className="text-xs text-gray-500">{selected.size} of {ALL_PERMISSIONS.length} permissions</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {PERMISSION_CATEGORIES.map((cat) => {
            const catSelected = cat.permissions.filter((p) => selected.has(p)).length;
            const allChecked = catSelected === cat.permissions.length;

            return (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => toggleCategory(cat.permissions)}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-800 hover:text-blue-600 transition-colors"
                  >
                    <div className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                      allChecked ? 'bg-blue-600 border-blue-600' : catSelected > 0 ? 'bg-blue-100 border-blue-300' : 'border-gray-300'
                    }`}>
                      {allChecked && <Check className="h-3 w-3 text-white" />}
                      {!allChecked && catSelected > 0 && <div className="h-1.5 w-1.5 rounded-sm bg-blue-600" />}
                    </div>
                    {cat.name}
                  </button>
                  <span className="text-[11px] text-gray-400">{catSelected}/{cat.permissions.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 ps-6">
                  {cat.permissions.map((perm) => (
                    <label
                      key={perm}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        selected.has(perm) ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(perm)}
                        onChange={() => togglePermission(perm)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-[13px] text-gray-700">{perm.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <span className="text-xs text-gray-500">{selected.size} permissions selected</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Custom Role Modal ───────────────────────────────────────────────────────

function AddRoleModal({ onSave, onClose }: { onSave: (name: string) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim().toUpperCase().replace(/\s+/g, '_'));
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Create Custom Role</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CATEGORY_MANAGER"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-mono uppercase"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Will be stored as uppercase with underscores</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Role
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────────

export default function UsersAndRolesPage() {
  const t = useTranslations('users');
  const [tab, setTab] = useState<'users' | 'roles'>('users');

  // Users state
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Roles state
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null);
  const [showAddRole, setShowAddRole] = useState(false);

  // Load orgs
  useEffect(() => {
    api.get<Organisation[]>('/orgs')
      .then((data) => { setOrgs(data); if (data.length > 0) setSelectedOrg(data[0].id); })
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, []);

  // Load users for selected org
  useEffect(() => {
    if (!selectedOrg) return;
    api.get<UserWithRoles[]>(`/orgs/${selectedOrg}/users`).then(setUsers).catch(() => {});
  }, [selectedOrg]);

  // Load roles when tab switches
  const loadRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const data = await api.get<RoleWithPermissions[]>('/orgs/roles/all');
      setRoles(data);
    } catch { /* */ }
    finally { setLoadingRoles(false); }
  }, []);

  useEffect(() => {
    if (tab === 'roles') loadRoles();
  }, [tab, loadRoles]);

  async function handleSavePermissions(role: string, permissions: string[]) {
    await api.put(`/orgs/roles/${role}`, { permissions });
    await loadRoles();
  }

  async function handleDeleteRole(role: string) {
    if (!confirm(`Delete role "${role}"? This cannot be undone.`)) return;
    await api.delete(`/orgs/roles/${role}`);
    await loadRoles();
  }

  async function handleCreateRole(name: string) {
    await api.put(`/orgs/roles/${name}`, { permissions: [] });
    await loadRoles();
  }

  // Computed
  const builtInCount = roles.filter((r) => r.isBuiltIn).length;
  const customCount = roles.filter((r) => !r.isBuiltIn).length;
  const totalPermissions = new Set(roles.flatMap((r) => r.permissions)).size;

  return (
    <RoleGate roles={[ROLES.PLATFORM_ADMIN, ROLES.ORG_ADMIN]}>
    <div className="max-w-5xl">
      {/* Permission modal */}
      {editingRole && (
        <PermissionModal
          role={editingRole.role}
          initialPermissions={editingRole.permissions}
          onSave={handleSavePermissions}
          onClose={() => setEditingRole(null)}
        />
      )}
      {showAddRole && (
        <AddRoleModal onSave={handleCreateRole} onClose={() => setShowAddRole(false)} />
      )}

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shrink-0 bg-orange-50">
              <UserCog className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('title', 'Users & Roles')}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{t('subtitle', 'Manage users, roles, and permission assignments')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t('export', 'Export')}</span>
            </button>
            <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">{t('import', 'Import')}</span>
            </button>
            {tab === 'roles' && (
              <button
                onClick={() => setShowAddRole(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t('addRole', 'Add Role')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div role="tablist" className="flex items-center gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          role="tab"
          aria-selected={tab === 'users'}
          onClick={() => setTab('users')}
          className={`flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-all ${
            tab === 'users'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="h-4 w-4" />
          {t('usersTab', 'Users')}
        </button>
        <button
          role="tab"
          aria-selected={tab === 'roles'}
          onClick={() => setTab('roles')}
          className={`flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-all ${
            tab === 'roles'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Shield className="h-4 w-4" />
          {t('rolesPermissions', 'Roles & Permissions')}
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* USERS TAB                                                              */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'users' && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: t('totalUsers', 'Total Users'), value: users.length, labelColor: 'text-blue-600', valueColor: 'text-gray-900' },
              { label: t('active', 'Active'), value: users.filter((u) => u.status === 'ACTIVE').length, labelColor: 'text-emerald-600', valueColor: 'text-emerald-600' },
              { label: t('inactive', 'Inactive'), value: users.filter((u) => u.status !== 'ACTIVE').length, labelColor: 'text-red-500', valueColor: 'text-red-500' },
              { label: t('organisations', 'Organisations'), value: orgs.length, labelColor: 'text-blue-600', valueColor: 'text-blue-600' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                <p className={`text-[13px] font-medium mb-2 ${kpi.labelColor}`}>{kpi.label}</p>
                <p className={`text-[28px] font-bold ${kpi.valueColor}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Org selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1.5">{t('organisation', 'Organisation')}</label>
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
            >
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          {/* Users table */}
          {loadingUsers ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="h-5 bg-slate-200 rounded w-40" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('noUsersFound', 'No users found')}</h3>
              <p className="text-sm text-gray-500">{t('usersWillAppear', 'Users will appear here after registration.')}</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th scope="col" className="text-start text-[12px] font-semibold text-gray-500 px-5 py-3.5">{t('user', 'User')}</th>
                    <th scope="col" className="text-start text-[12px] font-semibold text-gray-500 px-5 py-3.5">{t('email', 'Email')}</th>
                    <th scope="col" className="text-start text-[12px] font-semibold text-gray-500 px-5 py-3.5">{t('roles', 'Roles')}</th>
                    <th scope="col" className="text-start text-[12px] font-semibold text-gray-500 px-5 py-3.5">{t('status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                            <UserCircle className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="text-[13.5px] font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[13.5px] text-gray-500">{user.email}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {user.userOrgRoles.map((ur, i) => (
                            <span
                              key={i}
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                USER_ROLE_BADGES[ur.role] || 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              <Shield className="h-2.5 w-2.5" />
                              {ur.role.replace(/_/g, ' ')}
                              {ur.bu && <span className="opacity-60">({ur.bu.code})</span>}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                          user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ROLES TAB                                                              */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'roles' && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: t('totalRoles', 'Total Roles'), value: roles.length, labelColor: 'text-blue-600', valueColor: 'text-gray-900' },
              { label: t('builtInRoles', 'Built-in Roles'), value: builtInCount, labelColor: 'text-emerald-600', valueColor: 'text-emerald-600' },
              { label: t('customRoles', 'Custom Roles'), value: customCount, labelColor: 'text-violet-600', valueColor: 'text-violet-600' },
              { label: t('permissionsUsed', 'Permissions Used'), value: totalPermissions, labelColor: 'text-blue-600', valueColor: 'text-blue-600' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                <p className={`text-[13px] font-medium mb-2 ${kpi.labelColor}`}>{kpi.label}</p>
                <p className={`text-[28px] font-bold ${kpi.valueColor}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Roles grid */}
          {loadingRoles ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
                  <div className="h-5 bg-slate-200 rounded w-32 mb-3" />
                  <div className="h-4 bg-slate-100 rounded w-24" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((role) => {
                const colors = getRoleColor(role.role);
                return (
                  <div key={role.role} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${colors.bg}`}>
                          <Shield className={`h-5 w-5 ${colors.text}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-[14px] font-semibold text-gray-900">{getRoleLabel(role.role)}</h3>
                            {role.isBuiltIn ? (
                              <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">BUILT-IN</span>
                            ) : (
                              <span className="text-[10px] font-medium text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">CUSTOM</span>
                            )}
                          </div>
                          <p className="text-[12px] text-gray-500 mt-0.5 font-mono">{role.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingRole(role)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Permissions"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {!role.isBuiltIn && (
                          <button
                            onClick={() => handleDeleteRole(role.role)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Role"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Permission summary */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-gray-500">
                          <span className="font-semibold text-gray-800">{role.permissions.length}</span> / {ALL_PERMISSIONS.length} permissions
                        </span>
                        <button
                          onClick={() => setEditingRole(role)}
                          className="text-[12px] font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          Manage →
                        </button>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            role.permissions.length === ALL_PERMISSIONS.length ? 'bg-emerald-500' :
                            role.permissions.length > ALL_PERMISSIONS.length / 2 ? 'bg-blue-500' : 'bg-amber-400'
                          }`}
                          style={{ width: `${(role.permissions.length / ALL_PERMISSIONS.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
    </RoleGate>
  );
}
