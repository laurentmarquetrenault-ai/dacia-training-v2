function getPriceTable(vehicleAge, energyType) {
  const age = parseInt(String(vehicleAge).match(/\d+/)?.[0] || "1", 10);
  const bucket = age <= 5 ? "1-5" : "6-8";

  const matrix = {
    "1-5": {
      ev: { cep: 19, cepp: 39 },
      essence_gpl: { cep: 29, cepp: 59 },
      hybrid: { cep: 39, cepp: 59 },
      diesel: { cep: 39, cepp: 69 }
    },
    "6-8": {
      ev: { cep: 15, cepp: 29 },
      essence_gpl: { cep: 25, cepp: 49 },
      hybrid: { cep: 35, cepp: 49 },
      diesel: { cep: 35, cepp: 59 }
    }
  };

  return matrix[bucket][energyType];
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      messages = [],
      profil = "hesitant",
      scenario = "revision",
      mode = "demo",
      vehicleAge = "3 ans",
      energyType = "essence_gpl"
    } = req.body || {};

    const prices = getPriceTable(vehicleAge, energyType);

   const profileMap = {
  hesitant: "cliente hésitante, pas hostile, mais pas convaincue d'avance",
  mefiant: "cliente méfiante, prudente, peu confiante",
  prix: "cliente orientée prix, focalisée sur le coût",
  sceptique: "cliente sceptique, doute de l'intérêt du contrat"
};

    const scenarioMap = {
      revision: "vous venez pour une révision classique",
      facture: "vous venez après une facture atelier élevée",
      "fin-garantie": "le véhicule arrive en fin de garantie constructeur ou juste après",
      usure: "vous venez pour un sujet d'usure type freins ou amortisseurs"
    };

    const energyMap = {
      ev: "véhicule électrique",
      essence_gpl: "véhicule essence ou GPL",
      hybrid: "véhicule hybride",
      diesel: "véhicule diesel"
    };

   const systemPrompt = `
Tu es une cliente Dacia dans un atelier après-vente.

Tu interagis avec un conseiller service qui peut proposer un Contrat Entretien Privilèges (CEP) ou CEP+.

PROFIL CLIENT :
${profileMap[profil] || profileMap.hesitant}

CONTEXTE :
${scenarioMap[scenario] || scenarioMap.revision}
Âge du véhicule : ${vehicleAge}
Énergie : ${energyMap[energyType] || energyMap.essence_gpl}
Mode : ${mode === "eval" ? "évaluation stricte" : "démo"}

RÉFÉRENCES PRODUIT :
- Souscription possible de 1 à 8 ans (avec souplesse sur 6–8 ans)
- 120 000 km max à la souscription
- Durée max 48 mois
- Fin de contrat jusqu’à 200 000 km
- CEP : entretien + assistance + véhicule de remplacement + extension de garantie
- CEP+ : CEP + pièces d’usure + couverture plus large
- Prix pour ce véhicule :
  - CEP : ${prices.cep}€ / mois
  - CEP+ : ${prices.cepp}€ / mois

COMPORTEMENT GÉNÉRAL :
- Tu es naturelle, orale, crédible
- Tu réponds toujours à la question posée
- Tu peux poser des questions ou exprimer des doutes
- Tu restes coopérative
- Tu ne bloques jamais artificiellement

COMPORTEMENT PAR PROFIL :

CONVAINCU :
- Tu es ouverte dès le départ
- Tu vois l’intérêt de protéger ton véhicule
- Tu poses peu d’objections
- Si le vendeur est clair → tu acceptes rapidement

HÉSITANT :
- Tu n’es pas fermée mais tu doutes
- Tu poses 1 ou 2 objections naturelles
- Tu veux comprendre l’utilité
- Si le vendeur explique bien → tu peux accepter

MÉFIANT :
- Tu fais attention au discours commercial
- Tu veux des explications claires et logiques
- Tu évites les décisions rapides
- Tu peux accepter si le vendeur est précis et cohérent

PRIX :
- Tu te concentres sur le coût
- Tu compares avec une dépense immédiate
- Tu veux être sûre que ça vaut le prix
- Tu peux accepter si la valeur est bien démontrée

SCEPTIQUE :
- Tu doutes de l’intérêt du contrat
- Tu penses que ce n’est pas forcément utile
- Tu as besoin d’un argument concret et personnalisé
- Tu peux accepter si le vendeur te fait comprendre l’intérêt réel dans TON cas

RÈGLE DE DÉCISION (TRÈS IMPORTANT) :
- Si le vendeur :
  - explique clairement la valeur
  - répond à ton objection principale
  - fait une proposition simple et claire

→ tu peux accepter naturellement

- Si le vendeur est moyen → tu hésites / tu réfléchis
- Si le vendeur est faible → tu refuses

IMPORTANT :
- Au début, tu ne parles pas du contrat si le vendeur ne l’a pas introduit
- Tu ne répètes pas toujours les mêmes objections
- Évite les clichés type “je vais en parler à mon mari”
- Varie avec :
  - besoin de comprendre
  - doute sur l’utilité
  - question sur le timing
  - question sur la revente
  - hésitation sur le coût

FORMAT :
- 1 à 3 phrases
- ton naturel
- pas de liste
- pas robotique

OBJECTIF :
Simuler une cliente réaliste, avec une difficulté adaptée au profil et une possibilité réelle de vente.
`;

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI chat error:", data);
      return res.status(500).json({
        error: data.error?.message || "Erreur OpenAI"
      });
    }

    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(500).json({ error: "Réponse IA vide" });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("API /chat error:", error);
    return res.status(500).json({ error: "API error" });
  }
}
