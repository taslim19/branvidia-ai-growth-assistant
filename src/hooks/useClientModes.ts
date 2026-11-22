"use client";

import { useEffect, useState } from "react";
import { isMockModeClient } from "@/lib/apiClient";
import { profileDataModeClient, type ProfileDataModeClient } from "@/lib/clientConfig";

export interface ClientModes {
  /** True: fully simulated demo, no real Google anything. */
  useMock: boolean;
  /** Where business profile/reviews/photos come from. */
  profileData: ProfileDataModeClient;
}

/**
 * The deployment's mode config, read after mount from the values the server
 * injected into the page. The initial render assumes the credential-free
 * demo defaults so server and first client render agree.
 */
export function useClientModes(): ClientModes {
  const [modes, setModes] = useState<ClientModes>({ useMock: true, profileData: "mock" });
  useEffect(() => {
    setModes({ useMock: isMockModeClient(), profileData: profileDataModeClient() });
  }, []);
  return modes;
}
