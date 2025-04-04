<template>
  <div class="combat">
    <h2 v-if="!result">Combat en cours</h2>
    <h2 v-else>{{ result === "win" ? "Victoire !" : "Défaite..." }}</h2>

    <div v-if="waitingOpponent" class="waiting">
      <p>{{ waitingMessage }}</p>
      <div class="spinner"></div>
    </div>

    <div v-if="chosenStat" class="chosen-stat">
      <p>
        Statistique choisie : <strong>{{ statLabels[chosenStat] }}</strong> ({{
          statType
        }})
      </p>
    </div>

    <div v-if="!result && !waitingOpponent" class="game-board">
      <div class="deck-status">
        <p>Ton deck : {{ yourDeck }} cartes</p>
        <p>Deck adverse : {{ opponentDeck }} cartes</p>
      </div>

      <div class="message" v-if="gameMessage">
        <p>{{ gameMessage }}</p>
      </div>

      <div class="cards-container">
        <div class="player-area">
          <div v-if="!yourCard" class="draw-pile" @click="drawCard">
            <div class="card-back">
              <span>Cliquer pour piocher</span>
            </div>
          </div>

          <div v-else class="card">
            <h3>Ta carte</h3>
            <img v-if="yourCard.image" :src="yourCard.image" alt="Ta carte" />
            <p>
              <strong>{{ displayName(yourCard) }}</strong>
            </p>
            <ul>
              <li v-if="yourCard.rarete">Rareté : {{ yourCard.rarete }}</li>
              <li v-if="yourCard.nb_acteurs">
                Acteurs : {{ yourCard.nb_acteurs }}
              </li>
              <li v-if="yourCard.nb_films">Films : {{ yourCard.nb_films }}</li>
              <li v-if="yourCard.genre">Genre : {{ yourCard.genre }}</li>
              <li v-if="yourCard.annee">Année : {{ yourCard.annee }}</li>
              <li v-if="yourCard['Debut de carrière']">
                Début de carrière : {{ yourCard["Debut de carrière"] }}
              </li>
              <li v-if="yourCard.nb_genres">
                Genres joués : {{ yourCard.nb_genres }}
              </li>
            </ul>

            <p v-if="currentStat">
              <strong>{{ statLabel }} sélectionnée :</strong>
              {{ statValue(yourCard, currentStat) }}
            </p>
          </div>
        </div>

        <div class="opponent-area">
          <div v-if="!opponentHasDrawn" class="draw-pile opponent">
            <div class="card-back">
              <span>En attente de l'adversaire</span>
            </div>
          </div>

          <div v-else-if="!opponentCard" class="draw-pile opponent">
            <div class="card-back">
              <span>Carte piochée</span>
            </div>
          </div>

          <div v-else class="card">
            <h3>Carte adverse</h3>
            <img
              v-if="opponentCard.image"
              :src="opponentCard.image"
              alt="Carte adverse"
            />
            <p>
              <strong>{{ displayName(opponentCard) }}</strong>
            </p>
            <ul>
              <li v-if="opponentCard.rarete">
                Rareté : {{ opponentCard.rarete }}
              </li>
              <li v-if="opponentCard.nb_acteurs">
                Acteurs : {{ opponentCard.nb_acteurs }}
              </li>
              <li v-if="opponentCard.nb_films">
                Films : {{ opponentCard.nb_films }}
              </li>
              <li v-if="opponentCard.genre">
                Genre : {{ opponentCard.genre }}
              </li>
              <li v-if="opponentCard.annee">
                Année : {{ opponentCard.annee }}
              </li>
              <li v-if="opponentCard['Debut de carrière']">
                Début de carrière : {{ opponentCard["Debut de carrière"] }}
              </li>
              <li v-if="opponentCard.nb_genres">
                Genres joués : {{ opponentCard.nb_genres }}
              </li>
            </ul>

            <p v-if="currentStat">
              <strong>{{ statLabel }} sélectionnée :</strong>
              {{ statValue(opponentCard, currentStat) }}
            </p>
          </div>
        </div>
      </div>

      <div class="round-result" v-if="roundResult">
        <p
          :class="{
            win: roundResult === 'you',
            lose: roundResult === 'opponent',
            draw: roundResult === 'draw',
          }"
        >
          {{
            roundResult === "you"
              ? "Tu gagnes ce tour !"
              : roundResult === "opponent"
              ? "Tu perds ce tour..."
              : "Égalité !"
          }}
        </p>
      </div>
    </div>

    <div v-if="result" class="reward">
      <p>{{ result === "win" ? "+25 gold" : "+5 gold" }}</p>
      <button class="btn-primary" @click="playAgain">Jouer à nouveau</button>
      <router-link to="/home" class="btn-secondary"
        >Retour à l'accueil</router-link
      >
    </div>
  </div>
</template>

<script setup>
import { io } from "socket.io-client";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const socket = ref(null);

const waitingOpponent = ref(true);
const waitingMessage = ref("En attente d'un adversaire...");
const gameId = ref(null);

const yourCard = ref(null);
const opponentCard = ref(null);
const opponentHasDrawn = ref(false);
const currentStat = ref(null);
const roundResult = ref(null);
const gameMessage = ref(null);

const yourDeck = ref(15);
const opponentDeck = ref(15);
const result = ref(null);
const chosenStat = ref(null);
const statType = ref(null);

const statLabels = {
  nb_films: "Films",
  nb_acteurs: "Acteurs",
  rarete: "Rareté",
  annee: "Année",
  "Debut de carrière": "Début de carrière",
  nb_genres: "Genres",
  genre: "Genre",
};

const statLabel = computed(
  () => statLabels[currentStat.value] || currentStat.value
);

const statValue = (card, stat) => {
  if (!card || !stat) return "";
  return stat === "rarete" ? card.rarete || "Commun" : card[stat] || 0;
};

const displayName = (card) => {
  if (!card) return "Carte inconnue";
  return card.type === "film"
    ? card.titre || "Film mystère"
    : card.nom || "Acteur mystère";
};

// 👇 Fonction pour enrichir une carte via une API
const enrichCard = async (card) => {
  if (!card || !card.id || !card.type) return card;
  const endpoint =
    card.type === "film"
      ? `http://localhost:3000/progression/movies/${card.id}/details`
      : `http://localhost:3000/progression/actor/${card.id}/details`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) throw new Error("Erreur chargement");

    const details = await response.json();

    return { ...card, ...details };
  } catch (err) {
    console.error("Erreur enrichCard:", err);
    return card;
  }
};

const drawCard = () => {
  if (yourCard.value) return; // Déjà pioché
  socket.value.emit("drawCard");
};

const clearRound = () => {
  yourCard.value = null;
  opponentCard.value = null;
  opponentHasDrawn.value = false;
  roundResult.value = null;
  currentStat.value = null;
  gameMessage.value = "Cliquez pour piocher une nouvelle carte";
};

const playAgain = () => {
  result.value = null;
  yourDeck.value = 15;
  opponentDeck.value = 15;
  waitingOpponent.value = true;
  waitingMessage.value = "En attente d'un adversaire...";
  initSocket();
};

const initSocket = () => {
  if (socket.value) {
    socket.value.disconnect();
  }

  const token = localStorage.getItem("token");
  if (!token) {
    alert("Connecte-toi pour jouer !");
    router.push("/login");
    return;
  }

  socket.value = io("http://localhost:3000", {
    query: {
      token,
    },
  });

  socket.value.on("connect", () => {
    socket.value.emit("join", {
      gameId: route.params.gameId,
    });
  });

  socket.value.on("waiting", (msg) => {
    waitingOpponent.value = true;
    waitingMessage.value = msg.message;
  });

  socket.value.on("gameStart", (data) => {
    gameId.value = data.gameId;
    yourDeck.value = data.deckSize;
    opponentDeck.value = data.opponentDeckSize;
    waitingOpponent.value = false;
    gameMessage.value = data.message;
  });

  socket.value.on("cardDrawn", async (data) => {
    currentStat.value = data.stat;
    yourDeck.value = data.yourDeck;

    // 🧠 enrichit dynamiquement la carte du joueur
    yourCard.value = await enrichCard(data.yourCard);
  });
  socket.value.on("statChosen", (data) => {
    chosenStat.value = data.stat;
    statType.value = data.type;
  });

  socket.value.on("opponentDrawn", (data) => {
    opponentHasDrawn.value = data.drawn;
    opponentDeck.value = data.opponentDeck;
  });

  socket.value.on("roundResult", async (data) => {
    currentStat.value = data.stat;
    roundResult.value = data.winner;
    yourDeck.value = data.yourDeck;
    opponentDeck.value = data.opponentDeck;

    // 🧠 enrichir les deux cartes
    yourCard.value = await enrichCard(data.yourCard);
    opponentCard.value = await enrichCard(data.opponentCard);

    gameMessage.value = data.message;
    setTimeout(clearRound, 3000);
  });

  socket.value.on("result", (data) => {
    result.value = data.result;
    const currentGold = parseInt(localStorage.getItem("gold") || "0");
    const newGold = currentGold + (data.gold || 0);
    localStorage.setItem("gold", newGold.toString());
  });

  socket.value.on("opponentLeft", (data) => {
    gameMessage.value = data.message;
  });

  socket.value.on("error", (data) => {
    gameMessage.value = data.message;
  });
  // Dans votre composant Vue
  socket.value.on("newTurn", (data) => {
    gameMessage.value = data.message;
    clearRound(); // Réinitialiser l'interface pour un nouveau tour
  });
};

onMounted(() => {
  initSocket();
});

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect();
  }
});
</script>

<style scoped>
.combat {
  text-align: center;
  margin-top: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.waiting {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 2rem 0;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: #09f;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.game-board {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 2rem 0;
}

.deck-status {
  display: flex;
  justify-content: space-around;
  font-weight: bold;
  margin-bottom: 1rem;
}

.message {
  background-color: #f8f9fa;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.cards-container {
  display: flex;
  justify-content: space-around;
  margin: 1rem 0;
}

.player-area,
.opponent-area {
  width: 45%;
}

.draw-pile {
  cursor: pointer;
  transition: transform 0.2s;
}

.draw-pile:hover {
  transform: translateY(-5px);
}

.draw-pile.opponent {
  cursor: default;
}

.card-back {
  width: 200px;
  height: 280px;
  background: linear-gradient(135deg, #4b6cb7, #182848);
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-weight: bold;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  margin: 0 auto;
}

.card {
  width: 200px;
  background: #fff;
  border: 2px solid #ccc;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  margin: 0 auto;
}

.card img {
  width: 100%;
  height: auto;
  border-radius: 5px;
  object-fit: cover;
}

.round-result {
  margin: 1rem 0;
  font-weight: bold;
  font-size: 1.2rem;
}

.win {
  color: green;
}

.lose {
  color: red;
}

.draw {
  color: #666;
}

.reward {
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}

.btn-primary {
  background-color: #4b6cb7;
  color: white;
  border: none;
}

.btn-secondary {
  background-color: #f8f9fa;
  color: #333;
  border: 1px solid #ccc;
}
</style>
