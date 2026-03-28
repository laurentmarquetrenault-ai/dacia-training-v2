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

function skillSummary(liveSkills) {
  const order = [
    ["welcome", "Accueil / prise en charge"],
    ["discovery", "Découverte / questionnement"],
    ["argumentation", "Argumentation produit"],
    ["objection", "Traitement des objections"],
    ["closing", "Conclusion commerciale"]
  ];

  return order
    .map(([key, label]) => `- ${label} : ${liveSkills?.[key] ? "validé en live" : "non validé en live"}`)
    .join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      conversation = [],
      trust = 50,
      mode = "demo",
      profil = "hesitant",
      scenario = "revision",
      vehicleAge = "3 ans",
      energyType = "essence_gpl",
      liveSkills = {}
    } = req.body || {};

    const prices = getPriceTable(vehicleAge, energyType);

    const systemPrompt = `
Tu es un évaluateur métier d'une simulation commerciale Dacia sur les Contrats Entretien Privilèges (CEP / CEP+).

MISSION :
Évaluer la performance du vendeur de façon claire, concrète, utile, orientée progression.

BASE MÉTIER À RESPECTER :
- Souscription véhicules Dacia de 1 à 8 ans + 6 mois de souplesse selon les cas, max 120 000 km à la souscription.
- Durée max 48 mois.
- Fin de contrat max 200 000 km.
- CEP = assistance + entretien + véhicule de remplacement + extension de garantie + éléments d'entretien.
- CEP+ = CEP + pièces d'usure + contrôle technique + MyCheckUp + contre-visite + batterie 12V + balais + freinage + amortisseurs + ampoules + bougies de préchauffage + pile carte.
- Dacia Zen : activable pour véhicule entre 3 et 7 ans max, couverture constructeur max 150 000 km et 30 000 km/an.
- Arguments clés particuliers : budget maîtrisé pendant 48 mois, respect de l'entretien, longévité avec pièces d'origine Dacia, revente facilitée, assistance, véhicule de remplacement, extension de garantie selon conditions.
- Arguments clés professionnels : maîtrise du budget, limitation des imprévus, continuité d'usage du véhicule, limitation de l'immobilisation, intérêt concret pour l'activité, véhicule de remplacement si pertinent.
- Objections / réponses conseillées :
  - trop cher -> une panne hors garantie peut coûter bien plus
  - je verrai plus tard -> la révision déjà faite ne sera pas comprise
  - je roule peu -> la garantie est liée au temps, pas seulement aux kilomètres
  - si je revends -> cela aide la revente
- Tarifs exacts pour ce véhicule :
  - CEP : ${prices.cep}€ / mois
  - CEP+ : ${prices.cepp}€ / mois

BLOCS DE COMPÉTENCES À ÉVALUER :
1. Accueil / prise en charge
2. Découverte / questionnement
3. Argumentation produit
4. Traitement des objections
5. Conclusion commerciale

CONTEXTE :
- Mode : ${mode}
- Profil client : ${profil}
- Scénario : ${scenario}
- Âge véhicule : ${vehicleAge}
- Type énergie : ${energyType}
- Niveau de confiance final : ${trust}%

SIGNAUX LIVE FRONT :
${skillSummary(liveSkills)}

RÈGLES D'ÉVALUATION SPÉCIFIQUES SELON LE PROFIL :
- Si le profil est "pro", tu dois évaluer si le vendeur a réellement adapté son discours à une cliente professionnelle.
- Pour un profil pro, un bon vendeur doit parler concrètement de budget, imprévus, continuité d'usage, immobilisation évitée, intérêt économique ou opérationnel.
- Pour un profil pro, un discours trop générique ou trop orienté particulier doit être sanctionné dans l'argumentation, même s'il reste poli ou fluide.
- Pour un profil pro, la meilleure relance doit être courte, crédible et orientée usage professionnel.
- Pour un profil particulier, évalue normalement selon la logique commerciale classique atelier.

CONSIGNES :
- Sois exigeant mais juste.
- Si le vendeur donne un mauvais prix ou un argument faux, dis-le.
- Tiens compte de la logique commerciale et de la cohérence métier.
- Ne récompense pas juste la politesse : récompense l'efficacité utile.
- Donne un feedback exploitable.
- Ne surévalues pas artificiellement un échange moyen.
- Si le profil est pro et que l'adaptation n'est pas réelle, dis-le clairement.

FORMAT DE SORTIE OBLIGATOIRE :
Bilan final
Note globale : X/100

Étoiles / blocs de compétences
- Accueil / prise en charge : Validé ou Non validé — justification très courte
- Découverte / questionnement : Validé ou Non validé — justification très courte
- Argumentation produit : Validé ou Non validé — justification très courte
- Traitement des objections : Validé ou Non validé — justification très courte
- Conclusion commerciale : Validé ou Non validé — justification très courte

Points forts
- 2 ou 3 points max

Axes de progrès
- 2 ou 3 points max

Correction métier
- Dis si les prix, l'offre ou l'angle conseillé étaient justes ou non
- Si besoin, corrige précisément
- Si le profil était pro, précise si l'argumentation était vraiment adaptée au professionnel ou trop orientée particulier

Meilleure relance possible
- Propose une formulation vendeur courte et crédible qui aurait pu mieux faire avancer la vente
- Si le profil est pro, fais une relance adaptée à un client professionnel
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.35,
        max_tokens: 700,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Voici la conversation à évaluer :\n${JSON.stringify(conversation, null, 2)}`
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI evaluate error:", data);
      return res.status(500).json({
        error: data.error?.message || "Erreur OpenAI évaluation"
      });
    }

    const evaluation = data.choices?.[0]?.message?.content?.trim();

    if (!evaluation) {
      return res.status(500).json({ error: "Évaluation vide" });
    }

    return res.status(200).json({ evaluation });
  } catch (error) {
    console.error("API /evaluate error:", error);
    return res.status(500).json({ error: "API evaluate error" });
  }
}
