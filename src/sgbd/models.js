const Sequelize = require("sequelize");
const myDB = require("./config");

const Actors = myDB.define(
  "actors",
  {
    id: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    rarete: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    career_start: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    nb_genres: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
  },
  {
    timestamps: false,
  }
);

const Genre = myDB.define(
  "genre",
  {
    id: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
    },
    genre: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: false,
  }
);

const Movies = myDB.define(
  "movies",
  {
    id: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    year: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    rarete: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: false,
  }
);

const MoviesActors = myDB.define(
  "moviesactors",
  {
    id_movie: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
      references: {
        model: Movies,
        key: "id",
      },
    },
    id_actor: {
      type: Sequelize.STRING,
      allowNull: false,
      references: {
        model: Actors,
        key: "id",
      },
    },
  },
  {
    timestamps: false,
  }
);

const MoviesGenre = myDB.define(
  "moviesgenre",
  {
    id_movie: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
      references: {
        model: Movies,
        key: "id",
      },
    },
    id_genre: {
      type: Sequelize.STRING,
      allowNull: false,
      references: {
        model: Genre,
        key: "id",
      },
    },
  },
  {
    timestamps: false,
  }
);

const User = myDB.define(
  "users",
  {
    id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    pseudo: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

const Progression = myDB.define(
  "progression",
  {
    user_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: User,
        key: "id",
      },
    },
    argent_virtuel: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    cartes_obtenues: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    dernier_tirage: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  },
  {
    timestamps: false,
  }
);

const CompletedFilms = myDB.define(
  "completed_films",
  {
    user_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: User,
        key: "id",
      },
    },
    movie_id: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
      references: {
        model: Movies,
        key: "id",
      },
    },
  },
  {
    timestamps: false,
  }
);

const CompletedActors = myDB.define(
  "completed_actors",
  {
    user_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: User,
        key: "id",
      },
    },
    actor_id: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
      references: {
        model: Actors,
        key: "id",
      },
    },
  },
  { timestamps: false }
);
const GuessedActors = myDB.define(
  "guessed_actors",
  {
    id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: User,
        key: "id",
      },
    },
    actor_id: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
      references: {
        model: Actors,
        key: "id",
      },
    },
    movie_id: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
      references: {
        model: Movies,
        key: "id",
      },
    },
  },
  {
    timestamps: false,
  }
);

const GuessedMovies = myDB.define(
  "guessed_movies",
  {
    id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: User,
        key: "id",
      },
    },
    actor_id: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
      references: {
        model: Actors,
        key: "id",
      },
    },
    movie_id: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
      references: {
        model: Movies,
        key: "id",
      },
    },
  },
  {
    timestamps: false,
  }
);

const Deck = myDB.define(
  "decks",
  {
    user_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: User,
        key: "id",
      },
    },
    cards: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
  },
  {
    timestamps: false,

    freezeTableName: true,
    createdAt: false,
    updatedAt: false,
    omitNull: true,
  }
);

// Définir les relations
Movies.belongsToMany(Actors, { through: MoviesActors, foreignKey: "id_movie" });
Actors.belongsToMany(Movies, { through: MoviesActors, foreignKey: "id_actor" });
// Dans votre fichier models/index.js ou là où vous définissez vos associations
Movies.belongsToMany(Genre, {
  through: MoviesGenre,
  foreignKey: "id_movie",
  as: "genre",
});
Genre.belongsToMany(Movies, {
  through: MoviesGenre,
  foreignKey: "id_genre",
  as: "movies",
});

module.exports = {
  Actors,
  Genre,
  Movies,
  MoviesActors,
  MoviesGenre,
  User,
  Progression,
  CompletedFilms,
  CompletedActors,
  GuessedActors,
  GuessedMovies,
  Deck,
};
// const { Sequelize } = require("sequelize");
