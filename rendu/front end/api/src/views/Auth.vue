<template>
  <div class="auth">
    <h2>Connexion</h2>
    <form @submit.prevent="login">
      <input v-model="email" type="email" placeholder="Email" required />
      <input
        v-model="password"
        type="password"
        placeholder="Mot de passe"
        required
      />
      <button type="submit">Se connecter</button>
    </form>

    <h2>Inscription</h2>
    <form @submit.prevent="register">
      <input v-model="newPseudo" type="text" placeholder="Pseudo" required />
      <input v-model="newEmail" type="email" placeholder="Email" required />
      <input
        v-model="newPassword"
        type="password"
        placeholder="Mot de passe"
        required
      />
      <button type="submit">S'inscrire</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const email = ref("");
const password = ref("");
const newPseudo = ref("");
const newEmail = ref("");
const newPassword = ref("");
const router = useRouter();

const login = async () => {
  const res = await fetch("http://localhost:3000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.value, password: password.value }),
  });

  const data = await res.json();
  if (res.ok) {
    localStorage.setItem("token", data.token);
    router.push("/home");
  } else {
    alert(data.message || "Erreur de connexion");
  }
};

const register = async () => {
  const res = await fetch("http://localhost:3000/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pseudo: newPseudo.value,
      email: newEmail.value,
      password: newPassword.value,
    }),
  });

  const data = await res.json();
  if (res.ok) {
    alert("Inscription réussie, vous pouvez vous connecter.");
  } else {
    alert(data.message || "Erreur lors de l'inscription");
  }
};
</script>

<style scoped>
.auth {
  max-width: 400px;
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
input {
  display: block;
  margin: 0.5rem 0;
  padding: 0.5rem;
  width: 100%;
}
button {
  padding: 0.5rem;
  background: #333;
  color: white;
  border: none;
  cursor: pointer;
}
</style>
