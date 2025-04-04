const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.js");

const {
  MoviesActors,
  Movies,
  Actors,
  CompletedFilms,
  CompletedActors,
  GuessedActors,
  GuessedMovies,
} = require("../sgbd/models");

const isExactMatch = (input, target) => {
  if (!input || !target) return false;
  return (
    input.toString().trim().toLowerCase() ===
    target.toString().trim().toLowerCase()
  );
};

router.post("/verify", auth, async (req, res) => {
  const { type, id, guess, alreadyFound = [] } = req.body;
  const userId = req.user?.id;

  if (!type || !id || !guess || !userId) {
    return res.status(422).json({ message: "Paramètres manquants." }); // 422 pour paramètres manquants
  }

  try {
    const entries = await MoviesActors.findAll({
      where: { [type === "film" ? "id_movie" : "id_actor"]: id },
    });
    const userGuess = (guess || "").toString().trim().toLowerCase();

    if (type === "film") {
      const actorIds = entries.map((e) => e.id_actor);
      const actors = await Actors.findAll({ where: { id: actorIds } });
      const found = actors.find((a) => isExactMatch(userGuess, a.name));
      const correct = !!found;
      console.log(actors);
      // Enregistrer en BDD l'acteur deviné
      if (correct && found) {
        const alreadyExists = await GuessedActors.findOne({
          where: {
            user_id: userId,
            movie_id: id,
            actor_id: found.id,
          },
        });

        if (!alreadyExists) {
          await GuessedActors.create({
            user_id: userId,
            movie_id: id,
            actor_id: found.id,
          });
        }
      }

      const guessed = await GuessedActors.findAll({
        where: { user_id: userId, movie_id: id },
      });

      const guessedIds = guessed.map((g) => g.actor_id);
      const total = actorIds.length;

      const completed = actorIds.every((aid) => guessedIds.includes(aid));

      if (completed) {
        const alreadyCompleted = await CompletedFilms.findOne({
          where: { user_id: userId, movie_id: id },
        });
        if (!alreadyCompleted) {
          await CompletedFilms.create({ user_id: userId, movie_id: id });
        }
      }

      return res.status(200).json({
        correct,
        value: found?.name,
        totalActors: total,
        completed,
      }); // 200 pour succès
    } else if (type === "acteur") {
      const movieIds = entries.map((e) => e.id_movie);
      const movies = await Movies.findAll({ where: { id: movieIds } });
      console.log(movies);
      const found = movies.find((m) => isExactMatch(userGuess, m.title));
      const correct = !!found;

      // Enregistrer en BDD le film deviné
      if (correct && found) {
        const alreadyExists = await GuessedMovies.findOne({
          where: {
            user_id: userId,
            actor_id: id,
            movie_id: found.id,
          },
        });

        if (!alreadyExists) {
          await GuessedMovies.create({
            user_id: userId,
            actor_id: id,
            movie_id: found.id,
          });
        }
      }

      const guessed = await GuessedMovies.findAll({
        where: { user_id: userId, actor_id: id },
      });

      const guessedIds = guessed.map((g) => g.movie_id);
      const total = movieIds.length;

      const completed = movieIds.every((mid) => guessedIds.includes(mid));

      if (completed) {
        const alreadyCompleted = await CompletedActors.findOne({
          where: { user_id: userId, actor_id: id },
        });
        if (!alreadyCompleted) {
          await CompletedActors.create({ user_id: userId, actor_id: id });
        }
      }

      return res.status(200).json({
        correct,
        value: found?.title,
        totalMovies: total,
        completed,
      }); // 200 pour succès
    } else {
      return res.status(400).json({ message: "Type inconnu." }); // 400 pour type invalide
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." }); // 500 pour erreur serveur
  }
});
module.exports = router;
