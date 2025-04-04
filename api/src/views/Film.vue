<template>
  <div class="detail">
    <div class="left">
      <img v-if="film?.complet && poster" :src="poster" alt="Affiche du film" />
    </div>

    <div class="right">
      <h2>{{ film?.titre }}</h2>

      <form v-if="!film?.complet" @submit.prevent="submitGuess">
        <input v-model="guess" type="text" placeholder="Devine un acteur..." />
        <button type="submit">Valider</button>
      </form>

      <h3>Acteurs trouvés</h3>
      <div class="actor-grid">
        <component
          v-for="acteur in filmActeursAffiches"
          :is="acteur.trouve && acteur.possede ? 'router-link' : 'div'"
          :key="acteur.id || acteur.placeholderId"
          :to="acteur.trouve && acteur.possede ? `/acteur/${acteur.id}` : null"
          class="actor-card"
          :class="{
            clickable: acteur.trouve && acteur.possede,
            placeholder: !acteur.trouve,
          }"
        >
          <img v-if="acteur.trouve" :src="acteur.image" alt="Acteur" />
          <div v-else class="unknown">?</div>

          <div class="info">
            <h4 v-if="acteur.trouve">{{ acteur.nom }}</h4>
            <p v-if="acteur.trouve" :class="acteur.rarete?.toLowerCase()">
              {{ acteur.rarete }}
            </p>
          </div>
        </component>
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
const film = ref(null);
const poster = ref(null);
const guess = ref("");
const ownedActorIds = ref(new Set());

const filmActeursTrouves = computed(() =>
  (film.value?.acteurs || []).filter((a) => a.trouve)
);
const filmActeursAffiches = computed(() => {
  if (!film.value) return [];

  const trouvés = film.value.acteurs?.filter((a) => a.trouve) || [];
  const manquants = (film.value.total || 0) - trouvés.length;

  const placeholders = Array.from({ length: manquants }, (_, i) => ({
    trouve: false,
    placeholderId: `unknown-${i}`,
    rarete: "inconnue", // <- pour éviter l’erreur de style
  }));

  return [...trouvés, ...placeholders];
});

const fetchOwnedActors = async () => {
  const res = await fetch("http://localhost:3000/progression/collection", {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  const data = await res.json();
  const owned = data.filter((c) => c.type === "acteur").map((c) => c.id);
  ownedActorIds.value = new Set(owned);
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

const fetchFilm = async () => {
  await fetchOwnedActors(); // Ajoute ça ici

  const res = await fetch(
    `http://localhost:3000/details/film/${route.params.id}`,
    {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }
  );
  const data = await res.json();

  if (data.acteurs && Array.isArray(data.acteurs)) {
    for (const acteur of data.acteurs) {
      acteur.image = await getActorImage(acteur.nom);
      acteur.possede = ownedActorIds.value.has(acteur.id);
    }
  }

  film.value = data;
  if (data.titre) poster.value = await fetchPoster(data.titre);
};

const submitGuess = async () => {
  const res = await fetch("http://localhost:3000/guess/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({
      type: "film",
      id: route.params.id,
      guess: guess.value,
      alreadyFound: film.value?.acteurs
        .filter((a) => a.trouve)
        .map((a) => a.nom),
    }),
  });

  const data = await res.json();
  if (data.correct) {
    await fetchFilm();
    guess.value = "";
  } else {
    alert("Mauvaise réponse !");
  }
};

onMounted(fetchFilm);
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

.actor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.actor-card {
  display: block;
  text-decoration: none;
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s;
  text-align: center;
}

.actor-card:hover {
  transform: scale(1.03);
}

.actor-card img {
  width: 100%;
  height: 160px;
  object-fit: cover;
}

.actor-card .info {
  padding: 0.5rem;
}

.actor-card h4 {
  font-size: 1rem;
  color: #2d3748;
}

.actor-card p {
  font-size: 0.85rem;
  font-weight: bold;
}

.actor-card.clickable:hover {
  transform: scale(1.03);
  cursor: pointer;
}

.card-wrapper {
  display: block;
  text-decoration: none;
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
  text-align: center;
}

.card-wrapper img {
  width: 100%;
  height: 160px;
  object-fit: cover;
}

.card-wrapper .info {
  padding: 0.5rem;
}

p.légendaire {
  color: #d69e2e;
}
p.épique {
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

.actor-card.placeholder {
  background: #edf2f7;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a0aec0;
  font-size: 3rem;
  font-weight: bold;
}

.actor-card .unknown {
  width: 100%;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: #a0aec0;
}
</style>
