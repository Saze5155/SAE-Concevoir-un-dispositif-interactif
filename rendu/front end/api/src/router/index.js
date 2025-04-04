import { createRouter, createWebHistory } from "vue-router";
import Auth from "../views/Auth.vue";
import Collection from "../views/Collection.vue";
import Home from "../views/Home.vue";

const routes = [
  { path: "/", name: "Auth", component: Auth },
  { path: "/home", name: "Home", component: Home },
  { path: "/collection", name: "Collection", component: Collection },
  {
    path: "/combat",
    name: "Combat",
    component: () => import("@/views/combat.vue"),
  },
  {
    path: "/game",
    name: "Game",
    component: () => import("@/views/game.vue"),
  },
  {
    path: "/acteur/:id",
    name: "ActeurDetail",
    component: () => import("@/views/Acteur.vue"),
  },
  {
    path: "/film/:id",
    name: "FilmDetail",
    component: () => import("@/views/Film.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
