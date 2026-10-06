'use server';

/**
 * Next.js Server Action: generateRevertSerialAction
 * 
 * Designed for isolated HRMS chapter deployments (Iligan, Cotabato, Pagadian, Tawi-Tawi).
 * Set CHAPTER_CODE in .env (e.g., CHAPTER_CODE="ILI" or CHAPTER_CODE="COT").
 */

// If you have a global prisma client:
// import { prisma } from '@/lib/prisma';

export async function generateRevertSerial(prismaClient?: any): Promise<string> {
  // 1. Read Chapter Code from Server Environment
  const chapterCode = process.env.CHAPTER_CODE || 'UNKNOWN';

  // 2. Get current 2-digit year (e.g., "26" for 2026)
  const currentYearStr = new Date().getFullYear().toString().slice(-2);

  let nextSequence = 1;

  // 3. Database Query (Prisma/MySQL)
  // Since each chapter has an isolated database, query the latest record in the current year
  if (prismaClient) {
    const latestRecord = await prismaClient.revert.findFirst({
      where: {
        serialNumber: {
          contains: `-${currentYearStr}-`,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 4. Sequence Incrementing & Formatting
    if (latestRecord && latestRecord.serialNumber) {
      const lastSerial = latestRecord.serialNumber; // e.g. "AAI-ILI-26-0014"
      const lastSequence = parseInt(lastSerial.split('-').pop() || '0', 10);
      if (!isNaN(lastSequence) && lastSequence > 0) {
        nextSequence = lastSequence + 1;
      }
    }
  }

  // Return final string: AAI-[CHAPTER]-YY-XXXX
  return `AAI-${chapterCode}-${currentYearStr}-${String(nextSequence).padStart(4, '0')}`;
}
