<template>
  <div class="deck-selection">
    <h2>Choisis ton deck (15 cartes)</h2>

    <div class="collection-stats">
      <p>{{ selectedDeck.length }} / 15 cartes sélectionnées</p>
      <div class="filters">
        <button
          @click="filterType = 'tous'"
          :class="{ active: filterType === 'tous' }"
        >
          Tous
        </button>
        <button
          @click="filterType = 'acteur'"
          :class="{ active: filterType === 'acteur' }"
        >
          Acteurs
        </button>
        <button
          @click="filterType = 'film'"
          :class="{ active: filterType === 'film' }"
        >
          Films
        </button>
      </div>
    </div>

    <div class="collection-grid">
      <div
        v-for="card in filteredCollection"
        :key="card.id + card.type"
        :class="[
          'card',
          card.rarete.toLowerCase(),
          { selected: selectedDeck.includes(card) },
        ]"
        @click="toggleCardSelection(card)"
      >
        <div class="card-count" v-if="card.count > 1">x{{ card.count }}</div>
        <img
          :src="card.image"
          :alt="card.type === 'acteur' ? card.nom : card.titre"
          @error="setDefaultImage($event, card.type)"
        />
        <div class="info">
          <h3>{{ card.type === "acteur" ? card.nom : card.titre }}</h3>
          <p class="rarete">{{ card.rarete }}</p>
          <ul class="stats">
            <!-- Stats pour les acteurs -->
            <li v-if="card.type === 'acteur' && card.nb_films">
              Films : {{ card.nb_films }}
            </li>
            <li v-if="card.type === 'acteur' && card.career_start">
              Début : {{ card.career_start }}
            </li>
            <li v-if="card.type === 'acteur' && card.nb_genre">
              Genres : {{ card.nb_genre }}
            </li>

            <!-- Stats pour les films -->
            <li v-if="card.type === 'film' && card.nb_acteurs">
              Acteurs : {{ card.nb_acteurs }}
            </li>
            <li v-if="card.type === 'film' && card.genre">
              Genre : {{ card.genre }}
            </li>
            <li v-if="card.type === 'film' && card.annee">
              Année : {{ card.annee }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div v-if="filteredCollection.length === 0" class="empty-state">
      <p>Aucune carte ne correspond au filtre actuel</p>
    </div>

    <div class="deck-actions">
      <button
        class="search-btn"
        :disabled="selectedDeck.length !== 15"
        @click="submitDeck"
      >
        Chercher un combat
      </button>
      <button
        v-if="selectedDeck.length > 0"
        class="clear-btn"
        @click="clearSelection"
      >
        Effacer la sélection
      </button>
    </div>
  </div>

  <NavBar />
</template>

<script setup>
import NavBar from "@/components/NavBar.vue";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
const router = useRouter();

const collection = ref([]);
const selectedDeck = ref([]);
const filterType = ref("tous");
const isLoading = ref(true);

const filteredCollection = computed(() => {
  if (filterType.value === "tous") {
    return collection.value;
  }
  return collection.value.filter((card) => card.type === filterType.value);
});

const toggleCardSelection = (card) => {
  if (selectedDeck.value.includes(card)) {
    selectedDeck.value = selectedDeck.value.filter((c) => c !== card);
  } else if (selectedDeck.value.length < 15) {
    selectedDeck.value.push(card);
  }
};

const clearSelection = () => {
  selectedDeck.value = [];
};

const setDefaultImage = (event, type) => {
  // Définir une image par défaut en cas d'erreur de chargement
  event.target.src =
    type === "acteur"
      ? "/images/default-actor.jpg"
      : "/images/default-movie.jpg";
};

const submitDeck = async () => {
  if (selectedDeck.value.length !== 15) return;

  console.log("Deck sélectionné:", selectedDeck.value);

  try {
    const deckData = selectedDeck.value.map((card) => ({
      id: card.id,
      type: card.type,
    }));
    console.log("Deck à enregistrer:", deckData);

    const response = await fetch("http://localhost:3000/decks/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ deck: deckData }),
    });

    if (!response.ok)
      throw new Error("Erreur lors de l'enregistrement du deck");

    const result = await response.json();
    console.log("Deck enregistré:", result);

    router.push("/game");
  } catch (error) {
    console.error("Erreur:", error);
    alert("Impossible d'enregistrer le deck !");
  }
};

const getImage = async (name, type) => {
  const apiKey = "0ca1429ca32ee910d7d4cfb252033f12";
  const query = encodeURIComponent(name);
  const url =
    type === "acteur"
      ? `https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${query}`
      : `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("API request failed");

    const data = await res.json();
    const path =
      type === "acteur"
        ? data.results?.[0]?.profile_path
        : data.results?.[0]?.poster_path;
    return path ? `https://image.tmdb.org/t/p/w400${path}` : null;
  } catch (err) {
    console.error("Erreur lors du chargement de l'image:", err);
    return null;
  }
};

onMounted(async () => {
  try {
    isLoading.value = true;

    // Récupérer la collection de base
    const res = await fetch("http://localhost:3000/progression/collection", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }

    const data = await res.json();

    // Traiter chaque carte en parallèle avec Promise.all
    await Promise.all(
      data.map(async (card) => {
        // Charger l'image depuis TMDB
        card.image = await getImage(
          card.type === "acteur" ? card.nom : card.titre,
          card.type
        );
        const detailsRes = await fetch(
          `http://localhost:3000/progression/actor/${card.id}/details`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (detailsRes.ok) {
          const details = await detailsRes.json();
          card.nb_films = details.nb_films;
          card.career_start = details.career_start;
          card.nb_genre = details.nb_genres;
        }
        // Si c'est un film, récupérer les informations genre et année
        if (card.type === "film") {
          try {
            const detailsRes = await fetch(
              `http://localhost:3000/progression/movies/${card.id}/details`,
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              }
            );

            if (detailsRes.ok) {
              const details = await detailsRes.json();
              card.nb_acteurs = details.nb_acteurs;
              card.genre = details.genre;
              card.annee = details.annee;
            }
          } catch (err) {
            console.error(`Erreur pour le film ${card.id}:`, err);
          }
        }
      })
    );

    collection.value = data;
  } catch (err) {
    console.error("Erreur lors du chargement de la collection:", err);
    // Afficher un message d'erreur à l'utilisateur
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped>
.deck-selection {
  max-width: 1100px;
  margin: 2rem auto;
  text-align: center;
  padding: 0 1rem;
}

.collection-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.filters {
  display: flex;
  gap: 0.5rem;
}

.filters button {
  padding: 0.4rem 0.8rem;
  background: #e2e8f0;
  color: #1e293b;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filters button.active {
  background: #2b6cb0;
  color: white;
}

.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 1.2rem;
  margin: 1.5rem 0 2rem;
}

.card {
  cursor: pointer;
  border-radius: 10px;
  overflow: hidden;
  border: 3px solid transparent;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  position: relative;
  background: white;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-count {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
  z-index: 5;
}

.card.selected {
  border-color: #2b6cb0;
  transform: translateY(-5px);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.15);
}

.card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.card .info {
  padding: 0.75rem;
  background: #f8f9fa;
  text-align: left;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.card .info h3 {
  font-size: 1rem;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card .rarete {
  font-weight: bold;
  margin: 0.25rem 0;
  text-transform: capitalize;
}

.card .stats {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0;
  font-size: 0.85rem;
  color: #555;
  flex-grow: 1;
}

.card .stats li {
  margin: 3px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Rarete glow et couleurs */
.card.légendaire {
  box-shadow: 0 0 10px 3px #ffd700;
}
.card.epique {
  box-shadow: 0 0 10px 3px #a855f7;
}
.card.rare {
  box-shadow: 0 0 10px 3px #3b82f6;
}
.card.commun {
  box-shadow: 0 0 10px 1px #cbd5e1;
}

.card.légendaire .rarete {
  color: #b59410;
}
.card.epique .rarete {
  color: #7e22ce;
}
.card.rare .rarete {
  color: #1d4ed8;
}

.empty-state {
  padding: 2rem;
  background: #f1f5f9;
  border-radius: 8px;
  margin: 1rem 0;
}

.deck-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

.search-btn {
  padding: 0.8rem 1.5rem;
  font-size: 1.1rem;
  background: #2b6cb0;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  min-width: 200px;
  transition: all 0.2s ease;
}

.search-btn:hover:not(:disabled) {
  background: #1e4b8a;
  transform: translateY(-2px);
}

.clear-btn {
  padding: 0.8rem 1.5rem;
  font-size: 1.1rem;
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: #e2e8f0;
}

.search-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

/* Media queries pour responsive */
@media (max-width: 768px) {
  .collection-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }

  .card img {
    height: 160px;
  }
}

@media (max-width: 480px) {
  .collection-stats {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .collection-grid {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  }

  .card img {
    height: 140px;
  }
}
</style>
