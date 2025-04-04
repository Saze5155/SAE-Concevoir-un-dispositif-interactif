// 📁 src/views/Collection.vue
<template>
  <div class="collection">
    <h2>Ma Collection</h2>

    <div class="toggle-buttons">
      <button
        :class="{ active: selectedTab === 'acteurs' }"
        @click="selectedTab = 'acteurs'"
      >
        Acteurs
      </button>
      <button
        :class="{ active: selectedTab === 'films' }"
        @click="selectedTab = 'films'"
      >
        Films
      </button>
      <button
        :class="{ active: selectedTab === 'graphe' }"
        @click="selectedTab = 'graphe'"
      >
        Graphe
      </button>
    </div>

    <div class="grid">
      <div
        v-for="card in filteredAndSorted"
        :key="card.id + card.type"
        class="card"
        :class="card.rarete?.toLowerCase()"
        @click="goToDetail(card)"
      >
        <div class="card-image">
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

          <div class="count" v-if="card.count > 1">x{{ card.count }}</div>
        </div>
        <div class="card-info">
          <h3 class="truncate">
            {{ card.type === "acteur" ? card.nom : card.titre }}
          </h3>
        </div>
      </div>
    </div>
  </div>
  <Graph v-if="selectedTab === 'graphe'" :data="graphData" />

  <NavBar />
</template>

<script setup>
import NavBar from "@/components/NavBar.vue";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
const router = useRouter();

import Graph from "@/components/Graph.vue"; // Ton composant D3

const goToDetail = (card) => {
  if (card.type === "acteur") {
    router.push(`/acteur/${card.id}`);
  } else if (card.type === "film") {
    router.push(`/film/${card.id}`);
  }
};

const selectedTab = ref("acteurs");
const collection = ref([]);
const graphData = ref(null);

const fetchGraphData = async () => {
  const res = await fetch("http://localhost:3000/graph", {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  if (res.ok) {
    const data = await res.json();
    graphData.value = data;
  }
};
const fetchPoster = async (titre) => {
  const apiKey = "0ca1429ca32ee910d7d4cfb252033f12";
  const query = encodeURIComponent(titre);

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}&language=en-EN`
    );
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const posterPath = data.results[0].poster_path;
      if (posterPath) {
        return `https://image.tmdb.org/t/p/w400${posterPath}`;
      }
    }
    return null;
  } catch (err) {
    console.error("Erreur TMDB Poster:", err);
    return null;
  }
};

const getActorImage = async (nom) => {
  const apiKey = "0ca1429ca32ee910d7d4cfb252033f12";
  const query = encodeURIComponent(nom);

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${query}&language=en-EN`
    );
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const profilePath = data.results[0].profile_path;
      if (profilePath) {
        return `https://image.tmdb.org/t/p/w400${profilePath}`;
      }
    }
    return null;
  } catch (err) {
    console.error("Erreur TMDB Actor:", err);
    return null;
  }
};

const fetchCollection = async () => {
  const res = await fetch("http://localhost:3000/progression/collection", {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  const data = await res.json();
  if (res.ok && Array.isArray(data)) {
    for (const card of data) {
      if (card.type === "film" && card.titre) {
        if (card.affiche == true) card.poster = await fetchPoster(card.titre);
      } else if (card.type === "acteur" && card.nom) {
        card.image = await getActorImage(card.nom);
      }
    }
    collection.value = data;
  }
};

const filteredAndSorted = computed(() => {
  const rarityOrder = ["Légendaire", "Epique", "Rare", "Commun"];
  return collection.value
    .filter((card) => card.type === selectedTab.value.slice(0, -1))
    .sort(
      (a, b) =>
        rarityOrder.indexOf(a.rarete) - rarityOrder.indexOf(b.rarete) ||
        (a.nom || a.titre || "").localeCompare(b.nom || b.titre || "")
    );
});
onMounted(() => {
  fetchGraphData();
  fetchCollection();
});
</script>

<style scoped>
.collection {
  max-width: 1000px;
  margin: 2rem auto;
  padding: 0 1rem;
  font-family: "Poppins", sans-serif;
  text-align: center;
}

h2 {
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: #2d3748;
  font-weight: 700;
}

.toggle-buttons {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.toggle-buttons button {
  padding: 0.5rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  border: 2px solid #4a5568;
  background: transparent;
  color: #4a5568;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.toggle-buttons .active {
  background: #4a5568;
  color: white;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 20px;
}

.card {
  position: relative;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  padding: 0.75rem;
  transition: transform 0.3s ease;
}

.card:hover {
  transform: translateY(-5px);
}

.card-image {
  position: relative;
  height: 160px;
  border-radius: 8px;
  overflow: hidden;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.card-image .unknown {
  width: 100%;
  height: 100%;
  background: #edf2f7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: #a0aec0;
}

.count {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #2d3748;
  color: white;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.85rem;
  z-index: 10;
}

.card-info {
  padding-top: 0.75rem;
  text-align: center;
}

.card-info h3 {
  font-size: 1rem;
  margin-bottom: 0.3rem;
  color: #2d3748;
}

.card-info p {
  color: #718096;
  font-size: 0.9rem;
}

.card.commun {
  border: 2px solid #e2e8f0;
}

.card.rare {
  border: 2px solid #90cdf4;
}

.card.epique {
  border: 2px solid #d6bcfa;
}

.card.légendaire {
  border: 2px solid #fbd38d;
}

.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
