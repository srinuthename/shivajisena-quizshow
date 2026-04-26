import { useState, useEffect } from "react";
import { ADMIN_SETTINGS_UPDATED_EVENT, readMirroredAdminSettingSync, writeMirroredAdminSetting } from "@/lib/adminConfigPersistence";

export const useTVMode = () => {
  const [tvModeEnabled, setTvModeEnabled] = useState(() => {
    return readMirroredAdminSettingSync<boolean>("tvModeEnabled", true);
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setTvModeEnabled(readMirroredAdminSettingSync<boolean>("tvModeEnabled", true));
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also listen for custom event for same-tab updates
    window.addEventListener("tvModeChanged", handleStorageChange);
    window.addEventListener(ADMIN_SETTINGS_UPDATED_EVENT, handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("tvModeChanged", handleStorageChange);
      window.removeEventListener(ADMIN_SETTINGS_UPDATED_EVENT, handleStorageChange);
    };
  }, []);

  return { tvModeEnabled };
};

// Helper to update TV mode and dispatch event
export const setTVMode = (enabled: boolean) => {
  void writeMirroredAdminSetting("tvModeEnabled", enabled).finally(() => {
    window.dispatchEvent(new Event("tvModeChanged"));
  });
};
