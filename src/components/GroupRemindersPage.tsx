import { useState, useEffect } from 'react';
import { Users, Plus, X, Bell, Trash2, UserPlus, Crown, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import UserSearch from './UserSearch';
import { UserProfile } from '../services/supabaseSync';

interface GroupMember {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'member';
  joined_at: string;
}

interface ReminderGroup {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  member_count: number;
  reminder_count: number;
  members?: GroupMember[];
}

interface GroupReminder {
  id: string;
  group_id: string;
  title: string;
  why: string | null;
  time: string;
  repeat: string;
  active: boolean;
  created_by: string;
  created_at: string;
}

export default function GroupRemindersPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<ReminderGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ReminderGroup | null>(null);
  const [groupReminders, setGroupReminders] = useState<GroupReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showCreateReminder, setShowCreateReminder] = useState(false);

  // Create group form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [createGroupStep, setCreateGroupStep] = useState<'details' | 'members'>('details');
  const [pendingMembers, setPendingMembers] = useState<UserProfile[]>([]);
  const [newlyCreatedGroupId, setNewlyCreatedGroupId] = useState<string | null>(null);

  // Add member form
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [addingMember, setAddingMember] = useState(false);

  // Create reminder form
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderWhy, setReminderWhy] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [reminderRepeat, setReminderRepeat] = useState('daily');
  const [creatingReminder, setCreatingReminder] = useState(false);

  useEffect(() => {
    if (user && isSupabaseConfigured) {
      fetchGroups();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchGroups = async () => {
    if (!user) return;

    try {
      // Get groups where user is a member
      const { data: membershipData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      if (!membershipData || membershipData.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      const groupIds = membershipData.map((m) => m.group_id);

      const { data: groupsData, error: groupsError } = await supabase
        .from('reminder_groups')
        .select('*')
        .in('id', groupIds);

      if (groupsError) throw groupsError;

      setGroups(groupsData || []);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupDetails = async (groupId: string) => {
    try {
      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      // Fetch reminders
      const { data: remindersData, error: remindersError } = await supabase
        .from('group_reminders')
        .select('*')
        .eq('group_id', groupId)
        .order('time', { ascending: true });

      if (remindersError) throw remindersError;

      setGroupReminders(remindersData || []);

      // Update selected group with members
      const group = groups.find((g) => g.id === groupId);
      if (group) {
        setSelectedGroup({
          ...group,
          members: membersData || [],
          member_count: membersData?.length || 0,
          reminder_count: remindersData?.length || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch group details:', err);
    }
  };

  const createGroup = async () => {
    if (!user || !newGroupName.trim()) return;

    setCreatingGroup(true);
    try {
      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from('reminder_groups')
        .insert({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin member
      const { error: memberError } = await supabase.from('group_members').insert({
        group_id: groupData.id,
        user_id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
        role: 'admin',
      });

      if (memberError) throw memberError;

      // Store the new group ID and move to members step
      setNewlyCreatedGroupId(groupData.id);
      setCreateGroupStep('members');
      fetchGroups();
    } catch (err: unknown) {
      console.error('Failed to create group:', err);
      const errorMessage = err instanceof Error ? err.message :
        (typeof err === 'object' && err !== null && 'message' in err) ? String((err as {message: unknown}).message) :
        'Unknown error';
      alert(`Failed to create group: ${errorMessage}`);
    } finally {
      setCreatingGroup(false);
    }
  };

  const addPendingMember = (member: UserProfile) => {
    if (!pendingMembers.find(m => m.id === member.id)) {
      setPendingMembers([...pendingMembers, member]);
    }
    setSelectedUser(null);
  };

  const removePendingMember = (memberId: string) => {
    setPendingMembers(pendingMembers.filter(m => m.id !== memberId));
  };

  const addMembersToGroup = async () => {
    if (!newlyCreatedGroupId || pendingMembers.length === 0) return;

    setAddingMember(true);
    try {
      for (const member of pendingMembers) {
        const { error } = await supabase.from('group_members').insert({
          group_id: newlyCreatedGroupId,
          user_id: member.id,
          email: member.email,
          name: member.full_name || member.email?.split('@')[0],
          role: 'member',
        });
        if (error) {
          console.error(`Failed to add member ${member.email}:`, error);
        }
      }

      // Close modal and reset state
      finishGroupCreation();
    } catch (err) {
      console.error('Failed to add members:', err);
    } finally {
      setAddingMember(false);
    }
  };

  const finishGroupCreation = () => {
    // Select the newly created group
    if (newlyCreatedGroupId) {
      const newGroup = groups.find(g => g.id === newlyCreatedGroupId);
      if (newGroup) {
        setSelectedGroup(newGroup);
        fetchGroupDetails(newlyCreatedGroupId);
      }
    }

    // Reset all state
    setShowCreateGroup(false);
    setNewGroupName('');
    setNewGroupDescription('');
    setCreateGroupStep('details');
    setPendingMembers([]);
    setNewlyCreatedGroupId(null);
    setSelectedUser(null);
    fetchGroups();
  };

  const addMember = async () => {
    if (!user || !selectedGroup || !selectedUser) return;

    setAddingMember(true);
    try {
      const { error } = await supabase.from('group_members').insert({
        group_id: selectedGroup.id,
        user_id: selectedUser.id,
        email: selectedUser.email,
        name: selectedUser.full_name || selectedUser.email?.split('@')[0],
        role: 'member',
      });

      if (error) throw error;

      setShowAddMember(false);
      setSelectedUser(null);
      fetchGroupDetails(selectedGroup.id);
    } catch (err: any) {
      console.error('Failed to add member:', err);
      alert(err.message || 'Failed to add member. Please try again.');
    } finally {
      setAddingMember(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const { error } = await supabase.from('group_members').delete().eq('id', memberId);

      if (error) throw error;

      if (selectedGroup) {
        fetchGroupDetails(selectedGroup.id);
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const createGroupReminder = async () => {
    if (!user || !selectedGroup || !reminderTitle.trim()) return;

    setCreatingReminder(true);
    try {
      const { error } = await supabase.from('group_reminders').insert({
        group_id: selectedGroup.id,
        title: reminderTitle.trim(),
        why: reminderWhy.trim() || null,
        time: reminderTime,
        repeat: reminderRepeat,
        active: true,
        created_by: user.id,
      });

      if (error) throw error;

      setShowCreateReminder(false);
      setReminderTitle('');
      setReminderWhy('');
      setReminderTime('09:00');
      setReminderRepeat('daily');
      fetchGroupDetails(selectedGroup.id);
    } catch (err) {
      console.error('Failed to create group reminder:', err);
      alert('Failed to create reminder. Please try again.');
    } finally {
      setCreatingReminder(false);
    }
  };

  const deleteReminder = async (reminderId: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;

    try {
      const { error } = await supabase.from('group_reminders').delete().eq('id', reminderId);

      if (error) throw error;

      if (selectedGroup) {
        fetchGroupDetails(selectedGroup.id);
      }
    } catch (err) {
      console.error('Failed to delete reminder:', err);
    }
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to leave this group?')) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      setSelectedGroup(null);
      fetchGroups();
    } catch (err) {
      console.error('Failed to leave group:', err);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Group Reminders</h1>
            <p className="text-gray-600">Create shared reminders with friends, family, or teams</p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-800">
            Group Reminders requires an account. Please sign up to use this feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Group Reminders</h1>
            <p className="text-gray-600">Create shared reminders with friends, family, or teams</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateGroup(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Group
        </button>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
        <h3 className="font-semibold text-purple-900 mb-3">How Group Reminders Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-purple-800">
          <div className="flex items-start gap-2">
            <Users className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p><strong>Shared Groups:</strong> Create groups for family, friends, or teams</p>
          </div>
          <div className="flex items-start gap-2">
            <Bell className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p><strong>Sync Reminders:</strong> All members get the same reminder calls</p>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p><strong>Coordinated:</strong> Perfect for shared activities and events</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Groups List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Your Groups</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No groups yet</p>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="mt-3 text-sm text-purple-600 font-medium hover:text-purple-800"
                >
                  Create your first group
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => {
                      setSelectedGroup(group);
                      fetchGroupDetails(group.id);
                    }}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedGroup?.id === group.id ? 'bg-purple-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white font-bold">
                          {group.name[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{group.name}</p>
                        <p className="text-xs text-gray-500">
                          {group.member_count || 0} members
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Group Details */}
        <div className="lg:col-span-2">
          {selectedGroup ? (
            <div className="space-y-4">
              {/* Group Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        {selectedGroup.name[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedGroup.name}</h2>
                      {selectedGroup.description && (
                        <p className="text-gray-600">{selectedGroup.description}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => leaveGroup(selectedGroup.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Leave Group
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-200"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Member
                  </button>
                  <button
                    onClick={() => setShowCreateReminder(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4" />
                    New Reminder
                  </button>
                </div>
              </div>

              {/* Members */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">
                    Members ({selectedGroup.members?.length || 0})
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {selectedGroup.members?.map((member) => (
                    <div key={member.id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {(member.name || member.email)?.[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm">
                              {member.name || member.email}
                            </span>
                            {member.role === 'admin' && (
                              <Crown className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                          <span className="text-xs text-gray-500">{member.email}</span>
                        </div>
                      </div>
                      {member.user_id !== user?.id && member.role !== 'admin' && (
                        <button
                          onClick={() => removeMember(member.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Reminders */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">
                    Group Reminders ({groupReminders.length})
                  </h3>
                </div>
                {groupReminders.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No reminders yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {groupReminders.map((reminder) => (
                      <div key={reminder.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{reminder.title}</h4>
                            {reminder.why && (
                              <p className="text-sm text-gray-600">{reminder.why}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {reminder.time}
                              </span>
                              <span className="capitalize">{reminder.repeat}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteReminder(reminder.id)}
                            className="p-2 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Group</h3>
              <p className="text-gray-500">
                Choose a group from the list or create a new one
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal - Multi-step */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {createGroupStep === 'details' ? 'Create Group' : 'Add Members'}
                </h2>
                <p className="text-sm text-gray-500">
                  Step {createGroupStep === 'details' ? '1' : '2'} of 2
                </p>
              </div>
              <button
                onClick={() => {
                  if (createGroupStep === 'members') {
                    finishGroupCreation();
                  } else {
                    setShowCreateGroup(false);
                    setNewGroupName('');
                    setNewGroupDescription('');
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="px-6 pt-4">
              <div className="flex items-center gap-2">
                <div className={`flex-1 h-1 rounded-full ${createGroupStep === 'details' ? 'bg-purple-600' : 'bg-purple-600'}`} />
                <div className={`flex-1 h-1 rounded-full ${createGroupStep === 'members' ? 'bg-purple-600' : 'bg-gray-200'}`} />
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {createGroupStep === 'details' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Group Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="e.g., Family Fitness, Study Group"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newGroupDescription}
                      onChange={(e) => setNewGroupDescription(e.target.value)}
                      placeholder="What is this group for?"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-green-800">
                      <strong>"{newGroupName}"</strong> created! Now add members to your group.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search for members
                    </label>
                    <UserSearch
                      onSelectUser={(user) => user && addPendingMember(user)}
                      selectedUser={null}
                      allowInvite={true}
                    />
                  </div>

                  {/* Pending members list */}
                  {pendingMembers.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Members to add ({pendingMembers.length})
                      </label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {pendingMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {(member.full_name || member.email)?.[0]?.toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">
                                  {member.full_name || member.email?.split('@')[0]}
                                </p>
                                <p className="text-xs text-gray-500">{member.email}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => removePendingMember(member.id)}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pendingMembers.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Search above to add members, or skip to finish creating your group.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              {createGroupStep === 'details' ? (
                <>
                  <button
                    onClick={() => {
                      setShowCreateGroup(false);
                      setNewGroupName('');
                      setNewGroupDescription('');
                    }}
                    className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createGroup}
                    disabled={!newGroupName.trim() || creatingGroup}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {creatingGroup ? 'Creating...' : 'Next: Add Members'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={finishGroupCreation}
                    className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                  >
                    {pendingMembers.length === 0 ? 'Skip for Now' : 'Skip'}
                  </button>
                  <button
                    onClick={addMembersToGroup}
                    disabled={pendingMembers.length === 0 || addingMember}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {addingMember ? 'Adding...' : `Add ${pendingMembers.length} Member${pendingMembers.length !== 1 ? 's' : ''}`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Add Member</h2>
              <button onClick={() => { setShowAddMember(false); setSelectedUser(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <UserSearch onSelectUser={setSelectedUser} selectedUser={selectedUser} />

              {selectedUser && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="font-medium text-gray-900">
                    {selectedUser.full_name || selectedUser.email}
                  </p>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => { setShowAddMember(false); setSelectedUser(null); }}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addMember}
                disabled={!selectedUser || addingMember}
                className="flex-1 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {addingMember ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Reminder Modal */}
      {showCreateReminder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">New Group Reminder</h2>
              <button onClick={() => setShowCreateReminder(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  placeholder="e.g., Team standup, Family dinner"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Why is this important?
                </label>
                <textarea
                  value={reminderWhy}
                  onChange={(e) => setReminderWhy(e.target.value)}
                  placeholder="Add context for the group"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Repeat
                  </label>
                  <select
                    value={reminderRepeat}
                    onChange={(e) => setReminderRepeat(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <p className="text-sm text-gray-500">
                All group members will receive this reminder at the scheduled time.
              </p>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowCreateReminder(false)}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createGroupReminder}
                disabled={!reminderTitle.trim() || creatingReminder}
                className="flex-1 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {creatingReminder ? 'Creating...' : 'Create Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
