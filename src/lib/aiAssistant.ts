const KEYWORD_MAP: Record<string, string[]> = {
  rapport: ['rapport', 'analyse', 'synthese', 'bilan'],
  budget: ['budget', 'finance', 'comptabilite', 'depenses', 'recettes'],
  facture: ['facture', 'paiement', 'montant', 'fournisseur'],
  contrat: ['contrat', 'accord', 'convention', 'signature'],
  proces: ['proces-verbal', 'reunion', 'deliberation', 'compte-rendu'],
  lettre: ['correspondance', 'courrier', 'lettre', 'communication'],
  note: ['note', 'memo', 'information', 'directive'],
  decision: ['decision', 'arrete', 'deliberation', 'resolution'],
  planning: ['planning', 'calendrier', 'programme', 'agenda'],
  formation: ['formation', 'stage', 'attestation', 'certification'],
  emploi: ['emploi', 'recrutement', 'candidature', 'poste'],
  conge: ['conge', 'absence', 'permission', 'autorisation'],
  inventaire: ['inventaire', 'stock', 'materiel', 'equipement'],
  projet: ['projet', 'etude', 'proposition', 'initiative'],
  evaluation: ['evaluation', 'appreciation', 'notation', 'performance'],
};

const CATEGORY_MAP: Record<string, string> = {
  budget: 'Finances',
  facture: 'Finances',
  comptabilite: 'Finances',
  depense: 'Finances',
  recette: 'Finances',
  tresorerie: 'Finances',
  banque: 'Finances',
  paiement: 'Finances',
  salaire: 'Ressources Humaines',
  emploi: 'Ressources Humaines',
  recrutement: 'Ressources Humaines',
  conge: 'Ressources Humaines',
  formation: 'Ressources Humaines',
  stage: 'Ressources Humaines',
  personnel: 'Ressources Humaines',
  evaluation: 'Ressources Humaines',
  rapport: 'Administratif',
  lettre: 'Administratif',
  note: 'Administratif',
  decision: 'Administratif',
  arrete: 'Administratif',
  circulaire: 'Administratif',
  courrier: 'Administratif',
  proces: 'Administratif',
  reunion: 'Administratif',
  projet: 'Projets',
  etude: 'Projets',
  proposition: 'Projets',
  planning: 'Projets',
  programme: 'Projets',
};

export function suggestKeywords(title: string, existingKeywords: string[] = []): string[] {
  const titleLower = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const suggestions = new Set<string>();

  for (const [trigger, keywords] of Object.entries(KEYWORD_MAP)) {
    if (titleLower.includes(trigger)) {
      keywords.forEach((kw) => suggestions.add(kw));
    }
  }

  const words = titleLower.split(/[\s\-_,.']+/).filter((w) => w.length > 3);
  words.forEach((word) => {
    if (!['pour', 'dans', 'avec', 'sans', 'cette', 'entre', 'avant', 'apres'].includes(word)) {
      suggestions.add(word);
    }
  });

  return Array.from(suggestions)
    .filter((kw) => !existingKeywords.map((k) => k.toLowerCase()).includes(kw.toLowerCase()))
    .slice(0, 8);
}

export function suggestCategory(title: string, categories: { id: string; name: string }[]): string | null {
  const titleLower = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let bestMatch = '';
  for (const [trigger, categoryName] of Object.entries(CATEGORY_MAP)) {
    if (titleLower.includes(trigger)) {
      bestMatch = categoryName;
      break;
    }
  }

  if (bestMatch) {
    const match = categories.find(
      (c) => c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === bestMatch.toLowerCase()
    );
    if (match) return match.id;
  }

  return null;
}

export function generateDescription(title: string, fileType: string, keywords: string[]): string {
  const typeLabels: Record<string, string> = {
    pdf: 'Document PDF',
    doc: 'Document Word',
    docx: 'Document Word',
    jpg: 'Image',
    jpeg: 'Image',
    png: 'Image',
    xls: 'Feuille de calcul',
    xlsx: 'Feuille de calcul',
  };

  const typeLabel = typeLabels[fileType.toLowerCase()] || 'Document';
  const keywordStr = keywords.length > 0 ? ` - ${keywords.slice(0, 3).join(', ')}` : '';

  return `${typeLabel}: ${title}${keywordStr}`;
}

export function getSmartSuggestions(title: string): {
  keywords: string[];
  categoryHint: string;
  description: string;
} {
  const keywords = suggestKeywords(title);
  const titleLower = title.toLowerCase();

  let categoryHint = 'Administratif';
  for (const [trigger, cat] of Object.entries(CATEGORY_MAP)) {
    if (titleLower.includes(trigger)) {
      categoryHint = cat;
      break;
    }
  }

  return {
    keywords,
    categoryHint,
    description: generateDescription(title, 'pdf', keywords),
  };
}
