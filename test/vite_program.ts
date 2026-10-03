import { startVitest } from 'vitest/node';

// ... inside your API route handler
export async function runSpecificTest() {
  const specificFilePath = './auth/auth_test_1.ts'; // 👈 Path to your test file

  try {
    const vitest = await startVitest(
      'test',
      [specificFilePath], 
      {
        watch: false, // Ensure it runs once and exits
      }
    );

    if (!vitest) {
      console.error('Vitest could not be started.');
      return { success: false, message: 'Failed to start Vitest.' };
    }

    const testModules = vitest.state.getTestModules();
    console.log(testModules)
    // ... process results
    await vitest.close();
    return { success: true, results: testModules };

  } catch (error: any) {
    console.error('Error running tests:', error);
    return { success: false, message: error?.message || String(error) };
  }
}

