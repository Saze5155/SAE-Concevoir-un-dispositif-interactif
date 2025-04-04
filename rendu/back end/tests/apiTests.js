const request = require("supertest");
// Ajout de l'importation de expect pour Jest
const { expect } = require("@jest/globals");

const baseUrl = "http://localhost:3000";

let token;

beforeAll(async () => {
  const res = await request(baseUrl)
    .post("/auth/login")
    .send({ email: "user@example.com", password: "password123" });
  token = res.body.token; // Assurez-vous que `res.body.token` contient un jeton valide
  expect(token).toBeDefined(); // Vérifie que le jeton est défini

  // Préparation des données nécessaires pour les tests
  await request(baseUrl)
    .post("/movies")
    .send({
      id: 1,
      titre: "Inception",
      description: "Un film sur les rêves",
      annee: 2010,
    }) // Ajout d'un film avec des détails complets
    .set("Authorization", `Bearer ${token}`);

  await request(baseUrl)
    .post("/actors")
    .send({
      id: 1,
      nom: "Leonardo DiCaprio",
      biographie: "Acteur célèbre",
      date_naissance: "1974-11-11",
    }) // Ajout d'un acteur avec des détails complets
    .set("Authorization", `Bearer ${token}`);

  await request(baseUrl)
    .post("/moviesactors")
    .send({ filmId: 1, acteurId: 1 }) // Association entre film et acteur
    .set("Authorization", `Bearer ${token}`);

  await request(baseUrl)
    .post("/cards")
    .send({ id: 1, type: "film", titre: "Inception", rarete: "Épique" }) // Ajout d'une carte film
    .set("Authorization", `Bearer ${token}`);

  await request(baseUrl)
    .post("/cards")
    .send({
      id: 2,
      type: "acteur",
      nom: "Leonardo DiCaprio",
      rarete: "Légendaire",
    }) // Ajout d'une carte acteur
    .set("Authorization", `Bearer ${token}`);
});

describe("API Tests", () => {
  it("Connexion utilisateur", async () => {
    const res = await request(baseUrl)
      .post("/auth/login")
      .send({ email: "user@example.com", password: "password123" });
    expect(res.status).toBe(200);
  });

  it("Inscription utilisateur", async () => {
    const res = await request(baseUrl)
      .post("/auth/register")
      .send({
        pseudo: `JohnDoe_${Date.now()}`, // Pseudo unique
        email: `uniqueuser_${Date.now()}@example.com`, // Email unique
        password: "password123",
      });
    expect(res.status).toBe(201);
  });

  it("Récupérer la progression de l'utilisateur", async () => {
    const res = await request(baseUrl)
      .get("/progression")
      .set("Authorization", `Bearer ${token}`);
    console.log("Réponse API :", res.body); // Log pour déboguer
    expect(res.status).toBe(200);
  });

  it("Récupérer la collection de cartes", async () => {
    const res = await request(baseUrl)
      .get("/progression/collection")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("Détails d'un film", async () => {
    const res = await request(baseUrl)
      .get("/progression/movies/1/details")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("Détails d'un acteur", async () => {
    const res = await request(baseUrl)
      .get("/progression/actor/1/details")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("Vérifier une réponse", async () => {
    const res = await request(baseUrl)
      .post("/guess/verify")
      .send({ type: "film", id: 1, guess: "Nom de l'acteur ou du film" })
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("Tirer des cartes", async () => {
    const res = await request(baseUrl)
      .post("/gacha/draw")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("Sauvegarder un deck", async () => {
    const res = await request(baseUrl)
      .post("/decks/save")
      .send({
        deck: [
          { id: 1, type: "film" },
          { id: 2, type: "acteur" },
        ],
      })
      .set("Authorization", `Bearer ${token}`);
    console.log("Réponse API (Sauvegarder un deck) :", res.body); // Log pour déboguer
    expect(res.status).toBe(200);
  });

  it("Récupérer tous les films", async () => {
    const res = await request(baseUrl)
      .get("/movies")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("Récupérer tous les acteurs", async () => {
    const res = await request(baseUrl)
      .get("/actors")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("Récupérer les relations films-acteurs", async () => {
    const res = await request(baseUrl)
      .get("/moviesactors")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("Détails d'un acteur avec films associés", async () => {
    const res = await request(baseUrl)
      .get("/details/acteur/1")
      .set("Authorization", `Bearer ${token}`);
    console.log(
      "Réponse API (Détails d'un acteur avec films associés) :",
      res.body
    ); // Log pour déboguer
    expect(res.status).toBe(200);
  });

  it("Détails d'un film avec acteurs associés", async () => {
    const res = await request(baseUrl)
      .get("/details/film/1")
      .set("Authorization", `Bearer ${token}`);
    console.log(
      "Réponse API (Détails d'un film avec acteurs associés) :",
      res.body
    ); // Log pour déboguer
    expect(res.status).toBe(200);
  });
});
