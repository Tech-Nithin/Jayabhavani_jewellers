import { Router } from 'express';
import logbookRoutes from './routes/logbookRoutes';
import stockMovementRoutes from './routes/stockMovementRoutes';
import cashRegisterRoutes from './routes/cashRegisterRoutes';
import scrapVaultRoutes from './routes/scrapVaultRoutes';
import customerDuesRoutes from './routes/customerDuesRoutes';
import workerTransactionsRoutes from './routes/workerTransactionsRoutes';

const accountsRouter = Router();

// Tab 1: Daily Entry Log Book (Day-Book)
accountsRouter.use('/', logbookRoutes);

// Tab 2: Metal In & Outs (Stock Movement)
accountsRouter.use('/', stockMovementRoutes);

// Tab 3: Cash In & Outs (Cash Register)
accountsRouter.use('/', cashRegisterRoutes);

// Tab 4: Buy Metal records (Scrap Vault)
accountsRouter.use('/', scrapVaultRoutes);

// Tab 5: Customer Purchase Dues & Udhaari Register
accountsRouter.use('/', customerDuesRoutes);

// Tab 6: Workers Transactions (Karigar Ledger)
accountsRouter.use('/', workerTransactionsRoutes);

export default accountsRouter;
