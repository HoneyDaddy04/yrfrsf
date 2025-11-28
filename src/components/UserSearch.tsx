import { useState, useEffect, useRef } from 'react';
import { Search, User, X, Loader2, Star, UserPlus, Mail, Send, Copy, Check } from 'lucide-react';
import { searchUsersByEmail, searchContacts, addContact, UserProfile } from '../services/supabaseSync';
import { useAuth } from '../contexts/AuthContext';

interface UserSearchProps {
  onSelectUser: (user: UserProfile | null) => void;
  selectedUser: UserProfile | null;
  selectedNickname?: string;
  allowInvite?: boolean; // Enable invite functionality
  onInviteSent?: (email: string) => void; // Callback when invite is sent
}

interface SearchResult {
  type: 'contact' | 'user';
  id: string;
  email: string;
  name: string;
  nickname?: string;
  avatar_url?: string | null;
  is_favorite?: boolean;
  contact_user_id?: string | null;
}

export default function UserSearch({ onSelectUser, selectedUser, selectedNickname, allowInvite = true, onInviteSent }: UserSearchProps) {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [displayNickname, setDisplayNickname] = useState(selectedNickname || '');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to check if string is valid email
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Get app URL for invite link
  const getInviteLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/login?ref=invite&from=${encodeURIComponent(currentUser?.email || '')}`;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setShowAddContact(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search - search contacts first, then users
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 1) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const combinedResults: SearchResult[] = [];

      // Search contacts first (if user is logged in)
      if (currentUser) {
        const contacts = await searchContacts(currentUser.id, query);
        contacts.forEach(contact => {
          combinedResults.push({
            type: 'contact',
            id: contact.id,
            email: contact.email,
            name: contact.full_name || contact.nickname,
            nickname: contact.nickname,
            avatar_url: contact.avatar_url,
            is_favorite: contact.is_favorite,
            contact_user_id: contact.contact_user_id,
          });
        });
      }

      // Then search users by email (if query is 3+ chars and looks like email)
      if (query.length >= 3) {
        const users = await searchUsersByEmail(query);
        users.forEach(user => {
          // Don't add if already in contacts or is current user
          if (user.id === currentUser?.id) return;
          if (combinedResults.some(r => r.email === user.email)) return;

          combinedResults.push({
            type: 'user',
            id: user.id,
            email: user.email || '',
            name: user.full_name || 'User',
            avatar_url: user.avatar_url,
          });
        });
      }

      setResults(combinedResults);
      setShowResults(true);
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, currentUser?.id]);

  const handleSelectResult = (result: SearchResult) => {
    const userProfile: UserProfile = {
      id: result.contact_user_id || result.id,
      email: result.email,
      full_name: result.name,
      avatar_url: result.avatar_url || null,
    };
    onSelectUser(userProfile);
    setDisplayNickname(result.nickname || '');
    setQuery('');
    setResults([]);
    setShowResults(false);

    // If selecting a user (not a contact), offer to save as contact
    if (result.type === 'user') {
      setNewNickname('');
      setShowAddContact(true);
    }
  };

  const handleSaveAsContact = async () => {
    if (!currentUser || !selectedUser || !newNickname.trim()) return;

    setSavingContact(true);
    const { error } = await addContact(currentUser.id, {
      nickname: newNickname.trim(),
      email: selectedUser.email || '',
      full_name: selectedUser.full_name || undefined,
      contact_user_id: selectedUser.id,
      avatar_url: selectedUser.avatar_url || undefined,
    });

    if (!error) {
      setDisplayNickname(newNickname.trim());
      setShowAddContact(false);
    }
    setSavingContact(false);
  };

  const handleClearSelection = () => {
    onSelectUser(null);
    setDisplayNickname('');
    setShowAddContact(false);
  };

  if (selectedUser) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            {selectedUser.avatar_url ? (
              <img
                src={selectedUser.avatar_url}
                alt={selectedUser.full_name || 'User'}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-indigo-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900 truncate">
                {displayNickname || selectedUser.full_name || 'User'}
              </p>
              {displayNickname && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                  Contact
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 truncate">{selectedUser.email}</p>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Save as Contact prompt */}
        {showAddContact && (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-gray-700">Save as contact?</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                placeholder="Enter a nickname..."
                className="input flex-1 text-sm py-1.5"
              />
              <button
                type="button"
                onClick={handleSaveAsContact}
                disabled={!newNickname.trim() || savingContact}
                className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingContact ? '...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddContact(false)}
                className="px-3 py-1.5 text-gray-600 text-sm font-medium hover:bg-gray-200 rounded-lg"
              >
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts or email..."
          className="input pl-10 pr-10"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => handleSelectResult(result)}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                {result.avatar_url ? (
                  <img
                    src={result.avatar_url}
                    alt={result.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-gray-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 truncate text-sm">
                    {result.nickname || result.name}
                  </p>
                  {result.is_favorite && (
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  )}
                  {result.type === 'contact' && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded">
                      Contact
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{result.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results Message with Invite Option */}
      {showResults && results.length === 0 && query.length >= 3 && !isSearching && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500 text-center">
            No contacts or users found
          </p>
          {allowInvite && (
            <>
              <p className="text-xs text-gray-400 text-center mt-1 mb-3">
                They need to have the app to receive reminders
              </p>
              <button
                type="button"
                onClick={() => {
                  setInviteEmail(isValidEmail(query) ? query : '');
                  setShowInviteModal(true);
                  setShowResults(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Invite Someone
              </button>
            </>
          )}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Invite Someone</h2>
                  <p className="text-sm text-gray-500">Share YFS with friends</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setInviteSent(false);
                  setLinkCopied(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {inviteSent ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Invite Sent!</h3>
                  <p className="text-sm text-gray-600">
                    We've sent an invitation to {inviteEmail}
                  </p>
                </div>
              ) : (
                <>
                  {/* Email Invite */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Send invite by email
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="friend@example.com"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!isValidEmail(inviteEmail)) return;
                          setInviteSending(true);

                          // For now, we'll use mailto as a fallback
                          // In production, you'd call a Supabase Edge Function or API
                          const subject = encodeURIComponent(`${currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'Someone'} invited you to YFS`);
                          const body = encodeURIComponent(
                            `Hey!\n\nI'm using YFS - Your Future Self is Calling! It's an AI-powered reminder app that calls you like your future self. I'd love for you to join so we can be accountability partners!\n\nSign up here: ${getInviteLink()}\n\nSee you there!`
                          );
                          window.open(`mailto:${inviteEmail}?subject=${subject}&body=${body}`, '_blank');

                          setTimeout(() => {
                            setInviteSending(false);
                            setInviteSent(true);
                            onInviteSent?.(inviteEmail);
                          }, 500);
                        }}
                        disabled={!isValidEmail(inviteEmail) || inviteSending}
                        className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {inviteSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Send
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-2 bg-white text-sm text-gray-500">or</span>
                    </div>
                  </div>

                  {/* Copy Link */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Share invite link
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getInviteLink()}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(getInviteLink());
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 2000);
                        }}
                        className={`px-4 py-2 font-medium rounded-lg flex items-center gap-2 transition-colors ${
                          linkCopied
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {linkCopied ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Share via apps */}
                  <div className="pt-2">
                    <p className="text-sm text-gray-500 mb-3">Share via</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const text = encodeURIComponent(`Join me on YFS - Your Future Self is Calling! ${getInviteLink()}`);
                          window.open(`https://wa.me/?text=${text}`, '_blank');
                        }}
                        className="flex-1 px-3 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600"
                      >
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const text = encodeURIComponent(`Join me on YFS - Your Future Self is Calling! ${getInviteLink()}`);
                          window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
                        }}
                        className="flex-1 px-3 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800"
                      >
                        X / Twitter
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const text = encodeURIComponent(`Join me on YFS - Your Future Self is Calling! ${getInviteLink()}`);
                          window.open(`sms:?body=${text}`, '_blank');
                        }}
                        className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600"
                      >
                        SMS
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-5 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setInviteSent(false);
                  setLinkCopied(false);
                }}
                className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
              >
                {inviteSent ? 'Done' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
