import { useState, useEffect } from 'react';
import { UserCheck, Plus, X, Bell, BellOff, Phone, Trash2, Star, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import UserSearch from './UserSearch';
import { UserProfile, addContact } from '../services/supabaseSync';

interface AccountabilityPartner {
  id: string;
  user_id: string;
  partner_id: string;
  partner_email: string;
  partner_name: string | null;
  nickname: string | null;
  status: 'pending' | 'accepted' | 'declined';
  notify_on_missed: boolean;
  can_send_motivation: boolean;
  created_at: string;
}

interface PartnerRequest {
  id: string;
  requester_id: string;
  requester_email: string;
  requester_name: string | null;
  status: 'pending';
  created_at: string;
}

export default function AccountabilityPartnersPage() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<AccountabilityPartner[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PartnerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && isSupabaseConfigured) {
      fetchPartners();
      fetchPendingRequests();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchPartners = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('accountability_partners')
        .select('*')
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (error) throw error;
      setPartners(data || []);
    } catch (err) {
      console.error('Failed to fetch partners:', err);
    }
  };

  const fetchPendingRequests = async () => {
    if (!user) return;

    try {
      // Requests sent to me
      const { data, error } = await supabase
        .from('accountability_partners')
        .select('*')
        .eq('partner_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      // Transform to PartnerRequest format
      const requests: PartnerRequest[] = (data || []).map((p) => ({
        id: p.id,
        requester_id: p.user_id,
        requester_email: p.partner_email, // This is actually requester's info
        requester_name: p.partner_name,
        status: 'pending' as const,
        created_at: p.created_at,
      }));

      setPendingRequests(requests);
    } catch (err) {
      console.error('Failed to fetch pending requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendPartnerRequest = async () => {
    if (!user || !selectedUser) return;

    setSendingRequest(true);
    setError(null);

    try {
      const senderName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Someone';

      const { error } = await supabase.from('accountability_partners').insert({
        user_id: user.id,
        partner_id: selectedUser.id,
        partner_email: selectedUser.email,
        partner_name: selectedUser.full_name || selectedUser.email?.split('@')[0],
        nickname: null,
        status: 'pending',
        notify_on_missed: true,
        can_send_motivation: true,
        requester_name: senderName,
        requester_email: user.email,
      });

      if (error) throw error;

      // Also save as contact
      await addContact(user.id, {
        nickname: selectedUser.full_name || selectedUser.email?.split('@')[0] || 'Partner',
        email: selectedUser.email || '',
        full_name: selectedUser.full_name || undefined,
        contact_user_id: selectedUser.id,
      });

      setShowAddPartner(false);
      setSelectedUser(null);
      fetchPartners();
    } catch (err: any) {
      console.error('Failed to send partner request:', err);
      setError(err.message || 'Failed to send request');
    } finally {
      setSendingRequest(false);
    }
  };

  const respondToRequest = async (requestId: string, accept: boolean) => {
    try {
      const { error } = await supabase
        .from('accountability_partners')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', requestId);

      if (error) throw error;

      fetchPartners();
      fetchPendingRequests();
    } catch (err) {
      console.error('Failed to respond to request:', err);
    }
  };

  const removePartner = async (partnerId: string) => {
    if (!confirm('Are you sure you want to remove this accountability partner?')) return;

    try {
      const { error } = await supabase
        .from('accountability_partners')
        .delete()
        .eq('id', partnerId);

      if (error) throw error;
      fetchPartners();
    } catch (err) {
      console.error('Failed to remove partner:', err);
    }
  };

  const toggleNotification = async (partner: AccountabilityPartner) => {
    try {
      const { error } = await supabase
        .from('accountability_partners')
        .update({ notify_on_missed: !partner.notify_on_missed })
        .eq('id', partner.id);

      if (error) throw error;
      fetchPartners();
    } catch (err) {
      console.error('Failed to toggle notification:', err);
    }
  };

  const sendMotivationalCall = async (partner: AccountabilityPartner) => {
    // This will trigger a call to the partner with a motivational message
    alert(`Motivational call feature coming soon! This will send an encouraging call to ${partner.partner_name || partner.partner_email}`);
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <UserCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accountability Partners</h1>
            <p className="text-gray-600">Connect with friends who help you stay on track</p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-800">
            Accountability Partners requires an account. Please sign up to use this feature.
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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <UserCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accountability Partners</h1>
            <p className="text-gray-600">Connect with friends who help you stay on track</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddPartner(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Partner
        </button>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
        <h3 className="font-semibold text-green-900 mb-3">How Accountability Partners Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-green-800">
          <div className="flex items-start gap-2">
            <Bell className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p><strong>Missed Reminder Alerts:</strong> Partners get notified when you miss a reminder</p>
          </div>
          <div className="flex items-start gap-2">
            <Phone className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p><strong>Motivational Calls:</strong> Partners can send you encouraging reminder calls</p>
          </div>
          <div className="flex items-start gap-2">
            <Star className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p><strong>Progress Sharing:</strong> Share your streak and completion stats</p>
          </div>
        </div>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-yellow-50">
            <h2 className="text-lg font-semibold text-gray-900">Pending Requests</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingRequests.map((request) => (
              <div key={request.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <span className="text-white font-medium">
                      {(request.requester_name || request.requester_email)?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {request.requester_name || request.requester_email}
                    </p>
                    <p className="text-sm text-gray-500">Wants to be your accountability partner</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => respondToRequest(request.id, true)}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => respondToRequest(request.id, false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Partners List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Your Partners</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : partners.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No partners yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Add an accountability partner to help you stay motivated
            </p>
            <button
              onClick={() => setShowAddPartner(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700"
            >
              <Plus className="w-5 h-5" />
              Add Your First Partner
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {partners.map((partner) => {
              const displayName = partner.nickname || partner.partner_name || partner.partner_email;

              return (
                <div key={partner.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {displayName?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{displayName}</p>
                        <p className="text-sm text-gray-500">{partner.partner_email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Toggle Notifications */}
                      <button
                        onClick={() => toggleNotification(partner)}
                        className={`p-2 rounded-lg transition-colors ${
                          partner.notify_on_missed
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                        title={partner.notify_on_missed ? 'Notifications on' : 'Notifications off'}
                      >
                        {partner.notify_on_missed ? (
                          <Bell className="w-5 h-5" />
                        ) : (
                          <BellOff className="w-5 h-5" />
                        )}
                      </button>

                      {/* Send Motivation */}
                      {partner.can_send_motivation && (
                        <button
                          onClick={() => sendMotivationalCall(partner)}
                          className="p-2 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
                          title="Send motivational call"
                        >
                          <Phone className="w-5 h-5" />
                        </button>
                      )}

                      {/* Remove */}
                      <button
                        onClick={() => removePartner(partner.id)}
                        className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                        title="Remove partner"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Partner Modal */}
      {showAddPartner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Add Accountability Partner</h2>
              <button
                onClick={() => {
                  setShowAddPartner(false);
                  setSelectedUser(null);
                  setError(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search by email or contact name
                </label>
                <UserSearch
                  onSelectUser={setSelectedUser}
                  selectedUser={selectedUser}
                />
              </div>

              {selectedUser && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <span className="text-white font-medium">
                        {(selectedUser.full_name || selectedUser.email)?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {selectedUser.full_name || selectedUser.email?.split('@')[0]}
                      </p>
                      <p className="text-sm text-gray-600">{selectedUser.email}</p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-500">
                They will receive a request to become your accountability partner. Once accepted, they can see when you miss reminders and send you motivational calls.
              </p>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowAddPartner(false);
                  setSelectedUser(null);
                  setError(null);
                }}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={sendPartnerRequest}
                disabled={!selectedUser || sendingRequest}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingRequest ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
