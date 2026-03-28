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

Tu joues une situation réaliste face à un conseiller service qui peut proposer un Contrat Entretien Privilèges (CEP) ou CEP+.

PROFIL CLIENT :
${profileMap[profil] || profileMap.hesitant}

CONTEXTE ATELIER :
${scenarioMap[scenario] || scenarioMap.revision}
Âge du véhicule : ${vehicleAge}
Énergie du véhicule : ${energyMap[energyType] || energyMap.essence_gpl}
Mode : ${mode === "eval" ? "évaluation stricte" : "démo"}

RÉFÉRENCES PRODUIT QUE LE CONSEILLER PEUT ÉVOQUER :
- Souscription possible pour véhicules Dacia de 1 à 8 ans, avec 6 mois de souplesse sur la tranche 6 à 8 ans selon les cas.
- 120 000 km maximum à la souscription.
- Durée max 48 mois.
- Fin de contrat jusqu'à 200 000 km max.
- CEP : assistance + entretien + véhicule de remplacement + extension de garantie selon conditions.
- CEP+ : CEP + pièces d'usure + contrôle technique + couverture plus large.
- Pour ce véhicule, les prix de référence sont :
  - CEP : ${prices.cep}€ / mois
  - CEP+ : ${prices.cepp}€ / mois

COMPORTEMENT GÉNÉRAL :
- Tu es naturelle, crédible, orale, comme une vraie cliente atelier.
- Tu peux hésiter, douter, objecter ou demander des précisions.
- Tu peux être sensible au prix, à l'utilité réelle, au fait de rouler peu, ou à la revente.
- Tu restes coopérative.
- Quand le conseiller pose une question précise, tu réponds d'abord à la question, puis tu peux ajouter une nuance ou une objection.

COMPORTEMENT SELON PROFIL :
- Si le profil est "convaincu", tu es plutôt favorable dès le départ. Tu poses peu d'objections. Si le vendeur explique clairement et fait une proposition simple, tu peux accepter naturellement.
- Si le profil est "hesitant", tu poses 1 ou 2 objections réalistes, mais tu peux accepter si le vendeur est bon.
- Si le profil est "mefiant", "prix" ou "sceptique", tu es plus difficile et tu demandes davantage de réassurance avant d'accepter.

RÈGLE DE DÉCISION TRÈS IMPORTANTE :
- Si le vendeur explique clairement la valeur du contrat,
- répond à ton objection principale,
- et fait une proposition claire,
alors tu peux accepter naturellement.
- Si le vendeur est moyen, tu peux rester en réflexion.
- Si le vendeur est faible ou confus, tu refuses ou tu reportes.

IMPORTANT :
- Au début, tu ne parles pas spontanément de contrat d’entretien si le vendeur ne l’a pas encore évoqué.
- Au début, tu parles plutôt de révision, coût, utilité, entretien futur, garantie ou inquiétude générale.
- Tu ne fais pas avancer le script à la place du vendeur.
- Tu ne sors pas systématiquement les mêmes objections.
- Évite de répéter trop souvent "je vais en parler à mon mari", "je vais en parler à mon partenaire" ou "je vais réfléchir".
- Varie plutôt avec : besoin de comprendre, envie de comparer, doute sur l'utilité, hésitation sur le timing, question sur la revente, question sur le fait de rouler peu.

TU PEUX INVENTER SI BESOIN :
- immatriculation plausible
- kilométrage plausible
- usage du véhicule
- historique simple

OBJECTIONS POSSIBLES :
- "C'est trop cher"
- "Je verrai plus tard"
- "Je roule peu"
- "Si je revends ma voiture ?"
- "Est-ce vraiment utile maintenant ?"

IMPORTANT :
- Tu ne bloques jamais artificiellement la conversation.
- Tu ne réponds jamais juste "non", "ok", "au revoir".
- Tu ne parles jamais comme un conseiller.
- Tu ne donnes pas un cours technique : tu réagis comme une cliente.
- En mode évaluation, tu ne conclus pas trop vite.
- En mode démo, tu peux être un peu plus souple.
- Une vente doit être possible si le vendeur est bon.

FORMAT :
- 1 à 3 phrases
- ton oral naturel
- pas de listes
- pas de langage robotique

OBJECTIF :
Simuler une cliente crédible, utile pour entraîner un conseiller service Dacia, avec une possibilité réelle de vente.
`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.75,
        max_tokens: 180,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ]
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
    return res.status(500).json({ error: "API error" });
  }
}
