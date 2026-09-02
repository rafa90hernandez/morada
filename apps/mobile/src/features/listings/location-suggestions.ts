export const irelandCitySuggestions = [
  "Dublin", "Cork", "Galway", "Limerick", "Waterford", "Kilkenny", "Drogheda", "Swords",
  "Dundalk", "Bray", "Navan", "Ennis", "Tralee", "Carlow", "Naas", "Athlone", "Mullingar",
  "Wexford", "Letterkenny", "Killarney", "Clonmel", "Tullamore", "Portlaoise", "Balbriggan",
];

export function matchingSuggestions(value: string, options: string[], limit = 6) {
  const query = value.trim().toLocaleLowerCase("pt-BR");
  if (!query) return [];
  return options
    .filter((option) => option.toLocaleLowerCase("pt-BR").includes(query))
    .sort((a, b) => Number(!a.toLocaleLowerCase("pt-BR").startsWith(query)) - Number(!b.toLocaleLowerCase("pt-BR").startsWith(query)))
    .slice(0, limit);
}
