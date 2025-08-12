// Encapsulates performance optimization logic
// Export a single function that accepts dependencies to avoid tight coupling.

async function applyPerformanceOptimizations(processPool, settingsManager, loggingManager) {
  try {
    const systemCapabilities = await processPool.detectSystemCapabilities();
    await settingsManager.applyPerformanceOptimizations(systemCapabilities);
  } catch (error) {
    loggingManager.logError(
      `Error applying performance optimizations: ${error.message}`,
      'PerformanceOptimizer'
    );
  }
}

module.exports = { applyPerformanceOptimizations };
