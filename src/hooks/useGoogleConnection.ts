"use client";

import { useCallback, useEffect, useState } from "react";
import type { BusinessLocation, BusinessProfile, GoogleAccount } from "@/types";
import {
  disconnectGoogle,
  getBusinessProfile,
  listBusinessLocations,
  startGoogleConnect,
} from "@/lib/apiClient";

const CONNECTION_KEY = "branvidia:google-connection";

export interface StoredConnection {
  account: GoogleAccount;
  location: BusinessLocation;
}

export function readStoredConnection(): StoredConnection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONNECTION_KEY);
    return raw ? (JSON.parse(raw) as StoredConnection) : null;
  } catch {
    return null;
  }
}

export type ConnectStage =
  | "idle"
  | "account-picker"
  | "permissions"
  | "connecting"
  | "location-picker"
  | "summary";

export interface UseGoogleConnection {
  stage: ConnectStage;
  accounts: GoogleAccount[];
  account: GoogleAccount | null;
  locations: BusinessLocation[];
  location: BusinessLocation | null;
  profile: BusinessProfile | null;
  loading: boolean;
  error: string | null;
  /** True after a successful disconnect: stops the auto-begin loop and lets
   *  the page show a disconnected state instead of restarting the picker. */
  ended: boolean;
  begin: () => Promise<void>;
  pickAccount: (account: GoogleAccount) => void;
  allow: () => Promise<void>;
  cancel: () => void;
  cancelled: boolean;
  pickLocation: (location: BusinessLocation) => Promise<void>;
  /** Throws when the disconnect call fails so callers can show the error. */
  disconnect: () => Promise<void>;
  retry: () => void;
}

export function useGoogleConnection(): UseGoogleConnection {
  const [stage, setStage] = useState<ConnectStage>("idle");
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [account, setAccount] = useState<GoogleAccount | null>(null);
  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [location, setLocation] = useState<BusinessLocation | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [ended, setEnded] = useState(false);

  const begin = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCancelled(false);
    setEnded(false);
    try {
      const { accounts: accs } = await startGoogleConnect();
      setAccounts(accs);
      setStage("account-picker");
    } catch {
      setError("Couldn’t start the Google connection. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const pickAccount = useCallback((acc: GoogleAccount) => {
    setAccount(acc);
    setStage("permissions");
  }, []);

  const allow = useCallback(async () => {
    if (!account) return;
    setStage("connecting");
    setError(null);
    try {
      const locs = await listBusinessLocations(account.id);
      setLocations(locs);
      setStage("location-picker");
    } catch {
      setError("The connection dropped before your businesses loaded. Nothing was connected. Try again.");
      setStage("permissions");
    }
  }, [account]);

  const cancel = useCallback(() => {
    setCancelled(true);
    setAccount(null);
    setStage("idle");
  }, []);

  const pickLocation = useCallback(async (loc: BusinessLocation) => {
    setLocation(loc);
    setLoading(true);
    setError(null);
    try {
      const prof = await getBusinessProfile(loc.id);
      setProfile(prof);
      try {
        if (account) {
          window.localStorage.setItem(
            CONNECTION_KEY,
            JSON.stringify({ account, location: loc } satisfies StoredConnection),
          );
        }
      } catch {
        // best-effort persistence
      }
      setStage("summary");
    } catch {
      setError("The profile didn’t load. Pick the location again to retry.");
    } finally {
      setLoading(false);
    }
  }, [account]);

  const disconnect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await disconnectGoogle();
    } catch {
      setLoading(false);
      // Propagate so the button does not show a success toast on failure.
      throw new Error("Disconnect didn’t complete. Try again.");
    }
    setAccount(null);
    setLocation(null);
    setProfile(null);
    setStage("idle");
    setEnded(true);
    setLoading(false);
    try {
      window.localStorage.removeItem(CONNECTION_KEY);
    } catch {
      // best-effort
    }
  }, []);

  const retry = useCallback(() => {
    setError(null);
    void begin();
  }, [begin]);

  return {
    stage,
    accounts,
    account,
    locations,
    location,
    profile,
    loading,
    error,
    ended,
    begin,
    pickAccount,
    allow,
    cancel,
    cancelled,
    pickLocation,
    disconnect,
    retry,
  };
}

// Restore an existing connection marker on pages that need to know.
export function useStoredConnection(): StoredConnection | null {
  const [conn, setConn] = useState<StoredConnection | null>(null);
  useEffect(() => {
    setConn(readStoredConnection());
  }, []);
  return conn;
}
