const express = require("express");
const router = express.Router();

const { Actors, Movies, MoviesActors } = require("../sgbd/models.js");
const myDB = require("../sgbd/config.js");

// Get all Movies
router.get("/", async (req, res) => {
  try {
    const movies = await Movies.findAll();
    res.status(200).json({ message: "Movies", data: movies }); // 200 pour succès
  } catch (error) {
    console.error("Error fetching movies:", error);
    res
      .status(500)
      .json({ message: "Erreur serveur lors de la récupération des films." }); // 500 pour erreur serveur
  }
});

module.exports = router;
