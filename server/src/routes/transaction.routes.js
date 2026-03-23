const {Router} = require('express');
const transactionController = require("../controllers/transaction.controller");
const {authMiddleware, systemAuthMiddleware} = require("../middleware/auth.middleware");

const transactionRoutes = Router();

transactionRoutes.post("/", authMiddleware, transactionController.createTransactionController)
transactionRoutes.post("/system/initial-funds", systemAuthMiddleware, transactionController.createInitialFundsTransaction)

module.exports = transactionRoutes;
