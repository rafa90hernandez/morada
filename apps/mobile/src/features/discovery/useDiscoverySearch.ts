import { useCallback } from "react";

import { searchListings, searchListingsAuthenticated } from "@/api/client";
import type { ListingSearchFilters } from "@/api/types";
import { useSession } from "@/session/SessionContext";

export function useDiscoverySearch() {
  const { session } = useSession();

  return useCallback(
    (filters: ListingSearchFilters) =>
      session
        ? searchListingsAuthenticated(filters, session.accessToken)
        : searchListings(filters),
    [session],
  );
}
