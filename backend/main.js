const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const port = 3000;

require("dotenv").config();

app.use(cors());
app.use(express.json());

const DB_URL = process.env.MONGO_URL;

function connectDB() {
  mongoose
    .connect(DB_URL)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));
}

connectDB();

// Models
const User = require("./model/user.schema");
const Expense = require("./model/expense.schema");

// Middleware to handle errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Middleware for authentication
const AuthcationToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    const decoded = jwt.verify(token, "hello");

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ error: "Invalid or inactive user" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Single Role Middleware
const requireRole = (role) => {
  return (req, res, next) => {
    console.log(req.user.role);
    console.log(role);
    if (req.user.role !== role) {
      return res
        .status(403)
        .json({ error: "Forbidden: Insufficient permissions" });
    }
    next();
  };
};

// Multiple Role Middleware
const requireRoles = (roles) => {
  return (req, res, next) => {
    console.log(req.user.role);
    console.log(roles);
    if (!req.user) {
      return res.status(403).json({ error: "Forbidden: user not found" });
    }

    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Forbidden: Insufficient permissions" });
    }
    next();
  };
};

// Heirarchicale Role Middleware
const HeirarchyRole = (minimumRole) => {
  const roleHeirarchy = {
    admin: 3,
    manager: 2,
    user: 1,
  };

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userRoleLevel = roleHeirarchy[req.user.role];
    const requireRoleLevel = roleHeirarchy[minimumRole];
    if (userRoleLevel < requireRoleLevel) {
      return res
        .status(403)
        .json({ error: "Forbidden: Insufficient permissions" });
    }
    next();
  };
};

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get(
  "/user/expenses",
  AuthcationToken,
  requireRoles(["ADMIN", "MANAGER", "EMPLOYEE"]),
  async (req, res) => {
    let expenses;
    try {
      if (req.user.role === "EMPLOYEE") {
        expenses = await Expense.find({ userId: req.user._id })
          .populate("userId")
          .populate("ResolvedBy");
      }
      if (req.user.role === "MANAGER") {
        expenses = await Expense.find({ managerId: req.user._id })
          .populate("userId")
          .populate("ResolvedBy");
      }
      if (req.user.role === "ADMIN") {
        expenses = await Expense.find()
          .populate("userId")
          .populate("ResolvedBy");
      }
      res.json(expenses);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

app.get("/user/expenses/:userId", AuthcationToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const expenses = await Expense.find({ userId })
      .populate("userId")
      .populate("ResolvedBy");

    if (expenses.length === 0) {
      return res.status(404).json({ error: "No expenses found for this user" });
    }
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  User.findOne({ email, password })
    .then((user) => {
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      // Generate a token and send it back
      const token = jwt.sign({ userId: user._id }, "hello");
      res.json({ token, user });
    })
    .catch((err) => {
      console.error("Error logging in:", err);
      res.status(500).json({ error: "Internal server error" });
    });
});

app.get("/logout", AuthcationToken, (req, res) => {
  try {
    req.user = null;

    res.json({
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error("Error during logout:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
app.patch(
  "/expenses/:expenseId/:status",
  AuthcationToken,
  requireRole("MANAGER"),
  async (req, res) => {
    try {
      const { expenseId, status } = req.params;

      // Validate status parameter
      const validStatuses = ["pending", "approved", "rejected"];
      let finalStatus = status;

      // Handle common variations
      if (status === "approve") {
        finalStatus = "approved";
      } else if (status === "reject") {
        finalStatus = "rejected";
      }

      if (!validStatuses.includes(finalStatus)) {
        return res.status(400).json({
          error: "Invalid status. Must be one of: pending, approved, rejected",
        });
      }

      console.log(expenseId, finalStatus);

      const expense = await Expense.findByIdAndUpdate(
        expenseId,
        { status: finalStatus, ResolvedBy: req.user._id },
        { new: true }
      )
        .populate("userId")
        .populate("ResolvedBy");

      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }

      res.json(expense);
    } catch (err) {
      console.error("Error updating expense:", err);
      res.status(400).json({ message: err.message });
    }
  }
);

app.post(
  "/expenses",
  AuthcationToken,
  requireRole("EMPLOYEE"),
  async (req, res) => {
    const { userId, amount, description, date } = req.body;
    const expense = new Expense({
      userId: req.user._id,
      amount,
      description,
      date,
      managerId: req.user.managerId || null,
      status: "pending",
    });
    try {
      const savedExpense = await expense.save();
      res.status(201).json(savedExpense);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

app.post(
  "/user",
  AuthcationToken,
  requireRoles(["ADMIN", "MANAGER"]),
  async (req, res) => {
    const { email, password, role, managerId } = req.body;
    const user = new User({
      email,
      password,
      role,
      managerId,
    });
    try {
      if (req.user.role === "MANAGER" && role === "ADMIN") {
        return res
          .status(403)
          .json({ error: "Managers cannot create admin users" });
      }
      const savedUser = await user.save();
      res.status(201).json(savedUser);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

app.get("/user", AuthcationToken, requireRole("MANAGER"), async (req, res) => {
  try {
    const managerId = req.query.managerId;
    console.log("managerId");
    if (!managerId) {
      return res
        .status(400)
        .json({ error: "managerId query parameter required" });
    }
    const users = await User.find({ managerId });
    if (users.length === 0) {
      return res.status(404).json({ error: "No users found for this manager" });
    }
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/users", AuthcationToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
