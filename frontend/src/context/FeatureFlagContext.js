import { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../lib/utils';

const FeatureFlagContext = createContext(null);

export function FeatureFlagProvider({ children }) {
  const [flags, setFlags] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const flagsData = await apiRequest('/feature-flags');
        const flagsMap = {};
        flagsData.forEach(flag => {
          flagsMap[flag.name] = flag.is_enabled;
        });
        setFlags(flagsMap);
      } catch (error) {
        console.error('Failed to fetch feature flags:', error);
        // Default all flags to false on error
        setFlags({
          blog: false,
          forum: false,
          gamification: false,
          solar: false,
          water: false,
          waste: false,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFlags();
  }, []);

  const isEnabled = (flagName) => {
    return flags[flagName] === true;
  };

  const refreshFlags = async () => {
    try {
      const flagsData = await apiRequest('/feature-flags');
      const flagsMap = {};
      flagsData.forEach(flag => {
        flagsMap[flag.name] = flag.is_enabled;
      });
      setFlags(flagsMap);
    } catch (error) {
      console.error('Failed to refresh feature flags:', error);
    }
  };

  return (
    <FeatureFlagContext.Provider value={{ flags, isEnabled, loading, refreshFlags }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
}
