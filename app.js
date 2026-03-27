let messages = [];
let trust = 50;
let finished = false;
let evaluationShown = false;
let lastClientReply = "";

const chat = document.getElementById("chat");
const trustBar = document.getElementById("trust");
const trustText = document.getElementById("trustText");
const avatar = document.getElementById("avatar");
const input = document.getElementById("input");
const modeSelect = document.getElementById("mode");
const profilSelect = document.getElementById("profil");
const scenarioSelect = document.getElementById("scenario");
const vehicleAgeSelect = document.getElementById("vehicleAge");
const energyTypeSelect = document.getElementById("energyType");
const endMessage = document.getElementById("endMessage");
const sendBtn = document.getElementById("sendBtn");
const finishBtn = document.getElementById("finishDemoBtn");
const newBtn = document.getElementById("newDemoBtn");
const evalBtn = document.getElementById("evalBtn");
const endTitle = document.getElementById("endTitle");
const endSubtitle = document.getElementById("endSubtitle");
const modeBadge = document.getElementById("modeBadge");
const helpRecommendation = document.getElementById("helpRecommendation");
const helpAngle = document.getElementById("helpAngle");
const cepPrice = document.getElementById("cepPrice");
const ceppPrice = document.getElementById("ceppPrice");
const briefText = document.getElementById("briefText");
const toggleHelpBtn = document.getElementById("toggleHelpBtn");

const avatarByState = {
  happy: "/images/happy.jpg",
  neutral: "/images/neutral.jpg",
  angry: "/images/angry.jpg"
};

const skills = {
  welcome: false,
  discovery: false,
  argumentation: false,
  objection: false,
  closing: false
};

const skillLabels = {
  welcome: "Accueil",
  discovery: "Découverte",
  argumentation: "Argumentation",
  objection: "Objections",
  closing: "Conclusion"
};

const priceMatrix = {
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

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, "<br>");
}

function display(text, role = "client") {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;

  const roleLabel =
    role === "seller" ? "Vendeur" :
    role === "coach" ? "Coach" :
    "Cliente";

  bubble.innerHTML = `<span class="role">${roleLabel}</span>${escapeHtml(text)}`;
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
}

function resetTrustUI() {
  trustBar.style.width = `${trust}%`;
  trustText.textContent = `${trust}%`;
}

function updateAvatar() {
  if (trust > 70) {
    avatar.src = avatarByState.happy;
  } else if (trust > 40) {
    avatar.src = avatarByState.neutral;
  } else {
    avatar.src = avatarByState.angry;
  }
}

function getAgeNumber() {
  const raw = vehicleAgeSelect.value || "1 an";
  const match = raw.match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
}

function getAgeBucket() {
  return getAgeNumber() <= 5 ? "1-5" : "6-8";
}

function getSelectedPrices() {
  const bucket = getAgeBucket();
  const energy = energyTypeSelect.value;
  return priceMatrix[bucket][energy];
}

function updateHelpPrices() {
  const prices = getSelectedPrices();
  cepPrice.textContent = `${prices.cep}€ / mois`;
  ceppPrice.textContent = `${prices.cepp}€ / mois`;

  const scenario = scenarioSelect.value;
  const age = getAgeNumber();

  let reco = "CEP si client surtout sensible à l’entretien, CEP+ si besoin de couverture plus large.";
  let angle = "Budget maîtrisé pendant 48 mois, assistance 24/7, entretien dans le réseau, revente facilitée.";

  if (scenario === "usure" || scenario === "facture") {
    reco = "CEP+ recommandé : scénario usure ou facture élevée, la couverture renforcée a plus de sens.";
    angle = "Mets l’accent sur les pièces d’usure, la tranquillité et l’évitement des grosses factures imprévues.";
  } else if (scenario === "fin-garantie" && age >= 3 && age <= 7) {
    reco = "Pense à valoriser la protection prolongée et l’intérêt de sécuriser le véhicule à la fin de la garantie constructeur.";
    angle = "Question utile : Et si votre garantie pouvait aller jusqu’à 7 ans ?";
  }

  helpRecommendation.textContent = reco;
  helpAngle.textContent = angle;
}

function updateModeUI() {
  const isEval = modeSelect.value === "eval";

  modeBadge.textContent = isEval ? "Mode Évaluation" : "Mode Démo";
  finishBtn.textContent = isEval ? "Terminer la simulation" : "Terminer la démo";
  newBtn.textContent = isEval ? "Nouvelle simulation" : "Nouvelle démo";
  endTitle.textContent = isEval ? "Fin de simulation" : "Fin de démo";
  endSubtitle.textContent = isEval
    ? "La discussion est terminée. Lance maintenant l’évaluation."
    : "La discussion est terminée. Tu peux consulter l’évaluation si tu veux.";
}

function renderSkills() {
  Object.keys(skills).forEach((key) => {
    const star = document.getElementById(`skill-${key}`);
    if (!star) return;

    star.classList.toggle("active", skills[key]);
    star.setAttribute("aria-checked", skills[key] ? "true" : "false");
    star.title = `${skillLabels[key]} : ${skills[key] ? "validé" : "non validé"}`;
  });
}

function resetSkills() {
  Object.keys(skills).forEach((key) => {
    skills[key] = false;
  });
  renderSkills();
}

function setSkill(key) {
  if (!skills[key]) {
    skills[key] = true;
    renderSkills();
  }
}

function generateBrief() {
  const scenario = scenarioSelect.value;
  const age = vehicleAgeSelect.value;
  const mode = modeSelect.value;
  const isEval = mode === "eval";

  let text = "";

  if (scenario === "revision") {
    text = `Vous attendez Madame Dubois pour une révision.
Son véhicule (${age}) est éligible au Contrat Entretien Privilèges.
${isEval ? "Votre objectif est de mener un échange complet et structuré." : "À vous de mener l’échange et de proposer la solution adaptée."}`;
  } else if (scenario === "facture") {
    text = `Vous recevez une cliente après une facture atelier élevée.
Son véhicule (${age}) est éligible au contrat d’entretien.
${isEval ? "Vous serez évalué sur votre capacité à rassurer et argumenter." : "À vous de sécuriser votre argumentation."}`;
  } else if (scenario === "fin-garantie") {
    text = `Vous recevez une cliente dont le véhicule arrive en fin de garantie.
Son véhicule (${age}) est éligible à une solution de protection.
${isEval ? "Vous serez évalué sur la découverte, l’argumentation et la conclusion." : "À vous de jouer."}`;
  } else if (scenario === "usure") {
    text = `Vous recevez une cliente pour un sujet d’usure.
Son véhicule (${age}) est éligible au contrat d’entretien.
${isEval ? "Vous serez évalué sur la pertinence de votre recommandation." : "À vous d’amener la bonne couverture."}`;
  }

  briefText.innerHTML = text.replace(/\n/g, "<br>");
}

function resetDemo() {
  messages = [];
  trust = 50;
  finished = false;
  evaluationShown = false;
  lastClientReply = "";

  chat.innerHTML = "";
  generateBrief();

  const firstMessage = "Bonjour";
  display(firstMessage, "client");

  messages.push({
    role: "assistant",
    content: firstMessage
  });

  lastClientReply = firstMessage;

  input.disabled = false;
  sendBtn.disabled = false;
  input.value = "";
  endMessage.classList.add("hidden");

  resetTrustUI();
  updateAvatar();
  resetSkills();
  updateModeUI();
  updateHelpPrices();

  input.focus();
}

function toggleHelp() {
  const helpBox = document.getElementById("helpBox");
  if (helpBox) helpBox.classList.toggle("hidden");
}

function updateTrustFromSellerMessage(text) {
  const t = text.toLowerCase();

  let delta = -4;

  const goodSignals = [
    "budget", "mensual", "48 mois", "garantie", "assistance",
    "révision", "entretien", "usure", "tranquille", "tranquillité",
    "revente", "protéger", "éviter", "facture", "cep", "cep+",
    "vous roulez", "quel usage", "kilométr", "devis", "couverture",
    "pièces d'usure", "valeur de revente", "réseau", "dacia zen",
    "véhicule de remplacement", "hors garantie", "extension de garantie"
  ];

  const badSignals = [
    "comme vous voulez",
    "je sais pas",
    "aucune idée",
    "faites comme vous voulez",
    "c'est vous qui voyez"
  ];

  const hasGood = goodSignals.some((word) => t.includes(word));
  const hasBad = badSignals.some((word) => t.includes(word));

  if (hasGood) delta = 8;
  if (hasBad) delta = -12;

  trust += delta;
  if (trust > 100) trust = 100;
  if (trust < 0) trust = 0;

  resetTrustUI();
  updateAvatar();
}

function sellerLooksLikeWelcome(text) {
  const t = text.toLowerCase();
  const greeting = /(bonjour|bonsoir|madame|monsieur|bienvenue)/.test(t);
  const context = /(rendez[- ]?vous|révision|atelier|véhicule|voiture|entretien)/.test(t);
  return greeting && context;
}

function sellerLooksLikeDiscovery(text) {
  const t = text.toLowerCase();
  const discoverySignals = [
    "combien de kilomètres",
    "kilométr",
    "vous roulez",
    "quel usage",
    "vous gardez",
    "depuis quand",
    "autoroute",
    "trajets courts",
    "combien de temps",
    "vous comptez la garder",
    "qu'est-ce qui vous freine",
    "qu'est-ce qui vous fait hésiter",
    "immatriculation",
    "quelle utilisation"
  ];

  return discoverySignals.some((q) => t.includes(q));
}

function sellerLooksLikeArgumentation(text) {
  const t = text.toLowerCase();

  const mentionProduct = t.includes("cep") || t.includes("cep+") || t.includes("contrat entretien") || t.includes("contrat d'entretien");
  const mentionBenefit = [
    "budget maîtrisé",
    "mensual",
    "assistance",
    "24/24",
    "24/7",
    "revente",
    "tranquillité",
    "pièces d'usure",
    "hors garantie",
    "extension de garantie",
    "véhicule de remplacement",
    "éviter une grosse facture"
  ].some((item) => t.includes(item));

  return mentionProduct && mentionBenefit;
}

function clientRaisedObjection(text) {
  const t = (text || "").toLowerCase();
  const objectionTerms = [
    "trop cher",
    "pas sûre",
    "pas certain",
    "pas convaincue",
    "je vais réfléchir",
    "plus tard",
    "je roule peu",
    "pas nécessaire",
    "je ne sais pas",
    "ça vaut le coup",
    "je préfère attendre",
    "j'hésite",
    "je revends",
    "avant de m'engager",
    "avec mon partenaire"
  ];

  return objectionTerms.some((item) => t.includes(item));
}

function sellerLooksLikeObjectionHandling(text) {
  const t = text.toLowerCase();

  const reassuringTerms = [
    "je comprends",
    "justement",
    "l'idée",
    "le but",
    "cela permet",
    "ça permet",
    "éviter",
    "hors garantie",
    "coûter bien plus",
    "lié au temps",
    "valeur de revente",
    "tout est couvert",
    "tranquillité",
    "vous protéger",
    "révision déjà faite",
    "pas seulement aux kilomètres"
  ];

  return reassuringTerms.some((item) => t.includes(item));
}

function sellerLooksLikeClosing(text) {
  const t = text.toLowerCase();
  const closingTerms = [
    "on le met en place",
    "on part dessus",
    "je vous le mets",
    "je vous prépare le devis",
    "je vous fais le devis",
    "est-ce qu'on le met en place",
    "est-ce qu'on part dessus",
    "souhaitez-vous",
    "vous souhaitez qu'on",
    "on valide",
    "on lance",
    "on souscrit",
    "on l'ajoute",
    "on fait le contrat",
    "je peux vous l'intégrer"
  ];

  return closingTerms.some((item) => t.includes(item));
}

function updateSkillsFromSellerMessage(text) {
  if (sellerLooksLikeWelcome(text)) {
    setSkill("welcome");
  }

  if (sellerLooksLikeDiscovery(text)) {
    setSkill("discovery");
  }

  if (sellerLooksLikeArgumentation(text)) {
    setSkill("argumentation");
  }

  if (clientRaisedObjection(lastClientReply) && sellerLooksLikeObjectionHandling(text)) {
    setSkill("objection");
  }

  if (sellerLooksLikeClosing(text)) {
    setSkill("closing");
  }
}

function finishSession() {
  finished = true;
  input.disabled = true;
  sendBtn.disabled = true;
  endMessage.classList.remove("hidden");
}

async function send() {
  if (finished) return;

  const val = input.value.trim();
  if (!val) return;

  input.value = "";

  display(val, "seller");
  messages.push({
    role: "user",
    content: val
  });

  updateTrustFromSellerMessage(val);
  updateSkillsFromSellerMessage(val);

  const payload = {
    messages,
    profil: profilSelect.value,
    scenario: scenarioSelect.value,
    mode: modeSelect.value,
    vehicleAge: vehicleAgeSelect.value,
    energyType: energyTypeSelect.value,
    liveSkills: skills
  };

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      display(data.error || "Erreur serveur.", "client");
      return;
    }

    if (!data.reply) {
      display("Erreur : réponse IA invalide.", "client");
      return;
    }

    const reply = data.reply.trim();
    lastClientReply = reply;

    display(reply, "client");
    messages.push({
      role: "assistant",
      content: reply
    });
  } catch (err) {
    console.error(err);
    display("Erreur réseau ou serveur.", "client");
  }
}

function finishDemo() {
  finishSession();
}

async function evaluate() {
  if (evaluationShown) return;

  try {
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        conversation: messages,
        trust,
        mode: modeSelect.value,
        profil: profilSelect.value,
        scenario: scenarioSelect.value,
        vehicleAge: vehicleAgeSelect.value,
        energyType: energyTypeSelect.value,
        liveSkills: skills
      })
    });

    const data = await res.json();

    if (!res.ok || !data.evaluation) {
      display(data.error || "Erreur : évaluation invalide.", "coach");
      return;
    }

    evaluationShown = true;
    endMessage.classList.add("hidden");
    display(data.evaluation, "coach");
  } catch (err) {
    console.error(err);
    display("Erreur pendant l’évaluation.", "coach");
  }
}

function onSettingsChange() {
  resetDemo();
}

modeSelect.addEventListener("change", onSettingsChange);
profilSelect.addEventListener("change", onSettingsChange);
scenarioSelect.addEventListener("change", onSettingsChange);
vehicleAgeSelect.addEventListener("change", onSettingsChange);
energyTypeSelect.addEventListener("change", onSettingsChange);

sendBtn.addEventListener("click", send);
finishBtn.addEventListener("click", finishDemo);
newBtn.addEventListener("click", resetDemo);
evalBtn.addEventListener("click", evaluate);
toggleHelpBtn.addEventListener("click", toggleHelp);

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    send();
  }
});

resetDemo();
