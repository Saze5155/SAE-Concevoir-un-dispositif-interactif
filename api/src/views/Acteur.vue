<template>
  <div class="detail">
    <div class="left">
      <img v-if="acteur?.image" :src="acteur.image" alt="Photo de l'acteur" />
    </div>

    <div class="right">
      <h2>{{ acteur?.nom }}</h2>
      <p v-if="acteur?.rarete" :class="acteur.rarete.toLowerCase()">
        {{ acteur.rarete }}
      </p>

      <form v-if="!acteur?.complet" @submit.prevent="submitGuess">
        <input v-model="guess" type="text" placeholder="Devine un film..." />
        <button type="submit">Valider</button>
      </form>

      <h3>Films trouvés</h3>
      <div class="film-grid">
        <!-- Films trouvés -->
        <router-link
          v-for="film in trouvesFilms"
          :key="film.id"
          :to="film.possede ? `/film/${film.id}` : '#'"
          class="film-card"
          :class="{ clickable: film.possede }"
        >
          <img v-if="film.poster" :src="film.poster" alt="Poster du film" />
          <div v-else class="unknown">?</div>

          <div class="info">
            <h4>{{ film.titre }}</h4>
            <p :class="film.rarete?.toLowerCase()">{{ film.rarete }}</p>
          </div>
        </router-link>
      </div>
    </div>
  </div>

  <NavBar />
</template>

<script setup>
import NavBar from "@/components/NavBar.vue";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const acteur = ref(null);
const guess = ref("");
const ownedFilmIds = ref(new Set());

// Séparation des films trouvés et manquants pour simplifier le template
const trouvesFilms = computed(() => {
  return (acteur.value?.films || []).filter((f) => f.trouve);
});

const manquantsFilms = computed(() => {
  if (!acteur.value) return [];

  const total = acteur.value.total || 0;
  const trouves = trouvesFilms.value.length;
  const manquants = Math.max(0, total - trouves);

  return Array.from({ length: manquants }, (_, i) => ({
    trouve: false,
    placeholderId: `unknown-${i}`,
    rarete: "inconnue",
  }));
});

// Le reste du script reste inchangé
const fetchOwnedFilms = async () => {
  const res = await fetch("http://localhost:3000/progression/collection", {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  const data = await res.json();
  const owned = data.filter((c) => c.type === "film").map((c) => c.id);
  ownedFilmIds.value = new Set(owned);
};

const getActorImage = async (name) => {
  const apiKey = "0ca1429ca32ee910d7d4cfb252033f12";
  const query = encodeURIComponent(name);
  const res = await fetch(
    `https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${query}`
  );
  const data = await res.json();
  return data.results[0]?.profile_path
    ? `https://image.tmdb.org/t/p/w400${data.results[0].profile_path}`
    : null;
};

const fetchPoster = async (title) => {
  const apiKey = "0ca1429ca32ee910d7d4cfb252033f12";
  const query = encodeURIComponent(title);
  const res = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}`
  );
  const data = await res.json();
  return data.results[0]?.poster_path
    ? `https://image.tmdb.org/t/p/w400${data.results[0].poster_path}`
    : null;
};

const fetchActeur = async () => {
  await fetchOwnedFilms();

  const res = await fetch(
    `http://localhost:3000/details/acteur/${route.params.id}`,
    {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }
  );
  const data = await res.json();

  // Récupérer l'image de l'acteur
  if (data.nom && !data.image) {
    data.image = await getActorImage(data.nom);
  }

  if (data.films) {
    for (const film of data.films) {
      film.poster = await fetchPoster(film.titre);
      film.possede = ownedFilmIds.value.has(film.id);
    }
  }

  data.total = data.nb_films;
  acteur.value = data;
};

const submitGuess = async () => {
  if (!guess.value.trim()) return;

  const res = await fetch("http://localhost:3000/guess/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({
      type: "acteur",
      id: route.params.id,
      guess: guess.value,
      alreadyFound: (acteur.value?.films || []).map((f) => f.titre),
    }),
  });

  const data = await res.json();
  if (data.correct) {
    await fetchActeur();
    guess.value = "";
  } else {
    alert("Mauvaise réponse !");
  }
};

onMounted(fetchActeur);
</script>

<style scoped>
.detail {
  display: flex;
  gap: 2rem;
  max-width: 900px;
  margin: 2rem auto;
  align-items: flex-start;
}

.left img {
  max-width: 300px;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.right {
  flex: 1;
}

form {
  margin: 1rem 0;
  display: flex;
  gap: 0.5rem;
}

input {
  flex: 1;
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid #ccc;
}

button {
  padding: 0.5rem 1rem;
  background: #2b6cb0;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.film-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.film-card {
  display: block;
  text-decoration: none;
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s;
  text-align: center;
}

.film-card:hover {
  transform: scale(1.03);
}

.film-card img {
  width: 100%;
  height: 160px;
  object-fit: cover;
}

.film-card .info {
  padding: 0.5rem;
}

.film-card h4 {
  font-size: 1rem;
  color: #2d3748;
}

.film-card p {
  font-size: 0.85rem;
  font-weight: bold;
}

.film-card.clickable:hover {
  transform: scale(1.03);
  cursor: pointer;
}

p.légendaire {
  color: #d69e2e;
}
p.epique {
  color: #9f7aea;
}
p.rare {
  color: #4299e1;
}
p.commun {
  color: #a0aec0;
}
p.inconnue {
  color: #cbd5e0;
}

.film-card.placeholder {
  background: #edf2f7;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a0aec0;
  font-size: 3rem;
  font-weight: bold;
}

.film-card .unknown {
  width: 100%;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: #a0aec0;
}
</style>
