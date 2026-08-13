import { searchListings, searchListingsAuthenticated } from "@/api/client";
import type { ListingSearchFilters } from "@/api/types";
import { useSession } from "@/session/SessionContext";

export function useDiscoverySearch() {
  const { session } = useSession();

  return (filters: ListingSearchFilters) =>
    session
      ? searchListingsAuthenticated(filters, session.accessToken)
      : searchListings(filters);
}
