import depositRepository from "../modules/deposit/repository.js";
import dompetx from "../integrations/dompetx/index.js";
import logger from "./logger.js";

const INTERVAL_MS = 10 * 60 * 1000; // Run every 10 minutes

async function processExpiredDeposits() {
    try {
        const expiredDeposits = await depositRepository.getExpiredDeposits();

        if (expiredDeposits.length === 0) return;

        logger.info(`[Scheduler] Found ${expiredDeposits.length} expired deposit(s), processing...`);

        const settings = await depositRepository.getSettings("DOMPETX");

        for (const deposit of expiredDeposits) {
            try {
                // Cancel on DompetX
                if (deposit.externalId && settings.dompetx_api_key) {
                    try {
                        await dompetx.cancelTransaction(settings.dompetx_api_key, deposit.externalId);
                        logger.info(`[Scheduler] Deposit ${deposit.reference} cancelled on DompetX.`);
                    } catch (cancelErr) {
                        logger.warn(`[Scheduler] Failed to cancel ${deposit.reference} on DompetX: ${cancelErr.message}`);
                    }
                }

                // Update local status
                await depositRepository.updateDeposit(deposit.id, { status: "EXPIRED" });
                logger.info(`[Scheduler] Deposit ${deposit.reference} marked as EXPIRED.`);
            } catch (err) {
                logger.error(`[Scheduler] Error processing deposit ${deposit.reference}: ${err.message}`);
            }
        }
    } catch (error) {
        logger.error(`[Scheduler] Expired deposits check failed: ${error.message}`);
    }
}

export function startDepositScheduler() {
    logger.info(`[Scheduler] Deposit expiry scheduler started (interval: ${INTERVAL_MS / 1000}s)`);
    // Run immediately on start
    processExpiredDeposits();
    // Then run at interval
    setInterval(processExpiredDeposits, INTERVAL_MS);
}
