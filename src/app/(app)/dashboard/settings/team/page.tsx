'use client';

import { useState, useEffect } from 'react';
import { useOrganization, OrganizationMember } from '@/app/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import { Loader2, Users, Settings, UserPlus, ShieldAlert, Building2, Trash2, Power, PowerOff } from 'lucide-react';

export default function TeamSettingsPage() {
  const { activeOrganization, organizations, setActiveOrganizationId, activeRole } = useOrganization();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Invite Member Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin' | 'owner'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);

  const fetchMembers = async () => {
    if (!activeOrganization) return;
    setLoading(true);
    setError('');
    try {
      // 1. Fetch organization members
      const { data: membersData, error: fetchError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', activeOrganization.id);
      
      if (fetchError) throw fetchError;
      
      if (!membersData || membersData.length === 0) {
        setMembers([]);
        return;
      }
      
      // 2. Fetch the corresponding users
      const userIds = membersData.map(m => m.user_id);
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', userIds);
        
      if (usersError) throw usersError;
      
      // 3. Merge the data
      const mergedMembers = membersData.map(member => {
        const user = usersData?.find(u => u.id === member.user_id);
        return {
          ...member,
          users: user || { email: 'Unknown', full_name: 'Unknown' }
        };
      });
      
      setMembers(mergedMembers as any[]);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [activeOrganization]);

  const handleInvite = async () => {
    if (!inviteEmail || !activeOrganization) return;
    setInviteLoading(true);
    try {
      // Find the user by email first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', inviteEmail)
        .maybeSingle();

      if (userError) throw userError;
      if (!userData) {
        throw new Error('User not found. They must sign up for an account first before you can add them to your team.');
      }

      // Add them to the organization
      const { error: insertError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: activeOrganization.id,
          user_id: userData.id,
          role: inviteRole
        });

      if (insertError) {
        if (insertError.code === '23505') throw new Error('This user is already in your organization.');
        throw insertError;
      }

      alert('User added to team successfully!');
      setShowInviteModal(false);
      setInviteEmail('');
      fetchMembers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this user from your team?')) return;
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
      setMembers(members.filter(m => m.id !== memberId));
    } catch (err: any) {
      alert(`Failed to remove member: ${err.message}`);
    }
  };

  const toggleMemberStatus = async (memberId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('organization_members')
        .update({ status: newStatus } as any)
        .eq('id', memberId);
      
      if (error) throw error;
      setMembers(members.map(m => m.id === memberId ? { ...m, status: newStatus } as any : m));
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  if (!activeOrganization) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 font-display">Team Settings</h1>
          <p className="text-gray-400 text-sm">Manage your organization members and roles.</p>
        </div>
      </div>

      <div className="bg-[#13131a] border border-[#1f1f2e] rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{activeOrganization.name}</h2>
              <p className="text-xs text-gray-500">Your current active workspace</p>
            </div>
          </div>
          
          {organizations.length > 1 && (
            <select
              value={activeOrganization.id}
              onChange={(e) => setActiveOrganizationId(e.target.value)}
              className="bg-[#0c0c12] border border-[#1f1f2e] text-white text-sm rounded-xl px-4 py-2 outline-none focus:border-indigo-500/50"
            >
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="bg-[#13131a] border border-[#1f1f2e] rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[#1f1f2e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-white">Members</h3>
          </div>
          {(activeRole === 'owner' || activeRole === 'admin') && !(activeOrganization as any).is_personal && (
            <button 
              onClick={() => setShowInviteModal(true)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </button>
          )}
        </div>

        {(activeOrganization as any).is_personal && (
          <div className="p-4 m-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-indigo-100">Individual Plan</h4>
              <p className="text-xs text-indigo-200/70 mt-1">
                You are currently using a personal workspace. To invite team members and collaborate, you need to upgrade to an Organization Plan.
              </p>
            </div>
          </div>
        )}

        <div className="p-0">
          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-400 text-sm">
              <ShieldAlert className="w-6 h-6 mx-auto mb-2 opacity-50" />
              {error}
            </div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No members found.
            </div>
          ) : (
            <ul className="divide-y divide-[#1f1f2e]">
              {members.map(member => (
                <li key={member.id} className={`p-4 flex items-center justify-between hover:bg-[#1a1a24] transition-colors ${(member as any).status === 'inactive' ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 text-xs font-bold uppercase">
                      {(member as any).users?.email?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{(member as any).users?.full_name || (member as any).users?.email || 'Unknown User'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-500 capitalize">{member.role === 'member' ? 'User' : 'Organization Admin'}</p>
                        {(member as any).status === 'inactive' && (
                          <span className="text-[10px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded">Inactive</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {(activeRole === 'owner' || activeRole === 'admin') && member.role !== 'owner' && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleMemberStatus(member.id, (member as any).status || 'active')}
                        className={`p-2 rounded-lg transition-colors border ${
                          (member as any).status === 'inactive' 
                            ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' 
                            : 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                        }`}
                        title={(member as any).status === 'inactive' ? "Activate Member" : "Deactivate Member"}
                      >
                        {(member as any).status === 'inactive' ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-2 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remove Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#13131a] border border-[#1f1f2e] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[#1f1f2e]">
              <h2 className="text-xl font-bold text-white">Add Team Member</h2>
              <p className="text-gray-400 text-sm mt-1">Enter the email address of the user you want to add.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                <input 
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-[#0c0c12] border border-[#1f1f2e] text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select 
                  value={inviteRole} 
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-[#0c0c12] border border-[#1f1f2e] text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50"
                >
                  <option value="member">User (Member)</option>
                  <option value="admin">Organization Admin</option>
                </select>
              </div>
            </div>
            <div className="p-6 bg-[#0c0c12] border-t border-[#1f1f2e] flex justify-end gap-3">
              <button 
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 rounded-xl text-gray-400 hover:text-white transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleInvite}
                disabled={inviteLoading || !inviteEmail}
                className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
