<template>
  <nav class="navbar">
    <router-link to="/home" class="nav-link">Accueil</router-link>
    <router-link to="/collection" class="nav-link">Collection</router-link>
    <router-link to="/combat" class="nav-link">Combat</router-link>
    <button @click="logout" class="logout-button">Déconnexion</button>
  </nav>
</template>

<script setup>
import { useRouter } from "vue-router";
const router = useRouter();

const logout = () => {
  localStorage.removeItem("token");
  router.push("/");
};
</script>

<style scoped>
.navbar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 1rem;
  background: #2d3748;
  color: white;
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top: 1px solid #4a5568;
  z-index: 100;
}

.nav-link {
  color: #f7fafc;
  font-weight: 600;
  font-size: 1.1rem;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: background-color 0.3s, transform 0.2s;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.logout-button {
  background: linear-gradient(135deg, #e53e3e, #c53030);
  color: white;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1.2rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s, transform 0.2s;
}

.logout-button:hover {
  background: linear-gradient(135deg, #c53030, #9b2c2c);
  transform: translateY(-1px);
}
</style>
