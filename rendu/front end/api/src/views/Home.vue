<template>
  <div class="home">
    <h2>Bienvenue dans le Gacha</h2>
    <p>Or disponible : {{ gold }}</p>
    <button class="draw-button" @click="startOpening">
      Tirer 10 cartes (100 gold)
    </button>

    <transition name="fade">
      <div v-if="opening && currentCard" class="card-container stack">
        <div class="card-stack" @click="nextCard">
          <div
            v-for="(card, index) in result"
            :key="index"
            v-show="index === currentIndex"
            class="booster-card stack-card"
            :class="[
              card.rarete.toLowerCase(),
              { glow: card.rarete === 'Légendaire' },
              { complete: card.poster && card.type === 'film' },
            ]"
          >
            <div class="flash" v-if="showFlash"></div>
            <div class="image">
              <img
                v-if="card.type === 'acteur' && card.image"
                :src="card.image"
                alt="Acteur"
              />
              <img
                v-else-if="card.type === 'film' && card.poster"
                :src="card.poster"
                alt="Affiche du film"
              />
              <div v-else class="unknown">?</div>
            </div>
            <div class="details">
              <h3 class="truncate">
                {{ card.type === "acteur" ? card.nom : card.titre }}
              </h3>
              <p>Rareté : {{ card.rarete }}</p>
              <p>
                {{ card.type === "film" ? "Film" : "Acteur" }} : Nombre de
                <span v-if="card.type === 'acteur'"
                  >films : {{ card.nb_films || "?" }}</span
                >
                <span v-else>acteurs : {{ card.nb_acteurs || "?" }}</span>
              </p>
              <div class="guess-input" @click.stop>
                <label v-if="card.type === 'acteur'"
                  >Dans quels films a-t-il joué ?</label
                >
                <label v-else>Quels acteurs ont joué dans ce film ?</label>
                <input
                  v-model="guess"
                  type="text"
                  @keyup.enter="submitGuess"
                  placeholder="Tapez une réponse et appuyez sur Entrée"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="buttons">
          <p>(Cliquez n'importe où sur la carte pour continuer)</p>
        </div>
      </div>
    </transition>
    <!-- Ajoute ce code en dehors de tes cartes, à la fin du template mais avant le </div> final -->
    <transition name="fade">
      <div
        v-if="lastGuessResult !== null"
        class="response-notification"
        :class="{ correct: lastGuessResult, wrong: !lastGuessResult }"
      >
        {{ lastGuessResult ? "Bonne réponse !" : "Mauvaise réponse" }}
      </div>
    </transition>

    <!-- Tirage terminé -->
    <div v-if="!opening && result.length">
      <h3>Tirage terminé</h3>
      <div class="grid-wrapper">
        <div class="grid">
          <div
            v-for="(card, index) in result"
            :key="index"
            class="booster-card mini"
            :class="[
              card.rarete.toLowerCase(),
              { glow: card.rarete === 'Légendaire' },
            ]"
          >
            <img
              v-if="card.type === 'acteur' && card.image"
              :src="card.image"
              alt="Acteur"
            />
            <img
              v-else-if="card.type === 'film' && card.poster"
              :src="card.poster"
              alt="Film"
            />
            <div v-else class="unknown">?</div>
            <div class="details">
              <h4 class="truncate">
                {{ card.type === "acteur" ? card.nom : card.titre }}
              </h4>
            </div>
          </div>
        </div>
      </div>
      <button @click="reset">Retour</button>
    </div>
  </div>
  <nav-bar></nav-bar>
</template>

<script setup>
import navBar from "@/components/NavBar.vue";
import { computed, onMounted, ref } from "vue";

const gold = ref(0);
const result = ref([]);
const currentCard = ref(null);
const currentIndex = ref(0);
const opening = ref(false);
const showFlash = ref(false);
const guess = ref("");
const foundAnswers = ref([]);
const lastGuessResult = ref(null);
const notificationKey = ref(0);

const allActorsFound = computed(
  () =>
    currentCard.value &&
    currentCard.value.nb_acteurs === foundAnswers.value.length
);

const fetchPoster = async (title) => {
  const apiKey = "0ca1429ca32ee910d7d4cfb252033f12"; // Il faut s'inscrire sur TMDB pour obtenir une clé
  const query = encodeURIComponent(title);

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}&language=en-EN`
    );
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const posterPath = data.results[0].poster_path;
      if (posterPath) {
        const posterUrl = `https://image.tmdb.org/t/p/w400${posterPath}`;
        console.log("Poster URL (TMDB):", posterUrl);
        return posterUrl;
      }
    }
    return null;
  } catch (err) {
    console.error("Erreur TMDB:", err);
    return null;
  }
};

const getActorImage = async (name) => {
  const apiKey = "0ca1429ca32ee910d7d4cfb252033f12";
  const query = encodeURIComponent(name);

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${query}&language=en-EN`
    );
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const profilePath = data.results[0].profile_path;
      if (profilePath) {
        const imageUrl = `https://image.tmdb.org/t/p/w400${profilePath}`;
        return imageUrl;
      }
    }
    return null;
  } catch (err) {
    console.error("Erreur image TMDB:", err);
    return null;
  }
};

const fetchGold = async () => {
  const res = await fetch("http://localhost:3000/progression", {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  const data = await res.json();
  if (res.ok) gold.value = data.argent_virtuel;
};

const drawGacha = async () => {
  const res = await fetch("http://localhost:3000/gacha/draw", {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  const data = await res.json();
  if (res.ok) {
    for (const card of data.tirage) {
      if (card.type === "acteur") {
        card.image = await getActorImage(card.nom); // 🔥 On ajoute l’image dynamique
      }
      if (card.type === "film" && card.affiche) {
        card.poster = await fetchPoster(card.titre);
      }
    }
    result.value = data.tirage;
    opening.value = true;
    currentIndex.value = 0;
    currentCard.value = result.value[0];
    foundAnswers.value = [];
    guess.value = "";
    lastGuessResult.value = null;
    fetchGold();
  } else {
    alert(data.message || "Erreur de tirage");
  }
};

const isGuessCorrect = (input, target) => {
  return input.trim().toLowerCase() === target.trim().toLowerCase();
};

const submitGuess = async () => {
  if (!guess.value || !currentCard.value) return;
  try {
    const res = await fetch("http://localhost:3000/guess/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        type: currentCard.value.type,
        id: currentCard.value.id,
        guess: guess.value,
        alreadyFound: foundAnswers.value,
      }),
    });
    const data = await res.json();
    if (res.ok && data.correct && !foundAnswers.value.includes(data.value)) {
      lastGuessResult.value = null;
      setTimeout(() => {
        lastGuessResult.value = true;
      }, 10);

      console.log("Réponse correcte:", data.value);
      const nextAnswers = [...foundAnswers.value, data.value];
      const willComplete = data.completed || false;

      foundAnswers.value = nextAnswers;
      console.log(foundAnswers.value);
      console.log(willComplete);
      if (willComplete) {
        console.log(currentCard.value.titre);
        const posterUrl = await fetchPoster(currentCard.value.titre);
        currentCard.value.poster = posterUrl;
        console.log("Poster URL:", posterUrl);
        const found = result.value.find(
          (c) => c.id === currentCard.value.id && c.type === "film"
        );
        if (found) {
          found.poster = posterUrl;
        }
      }
    } else {
      lastGuessResult.value = null;
      setTimeout(() => {
        lastGuessResult.value = false;
      }, 10);
    }
  } catch (e) {
    console.error("Erreur de validation:", e);
  }
  guess.value = "";
};

const startOpening = () => {
  drawGacha();
};

const nextCard = () => {
  if (currentIndex.value < result.value.length - 1) {
    showFlash.value = true;
    setTimeout(() => {
      showFlash.value = false;
      currentIndex.value++;
      currentCard.value = result.value[currentIndex.value];
      foundAnswers.value = [];
      guess.value = "";
      lastGuessResult.value = null;
    }, 150);
  } else {
    opening.value = false;
  }
};

const reset = () => {
  result.value = [];
  currentCard.value = null;
  currentIndex.value = 0;
};

onMounted(fetchGold);
</script>

<style scoped>
/* Améliorations générales */
.home {
  max-width: 800px;
  margin: 2rem auto;
  text-align: center;
  font-family: "Poppins", sans-serif;
  padding: 0 1rem;
}

/* Titre et compteur d'or */
h2 {
  font-size: 2.2rem;
  margin-bottom: 0.5rem;
  color: #2d3748;
  font-weight: 700;
}

p {
  color: #4a5568;
  margin-bottom: 1.5rem;
}

/* Or disponible avec effet spécial */
p:first-of-type {
  background: linear-gradient(45deg, #f6e05e, #f6ad55);
  display: inline-block;
  padding: 0.5rem 1.5rem;
  border-radius: 2rem;
  font-weight: 600;
  color: #744210;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Bouton de tirage amélioré */
.draw-button {
  padding: 14px 28px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 1.2rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 2rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.draw-button:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow: 0 8px 15px rgba(79, 70, 229, 0.4);
}

.draw-button:active {
  transform: translateY(1px);
}

/* Animation d'apparition des cartes */
.card-container {
  animation: appear 0.7s cubic-bezier(0.26, 1.04, 0.54, 1);
}

@keyframes appear {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(30px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Style de base des cartes */
.stack {
  position: relative;
  width: 350px;
  height: 550px;
  margin: auto;
  perspective: 1000px;
}

.card-stack {
  position: relative;
  width: 100%;
  cursor: pointer;
  transform-style: preserve-3d;
}

.stack-card {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 1;
  background: white;
  border-radius: 16px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

/* Animation d'entrée des cartes */
@keyframes slideIn {
  from {
    transform: translateX(100%) scale(0.9) rotate(5deg);
    opacity: 0;
  }
  to {
    transform: translateX(0) scale(1) rotate(0deg);
    opacity: 1;
  }
}

.stack-card {
  animation: slideIn 0.5s ease-out;
}

/* Effet de flash amélioré */
.flash {
  position: absolute;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    120deg,
    rgba(255, 255, 255, 0),
    rgba(255, 255, 255, 0.8),
    rgba(255, 255, 255, 0)
  );
  background-size: 200% 100%;
  animation: flashAnimation 0.4s ease-out;
  z-index: 5;
  border-radius: 16px;
  pointer-events: none;
}

@keyframes flashAnimation {
  0% {
    background-position: 100% 0;
    opacity: 1;
  }
  100% {
    background-position: 0 0;
    opacity: 0;
  }
}

/* Styles des cartes selon la rareté */
.booster-card {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: #fff;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  padding-top: 1.25rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}

.booster-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
}

.booster-card.commun {
  border: 2px solid #e2e8f0;
}

.booster-card.commun::before {
  background: linear-gradient(90deg, #cbd5e0, #e2e8f0);
}

.booster-card.rare {
  border: 2px solid #90cdf4;
}

.booster-card.rare::before {
  background: linear-gradient(90deg, #63b3ed, #90cdf4);
}

.booster-card.épique {
  border: 2px solid #d6bcfa;
}

.booster-card.épique::before {
  background: linear-gradient(90deg, #b794f4, #d6bcfa);
}

.booster-card.légendaire {
  border: 2px solid #fbd38d;
}

.booster-card.légendaire::before {
  background: linear-gradient(90deg, #f6ad55, #fbd38d);
}

/* Images des cartes */
.booster-card img {
  width: 100%;
  height: 220px;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.booster-card img:hover {
  transform: scale(1.03);
}

/* Élément "inconnu" */
.booster-card .unknown {
  width: 100%;
  height: 220px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 5rem;
  font-weight: bold;
  color: #a0aec0;
  background: linear-gradient(135deg, #f7fafc, #edf2f7);
  border-radius: 12px;
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.05);
}

/* Détails des cartes */
.booster-card .details {
  text-align: center;
  padding-top: 1.25rem;
  font-size: 1rem;
  width: 100%;
}

.booster-card .details h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #2d3748;
}

.booster-card .details p {
  margin-bottom: 0.5rem;
  color: #4a5568;
}

/* Effet de brillance pour les cartes légendaires */
.glow {
  box-shadow: 0 0 20px rgba(251, 211, 141, 0.6),
    0 0 40px rgba(251, 211, 141, 0.4);
  animation: glowPulse 2s infinite alternate;
}

@keyframes glowPulse {
  from {
    box-shadow: 0 0 10px rgba(251, 211, 141, 0.6),
      0 0 20px rgba(251, 211, 141, 0.4);
  }
  to {
    box-shadow: 0 0 25px rgba(251, 211, 141, 0.8),
      0 0 50px rgba(251, 211, 141, 0.5);
  }
}

/* Section de devinette */
/* Amélioration de la section de devinette */
.guess-input {
  margin-top: 1.5rem;
  background: #f8fafc;
  padding-top: 1.2rem;
  border-radius: 12px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
  position: relative;
  border: 1px solid #e2e8f0;
}

.guess-input label {
  font-weight: 600;
  color: #4a5568;
  display: block;
  margin-bottom: 0.75rem;
  font-size: 1.05rem;
}

/* Amélioration du champ de saisie */
.guess-input input {
  padding: 12px 16px;
  width: 70%;
  border-radius: 8px;
  border: 2px solid #cbd5e0;
  margin: 0.5rem 0 1rem;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.guess-input input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
  transform: translateY(-2px);
}

.guess-input input::placeholder {
  color: #a0aec0;
  font-style: italic;
}

/* Effet visuel pour indiquer que c'est interactif */
.guess-input::after {
  content: "⏎";
  position: absolute;
  right: 3rem;
  top: 4.5rem; /* Ajuster si nécessaire */
  color: #a0aec0;
  font-size: 1.2rem;
  pointer-events: none;
  opacity: 0.6;
}

/* Amélioration de la liste des réponses trouvées */
.guess-input ul {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
  text-align: left;
  max-height: 150px;
  overflow-y: auto;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
}

.guess-input li {
  padding: 0.75rem 1rem;
  background: rgba(72, 187, 120, 0.1);
  border-left: 4px solid #48bb78;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  color: #2f855a;
  font-weight: 500;
  animation: fadeInLeft 0.5s ease;
  display: flex;
  align-items: center;
}

.guess-input li::before {
  content: "✓";
  margin-right: 8px;
  font-weight: bold;
  color: #38a169;
}

@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Feedback de réponse amélioré */
.correct,
.wrong {
  padding: 0.75rem;
  border-radius: 8px;
  font-weight: bold;
  margin-top: 1rem;
  animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform-origin: center;
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.correct {
  color: #2f855a;
  background-color: rgba(72, 187, 120, 0.1);
  border-left: 4px solid #48bb78;
}

.wrong {
  color: #c53030;
  background-color: rgba(245, 101, 101, 0.1);
  border-left: 4px solid #f56565;
}

/* Message de réussite */
.guess-input p:last-child {
  background: linear-gradient(135deg, #9ae6b4, #68d391);
  color: #22543d;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  font-weight: 600;
  box-shadow: 0 4px 6px rgba(104, 211, 145, 0.2);
  animation: celebrateAnimation 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes celebrateAnimation {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(10px);
  }
  50% {
    transform: scale(1.1) translateY(-5px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Grille de cartes finales */
.grid-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 25px;
  padding: 20px;
  justify-items: center;
  max-width: 800px;
}

.booster-card.mini {
  width: 140px;
  height: 220px;
  padding: 0.75rem;
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.booster-card.mini:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
}

.booster-card.mini img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
}

.booster-card.mini .details {
  margin-top: 0.75rem;
}

.booster-card.mini h4 {
  font-size: 1rem;
  margin-bottom: 0.3rem;
}

/* Bouton de retour */
button:last-child {
  margin-top: 1.5rem;
  padding: 10px 24px;
  background: linear-gradient(135deg, #4a5568, #2d3748);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

button:last-child:hover {
  background: linear-gradient(135deg, #2d3748, #1a202c);
  transform: translateY(-2px);
  box-shadow: 0 6px 10px rgba(0, 0, 0, 0.15);
}

/* Animations de transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Style pour texte tronqué */
.truncate {
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Instruction pour cliquer sur la carte */
.buttons p {
  font-size: 0.9rem;
  color: #718096;
  font-style: italic;
  margin-top: 0.5rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
  }

  .stack {
    width: 300px;
    height: 480px;
  }
}

@media (max-width: 480px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .stack {
    width: 280px;
    height: 450px;
  }
}

/* Modification de l'animation pour qu'elle soit plus fluide */
.response-notification {
  position: fixed;
  bottom: 40px;
  right: 40px;
  padding: 15px 25px;
  border-radius: 12px;
  font-weight: 600;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 12px;
  transform: translateY(100px);
  opacity: 0;
  animation: slideUp 0.4s forwards, fadeOut 0.4s forwards 2s;
}

@keyframes slideUp {
  0% {
    transform: translateY(100px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes fadeOut {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(-20px);
    opacity: 0;
  }
}

.response-notification.correct {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border-left: none;
}

.response-notification.wrong {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  border-left: none;
}

.response-notification::before {
  font-size: 20px;
  margin-right: 8px;
}

.response-notification.correct::before {
  content: "✓";
}

.response-notification.wrong::before {
  content: "✗";
}

@keyframes notificationAppear {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes notificationDisappear {
  to {
    opacity: 0;
    transform: translateY(20px);
  }
}

/* Supprime les anciens styles de feedback qui étaient dans la carte */
.guess-input .correct,
.guess-input .wrong {
  display: none; /* On cache les anciens feedbacks */
}

.complete {
  box-shadow: 0 0 20px 6px #38a169;
  transition: box-shadow 0.4s ease-in-out;
  animation: pulseComplete 1.5s ease infinite;
}

@keyframes pulseComplete {
  0% {
    box-shadow: 0 0 15px 4px #68d391;
  }
  50% {
    box-shadow: 0 0 25px 8px #48bb78;
  }
  100% {
    box-shadow: 0 0 15px 4px #68d391;
  }
}
</style>
