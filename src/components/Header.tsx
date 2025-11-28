import { useEffect, useState } from 'react';
import { Bell, Settings, Clock, MapPin, Home, List, Menu, X, History, TrendingUp, Plus, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  onSettingsClick: () => void;
  onCallHistoryClick?: () => void;
  onNewReminderClick?: () => void;
  onReceivedRemindersClick?: () => void;
  missedCallsCount?: number;
  receivedCallsCount?: number;
  activeTab?: 'home' | 'reminders' | 'insights';
  onTabChange?: (tab: 'home' | 'reminders' | 'insights') => void;
}

export default function Header({
  onSettingsClick,
  onCallHistoryClick = () => {},
  onNewReminderClick = () => {},
  onReceivedRemindersClick = () => {},
  missedCallsCount = 0,
  receivedCallsCount = 0,
  activeTab = 'home',
  onTabChange = () => {}
}: HeaderProps) {
  const [now, setNow] = useState(new Date());
  const [locationLabel, setLocationLabel] = useState<string>('');
  const [locLoading, setLocLoading] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Update time every second
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Location detection with simplified state/country display
  useEffect(() => {
    const cached = localStorage.getItem('air_location_label');
    if (cached) setLocationLabel(cached);

    if (!('geolocation' in navigator)) return;
    
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
          
          const res = await fetch(url, { 
            headers: { 
              'Accept': 'application/json',
              'User-Agent': 'AI Reminder App (contact@example.com)'
            } 
          });
          
          if (res.ok) {
            const data = await res.json();
            const a = data.address || {};
            // Only show state and country code
            const state = a.state || '';
            const country = a.country_code ? a.country_code.toUpperCase() : '';
            const label = state && country ? `${state}, ${country}` : (state || country || 'Location');
            
            setLocationLabel(label);
            localStorage.setItem('air_location_label', label);
          }
        } catch (error) {
          console.error('Location error:', error);
        } finally {
          setLocLoading(false);
        }
      },
      () => {
        setLocLoading(false);
        setLocationLabel('Location off');
      },
      { 
        enableHighAccuracy: true, 
        timeout: 5000, 
        maximumAge: 300000 
      }
    );
  }, []);

  const timeStr = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'reminders', icon: List, label: 'My Reminders' },
    { id: 'insights', icon: TrendingUp, label: 'Insights' },
  ];

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and mobile menu button */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-md text-gray-500 hover:text-gray-900 focus:outline-none"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            <div className="flex-shrink-0 flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="ml-2 sm:ml-3 text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Yrfrsf
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:ml-8 md:flex md:space-x-8">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id as 'home' | 'reminders' | 'insights')}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    activeTab === item.id
                      ? 'border-b-2 border-indigo-500 text-gray-900'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <item.icon className="h-4 w-4 mr-1.5" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right side items */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* New Reminder Button */}
            <button
              onClick={onNewReminderClick}
              className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none transition-colors"
              title="New Reminder"
            >
              <Plus className="h-5 w-5" />
            </button>

            {/* Time and Location */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg">
                <Clock className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium text-gray-700">{timeStr}</span>
              </div>
              
              <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg max-w-[160px]">
                <MapPin className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium text-gray-700 truncate">
                  {locLoading ? '...' : (locationLabel || 'Location off')}
                </span>
              </div>
            </div>

            {/* Mobile time/location */}
            <div className="sm:hidden flex items-center space-x-2">
              <div className="flex items-center space-x-1 px-2 py-1 bg-gray-50 rounded-lg">
                <Clock className="h-3.5 w-3.5 text-indigo-600" />
                <span className="text-xs font-medium text-gray-700">{timeStr}</span>
              </div>
            </div>

            {/* Received Reminders button */}
            <button
              onClick={onReceivedRemindersClick}
              className="relative p-1.5 rounded-full bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
              title="Received Reminders"
            >
              <Phone className="h-5 w-5" />
              {receivedCallsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {receivedCallsCount}
                </span>
              )}
            </button>

            {/* Call History button */}
            <button
              onClick={onCallHistoryClick}
              className="relative p-1.5 rounded-full bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
              title="Call History"
            >
              <History className="h-5 w-5" />
              {missedCallsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {missedCallsCount}
                </span>
              )}
            </button>

            {/* Settings button */}
            <button
              onClick={onSettingsClick}
              className="p-1.5 rounded-full bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white border-t border-gray-100"
          >
            <div className="pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id as 'home' | 'reminders' | 'insights');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-2 text-base font-medium ${
                    activeTab === item.id
                      ? 'bg-indigo-50 text-indigo-700 border-r-4 border-indigo-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.label}
                </button>
              ))}
              
              {/* Mobile location */}
              <div className="px-4 py-3 border-t border-gray-100">
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin className="flex-shrink-0 mr-2 h-4 w-4 text-indigo-600" />
                  <span className="truncate">
                    {locLoading ? 'Detecting location...' : (locationLabel || 'Location not available')}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
