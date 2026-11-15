import { useQuery } from "@tanstack/react-query";

import { CHARACTERS, findCharacter, type Character } from "@/lib/characters";
import { characterApi } from "@/lib/lonagram";

// Character Twins from the server, with the bundled list shown until it arrives.
export function useCharacters() {
  const query = useQuery({
    queryKey: ["characters"],
    queryFn: () => characterApi.list(),
    placeholderData: CHARACTERS,
    staleTime: 60 * 60 * 1000,
  });
  return { characters: query.data ?? CHARACTERS, loading: query.isPlaceholderData && query.isFetching };
}

export function useCharacter(slug: string | undefined): { character: Character | undefined; loading: boolean } {
  const { characters, loading } = useCharacters();
  return { character: findCharacter(slug, characters), loading };
}
