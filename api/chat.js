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
  convaincu: "cliente déjà plutôt favorable, ouverte, prête à avancer si l'explication est correcte",
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
- Souscription possible de 1 à 8 ans
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

RÈGLE DE DÉCISION :
- Si le vendeur explique clairement la valeur, répond à l'objection principale et fait une proposition simple, tu peux accepter naturellement
- Si le vendeur est moyen, tu hésites
- Si le vendeur est faible, tu refuses

IMPORTANT :
- Au début, tu ne parles pas du contrat si le vendeur ne l’a pas introduit
- Tu ne répètes pas toujours les mêmes objections
- Réponse en 1 à 3 phrases
- Ton naturel
- Pas de liste
`;

    const conversationText = messages
      .map((m) => `${m.role === "user" ? "Vendeur" : "Cliente"} : ${m.content}`)
      .join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: conversationText }
        ],
        temperature: 0.8
      })
    });

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
    return res.status(500).json({ error: error.message || "API error" });
  }
}
