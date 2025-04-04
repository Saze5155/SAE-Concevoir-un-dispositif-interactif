// 📁 src/routes/details.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const {
  Actors,
  Movies,
  MoviesActors,
  Progression,
  GuessedActors,
  GuessedMovies,
} = require("../sgbd/models");

router.get("/acteur/:id", auth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const actor = await Actors.findByPk(id);
    if (!actor) return res.status(404).json({ message: "Acteur non trouvé" });

    const roles = await MoviesActors.findAll({ where: { id_actor: id } });
    const movieIds = roles.map((r) => r.id_movie);
    const movies = await Movies.findAll({ where: { id: movieIds } });

    // Récupération des films déjà devinés pour cet acteur
    const guessed = await GuessedMovies.findAll({
      where: { user_id: userId, actor_id: id },
    });
    const guessedIds = guessed.map((g) => g.movie_id);

    // Formatage des données de films comme attendu par le frontend
    const films = movies.map((m) => ({
      id: m.id,
      titre: m.title,
      trouve: guessedIds.includes(m.id),
      rarete: m.rarete,
    }));

    console.log(films);

    // Vérification si tous les films ont été trouvés
    const complet = films.every((f) => f.trouve === true);

    res.json({
      id: actor.id,
      nom: actor.name,
      rarete: actor.rarete,
      films,
      total: films.length,
      complet,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
// Exemple de back-end (simplifié)
router.get("/film/:id", auth, async (req, res) => {
  const movieId = req.params.id;

  if (!movieId) {
    return res.status(422).json({ message: "ID du film requis." }); // 422 pour ID manquant
  }

  try {
    const film = await Movies.findByPk(movieId);

    if (!film) {
      return res.status(404).json({ message: "Film introuvable." }); // 404 pour film non trouvé
    }

    const entries = await MoviesActors.findAll({
      where: { id_movie: movieId },
    });
    const actorIds = entries.map((e) => e.id_actor);
    const actors = await Actors.findAll({ where: { id: actorIds } });

    res.status(200).json({
      titre: film.title,
      acteurs: actors.map((a) => ({ id: a.id, nom: a.name })),
    }); // 200 pour succès
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." }); // 500 pour erreur serveur
  }
});

module.exports = router;
