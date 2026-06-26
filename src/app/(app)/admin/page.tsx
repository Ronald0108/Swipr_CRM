'use client';

import { useState, useEffect } from 'react';
import { useOrganization, Organization } from '@/app/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import { Loader2, ShieldAlert, Building2, Users, Shield, User, Power, PowerOff, UserPlus } from 'lucide-react';

interface OrgWithCounts extends Organization {
  memberCount: number;
  status?: 'active' | 'inactive';
  is_personal: boolean;
}

interface PublicUser {
  id: string;
  email: string;
  full_name: string | null;
  global_role: 'superadmin' | 'user';
  status?: 'active' | 'inactive';
  created_at: string;
}

export default function AdminDashboardPage() {
  const { isSiteAdmin, loading: orgLoading } = useOrganization();
  const [orgs, setOrgs] = useState<OrgWithCounts[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'orgs'>('users');
  
  // Add/Create Org Modal State
  const [showAddOrgModal, setShowAddOrgModal] = useState(false);
  const [modalMode, setModalMode] = useState<'assign' | 'create'>('assign');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [newOrgName, setNewOrgName] = useState('');
  const [selectedOrgRole, setSelectedOrgRole] = useState<'member' | 'admin'>('member');
  const [modalLoading, setModalLoading] = useState(false);

  const fetchAllData = async () => {
    if (!isSiteAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Fetch orgs
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (orgError) throw orgError;

      // Fetch org members for counts
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id');
      
      if (memberError) throw memberError;

      const counts: Record<string, number> = {};
      for (const m of (memberData as any[])) {
        counts[m.organization_id] = (counts[m.organization_id] || 0) + 1;
      }

      const orgsWithCounts = (orgData as any[])
        .filter(org => !org.is_personal) // Hide personal organizations
        .map(org => ({
          ...org,
          memberCount: counts[org.id] || 0
        }));

      setOrgs(orgsWithCounts);

      // Fetch users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (userError) throw userError;
      setUsers(userData as PublicUser[]);

    } catch (err: any) {
      setError(err.message || 'Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orgLoading) {
      fetchAllData();
    }
  }, [isSiteAdmin, orgLoading]);

  const toggleUserRole = async (userId: string, currentRole: 'superadmin' | 'user') => {
    try {
      const newRole = currentRole === 'superadmin' ? 'user' : 'superadmin';
      const { error } = await supabase
        .from('users')
        .update({ global_role: newRole })
        .eq('id', userId);

      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, global_role: newRole } : u));
    } catch (err: any) {
      alert(`Failed to update role: ${err.message}`);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: 'active' | 'inactive' = 'active') => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const toggleOrgStatus = async (orgId: string, currentStatus: 'active' | 'inactive' = 'active') => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('organizations')
        .update({ status: newStatus })
        .eq('id', orgId);

      if (error) throw error;
      setOrgs(orgs.map(o => o.id === orgId ? { ...o, status: newStatus } : o));
    } catch (err: any) {
      alert(`Failed to update org status: ${err.message}`);
    }
  };

  const handleAddToOrg = async () => {
    if (!selectedUserId) return;
    if (modalMode === 'assign' && !selectedOrgId) return;
    if (modalMode === 'create' && !newOrgName.trim()) return;
    
    setModalLoading(true);
    try {
      if (modalMode === 'assign') {
        const { error } = await supabase
          .from('organization_members')
          .insert({
            organization_id: selectedOrgId,
            user_id: selectedUserId,
            role: selectedOrgRole
          });
        
        if (error) {
          if (error.code === '23505') throw new Error('User is already in this organization.');
          throw error;
        }
        alert('Successfully added user to organization!');
      } else {
        // Create new organization
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({ name: newOrgName.trim(), is_personal: false })
          .select('id')
          .single();
          
        if (orgError) throw orgError;
        
        // Add user as owner
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: newOrg.id,
            user_id: selectedUserId,
            role: 'owner'
          });
          
        if (memberError) throw memberError;
        alert('Successfully created organization and assigned user as Organization Admin!');
      }
      
      setShowAddOrgModal(false);
      setNewOrgName('');
      fetchAllData(); // Refresh counts
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    } finally {
      setModalLoading(false);
    }
  };

  if (orgLoading || loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!isSiteAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center mt-20">
        <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-rose-500 opacity-50" />
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-gray-400">You must be a site admin to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2 font-display">Superadmin Dashboard</h1>
        <p className="text-gray-400 text-sm">Overview of all users and organizations across the platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#13131a] border border-[#1f1f2e] p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">{users.length}</h3>
            <p className="text-gray-400 text-sm">Total Users</p>
          </div>
        </div>
        <div className="bg-[#13131a] border border-[#1f1f2e] p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">{orgs.length}</h3>
            <p className="text-gray-400 text-sm">Total Organizations</p>
          </div>
        </div>
      </div>

      <div className="bg-[#13131a] border border-[#1f1f2e] rounded-2xl overflow-hidden mb-8">
        <div className="flex border-b border-[#1f1f2e]">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'users' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            All Users
          </button>
          <button
            onClick={() => setActiveTab('orgs')}
            className={`px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'orgs' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            All Organizations
          </button>
        </div>
        
        {error ? (
          <div className="p-8 text-center text-rose-400 text-sm">
            {error}
          </div>
        ) : activeTab === 'users' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1f1f2e] text-gray-500 text-sm">
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Global Role</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Joined</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f2e]">
                {users.map((user) => (
                  <tr key={user.id} className={`hover:bg-[#1a1a24] transition-colors ${user.status === 'inactive' ? 'opacity-50' : ''}`}>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{user.full_name || 'No Name'}</span>
                        <span className="text-gray-500 text-sm">{user.email}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full w-max text-xs ${
                        user.global_role === 'superadmin' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-[#1f1f2e] text-gray-400'
                      }`}>
                        {user.global_role === 'superadmin' ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                        {user.global_role === 'superadmin' ? 'Superadmin' : 'User'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        user.status === 'inactive' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {user.status === 'inactive' ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedUserId(user.id); setShowAddOrgModal(true); }}
                          className="text-sm px-3 py-1.5 rounded-lg border border-[#2d2d3d] text-gray-300 hover:bg-indigo-500/20 hover:text-indigo-400 hover:border-indigo-500/30 transition-colors flex items-center gap-2"
                          title="Add to Organization"
                        >
                          <UserPlus className="w-4 h-4" />
                          Assign Org
                        </button>
                        <button 
                          onClick={() => toggleUserRole(user.id, user.global_role)}
                          className="text-sm px-3 py-1.5 rounded-lg border border-[#2d2d3d] text-gray-300 hover:bg-[#2d2d3d] transition-colors"
                        >
                          {user.global_role === 'superadmin' ? 'Revoke Admin' : 'Make Admin'}
                        </button>
                        <button 
                          onClick={() => toggleUserStatus(user.id, user.status)}
                          className={`text-sm px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-2 ${
                            user.status === 'inactive' 
                              ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' 
                              : 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                          }`}
                        >
                          {user.status === 'inactive' ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                          {user.status === 'inactive' ? 'Activate' : 'Deactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1f1f2e] text-gray-500 text-sm">
                  <th className="p-4 font-medium">Organization Name</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Members</th>
                  <th className="p-4 font-medium">Created</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f2e]">
                {orgs.map((org) => (
                  <tr key={org.id} className={`hover:bg-[#1a1a24] transition-colors ${org.status === 'inactive' ? 'opacity-50' : ''}`}>
                    <td className="p-4 text-white font-medium">{org.name}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        org.status === 'inactive' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {org.status === 'inactive' ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400">
                      <span className="flex items-center gap-1.5 bg-[#1f1f2e] px-2.5 py-1 rounded-full w-max text-xs">
                        <Users className="w-3.5 h-3.5" />
                        {org.memberCount}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 text-sm">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => toggleOrgStatus(org.id, org.status)}
                        className={`text-sm px-3 py-1.5 rounded-lg border transition-colors inline-flex items-center gap-2 ${
                          org.status === 'inactive' 
                            ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' 
                            : 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                        }`}
                      >
                        {org.status === 'inactive' ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                        {org.status === 'inactive' ? 'Activate Org' : 'Deactivate Org'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Convert/Assign User to Org Modal */}
      {showAddOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#13131a] border border-[#1f1f2e] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[#1f1f2e]">
              <h2 className="text-xl font-bold text-white">Convert / Assign User</h2>
              <p className="text-gray-400 text-sm mt-1">Create a new organization for this user, or assign them to an existing one.</p>
            </div>
            
            <div className="flex border-b border-[#1f1f2e]">
              <button
                onClick={() => setModalMode('create')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  modalMode === 'create' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Create New Organization
              </button>
              <button
                onClick={() => setModalMode('assign')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  modalMode === 'assign' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Assign to Existing
              </button>
            </div>

            <div className="p-6 space-y-4">
              {modalMode === 'create' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">New Organization Name</label>
                  <input 
                    type="text"
                    value={newOrgName} 
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full bg-[#0c0c12] border border-[#1f1f2e] text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    This user will automatically become the <strong className="text-gray-400">Organization Admin</strong> of this new workspace.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Organization</label>
                    <select 
                      value={selectedOrgId} 
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      className="w-full bg-[#0c0c12] border border-[#1f1f2e] text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50"
                    >
                      <option value="">Select Organization...</option>
                      {orgs.map(org => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                    <select 
                      value={selectedOrgRole} 
                      onChange={(e) => setSelectedOrgRole(e.target.value as any)}
                      className="w-full bg-[#0c0c12] border border-[#1f1f2e] text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50"
                    >
                      <option value="member">User (Member)</option>
                      <option value="admin">Organization Admin</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="p-6 bg-[#0c0c12] border-t border-[#1f1f2e] flex justify-end gap-3">
              <button 
                onClick={() => setShowAddOrgModal(false)}
                className="px-4 py-2 rounded-xl text-gray-400 hover:text-white transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddToOrg}
                disabled={modalLoading || (modalMode === 'assign' && !selectedOrgId) || (modalMode === 'create' && !newOrgName.trim())}
                className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {modalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {modalMode === 'create' ? 'Create & Assign' : 'Assign User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

