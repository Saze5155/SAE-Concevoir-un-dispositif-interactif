const express = require("express");
const app = express();
const dotenv = require("dotenv").config();
const ActorsRoutes = require("./src/routes/actors.js");
const MoviesRoutes = require("./src/routes/movies.js");
const MoviesActorsRoutes = require("./src/routes/moviesActors.js");
const AuthRoutes = require("./src/routes/auth.js");
const GachaRoutes = require("./src/routes/gacha.js");
const ProgressionRoutes = require("./src/routes/progressions.js");
const GuessRoutes = require("./src/routes/guess.js");
const DetailsRoutes = require("./src/routes/details.js");
const GraphRoutes = require("./src/routes/graph.js");
const DeckRoutes = require("./src/routes/deck.js");
const myDB = require("./src/sgbd/config.js");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { initCombat } = require("./src/socket/combat.js"); // 👈 Assure-toi que ce chemin est bon

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // ou le port de ton front Vue
    methods: ["GET", "POST"],
  },
});
app.use(cors());

app.use(express.json()); // Parse JSON bodies

app.use("/actors", ActorsRoutes); // Use the actors routes
app.use("/movies", MoviesRoutes); // Use the movies routes
app.use("/moviesactors", MoviesActorsRoutes); // Use the movies actors routes
app.use("/auth", AuthRoutes); // Use the authentication routes
app.use("/gacha", GachaRoutes); // Use the gacha routes
app.use("/progression", ProgressionRoutes);
app.use("/guess", GuessRoutes); // Use the guess routes
app.use("/details", DetailsRoutes); // Use the details routes
app.use("/graph", GraphRoutes); // Use the graph routes
app.use("/decks", DeckRoutes); // Use the deck routes

PORT = process.env.PORT || 3000;

myDB
  .sync({ force: false }) // Set to true to drop and recreate tables
  .then(() => {
    console.log("Database synchronized");
    initCombat(io); // 👈 Initialise les sockets ici

    server.listen(PORT, () => {
      console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
