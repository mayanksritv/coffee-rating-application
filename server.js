require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ================================
// COFFEE MODEL
// ================================

const coffeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      required: true,
      trim: true
    },

    image: {
      type: String,
      required: true
    },

    votes: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

const Coffee = mongoose.model("Coffee", coffeeSchema);

// ================================
// VOTER MODEL
// ================================
//
// Each voterId can exist only ONCE.
// This enforces one vote per person.
//

const voterSchema = new mongoose.Schema(
  {
    voterId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    votedCoffee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coffee",
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Voter = mongoose.model("Voter", voterSchema);

// ================================
// INITIAL COFFEE DATA
// ================================

const seedCoffees = [
  {
    name: "Classic Espresso",
    description:
      "Bold, rich and concentrated with a smooth crema.",
    image:
      "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&w=900&q=80",
    votes: 0
  },

  {
    name: "Cappuccino",
    description:
      "A balanced blend of espresso, steamed milk and foam.",
    image:
      "https://images.unsplash.com/photo-1572449043416-55f4685c9bb7?auto=format&fit=crop&w=900&q=80",
    votes: 0
  },

  {
    name: "Caramel Latte",
    description:
      "Creamy latte with a sweet caramel finish.",
    image:
      "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=900&q=80",
    votes: 0
  },

  {
    name: "Mocha",
    description:
      "Espresso, chocolate and milk for a dessert-like cup.",
    image:
      "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?auto=format&fit=crop&w=900&q=80",
    votes: 0
  },

  {
    name: "Americano",
    description:
      "Smooth espresso diluted with hot water for a clean taste.",
    image:
      "https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=900&q=80",
    votes: 0
  },

  {
    name: "Hazelnut Brew",
    description:
      "Nutty aroma and a mellow, comforting finish.",
    image:
      "https://images.unsplash.com/photo-1497515114629-f71d768fd07c?auto=format&fit=crop&w=900&q=80",
    votes: 0
  }
];

// ================================
// DATABASE CONNECTION
// ================================

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. Create a .env file and add your MongoDB URI."
    );
  }

  await mongoose.connect(process.env.MONGODB_URI);

  console.log("MongoDB connected successfully");

  // Make sure the unique voterId index exists
  await Voter.init();

  // Seed coffee data only when database is empty
  const coffeeCount = await Coffee.countDocuments();

  if (coffeeCount === 0) {
    await Coffee.insertMany(seedCoffees);
    console.log("Coffee data seeded successfully");
  }
}

// ================================
// GET ALL COFFEES
// ================================

app.get("/api/coffees", async (req, res) => {
  try {
    const coffees = await Coffee.find()
      .sort({
        votes: -1,
        name: 1
      })
      .lean();

    res.json(coffees);

  } catch (error) {
    console.error("Get coffees error:", error);

    res.status(500).json({
      message: "Unable to load coffees."
    });
  }
});

// ================================
// CREATE VOTER ID
// ================================
//
// This creates an anonymous unique ID.
// No personal information is collected.
//

app.get("/api/voter", async (req, res) => {
  try {
    const voterId = crypto.randomUUID();

    res.json({
      voterId
    });

  } catch (error) {
    console.error("Voter ID error:", error);

    res.status(500).json({
      message: "Unable to create voter ID."
    });
  }
});

// ================================
// VOTE FOR COFFEE
// ================================
//
// ONE PERSON = ONE VOTE TOTAL
//
// The MongoDB transaction ensures:
// 1. Coffee vote is incremented
// 2. Voter record is created
// 3. Both succeed together
//
// The unique voterId index prevents duplicate voting.
//

app.post("/api/coffees/:id/vote", async (req, res) => {

  const { voterId } = req.body;

  if (!voterId) {
    return res.status(400).json({
      message: "Voter ID is required."
    });
  }

  const session = await mongoose.startSession();

  try {

    session.startTransaction();

    // --------------------------------
    // CHECK IF THIS PERSON ALREADY VOTED
    // --------------------------------

    const existingVote = await Voter.findOne({
      voterId: voterId
    }).session(session);

    if (existingVote) {

      await session.abortTransaction();

      return res.status(409).json({
        message:
          "You have already voted. Each person can vote only once."
      });
    }

    // --------------------------------
    // FIND COFFEE
    // --------------------------------

    const coffee = await Coffee.findById(req.params.id)
      .session(session);

    if (!coffee) {

      await session.abortTransaction();

      return res.status(404).json({
        message: "Coffee not found."
      });
    }

    // --------------------------------
    // INCREMENT VOTE
    // --------------------------------

    coffee.votes += 1;

    await coffee.save({
      session
    });

    // --------------------------------
    // SAVE VOTER RECORD
    // --------------------------------

    await Voter.create(
      [
        {
          voterId: voterId,
          votedCoffee: coffee._id
        }
      ],
      {
        session
      }
    );

    // --------------------------------
    // COMMIT EVERYTHING
    // --------------------------------

    await session.commitTransaction();

    console.log(
      `Vote recorded: ${voterId} -> ${coffee.name}`
    );

    res.json({
      message: "Vote recorded successfully!",
      coffee: coffee
    });

  } catch (error) {

    // Roll back transaction
    await session.abortTransaction();

    // --------------------------------
    // DUPLICATE VOTER PROTECTION
    // --------------------------------

    if (error.code === 11000) {

      return res.status(409).json({
        message:
          "You have already voted. Each person can vote only once."
      });
    }

    console.error("Voting error:", error);

    res.status(500).json({
      message:
        "Unable to record vote. Please try again."
    });

  } finally {

    await session.endSession();

  }
});

// ================================
// LEADERBOARD
// ================================

app.get("/api/leaderboard", async (req, res) => {

  try {

    const leaderboard = await Coffee.find()
      .sort({
        votes: -1,
        name: 1
      })
      .limit(5)
      .lean();

    res.json(leaderboard);

  } catch (error) {

    console.error("Leaderboard error:", error);

    res.status(500).json({
      message: "Unable to load leaderboard."
    });
  }
});

// ================================
// FRONTEND FALLBACK
// ================================

app.get("*", (req, res) => {

  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );

});

// ================================
// START SERVER
// ================================

connectDatabase()
  .then(() => {

    app.listen(PORT, () => {

      console.log(
        `Server running on port ${PORT}`
      );

      console.log(
        `Open: http://localhost:${PORT}`
      );

    });

  })
  .catch((error) => {

    console.error(
      "Server startup failed:",
      error.message
    );

    process.exit(1);
  });