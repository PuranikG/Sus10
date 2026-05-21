import { createContext, useContext, useState } from 'react';

export const ROLE_LABELS = {
  homeowner: 'Homeowner',
  rwa: 'RWA',
  vendor: 'Vendor',
};

// Default context so hooks outside the provider degrade gracefully
const PreviewRoleContext = createContext({
  previewRole: null,
  setPreviewRole: () => {},
});

export function PreviewRoleProvider({ children }) {
  const [previewRole, setPreviewRoleState] = useState(
    () => localStorage.getItem('previewRole') || null
  );

  const setPreviewRole = (role) => {
    if (role) {
      localStorage.setItem('previewRole', role);
    } else {
      localStorage.removeItem('previewRole');
    }
    setPreviewRoleState(role || null);
  };

  return (
    <PreviewRoleContext.Provider value={{ previewRole, setPreviewRole }}>
      {children}
    </PreviewRoleContext.Provider>
  );
}

export function usePreviewRole() {
  return useContext(PreviewRoleContext);
}
