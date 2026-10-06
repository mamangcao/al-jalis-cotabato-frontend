/**
 * Revert Serial Number Generator for Isolated Chapter HRMS Deployments
 * Format: AAI-[CHAPTER]-YY-XXXX (e.g., AAI-ILI-26-0001, AAI-COT-26-0014)
 * 
 * In an isolated chapter deployment architecture, each chapter server runs its own
 * instance and database. The Chapter Code is injected via the CHAPTER_CODE
 * environment variable at deployment time, ensuring automatic and tamper-proof
 * serial tagging without requiring manual chapter selection.
 */

export interface RevertRecordLike {
  id?: string;
  serialNumber?: string;
  createdAt?: string | Date;
  reversionDate?: string;
}

/**
 * Returns the configured Chapter Code from environment variables.
 * Defaults to 'COT' (Cotabato) or 'UNKNOWN' if undefined.
 */
export function getChapterCode(): string {
  // Check process.env (Node / Vite define) or Vite import.meta.env
  if (typeof process !== 'undefined' && process.env && process.env.CHAPTER_CODE) {
    return process.env.CHAPTER_CODE;
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_CHAPTER_CODE) {
    return (import.meta as any).env.VITE_CHAPTER_CODE;
  }
  return 'COT';
}

/**
 * Generate the next sequential serial number for a new revert record.
 * Compatible with in-memory stores, client state, or custom ORM models.
 * 
 * @param existingRecords Optional array of existing revert records to compute next sequence
 * @returns Promise<string> formatted as AAI-[CHAPTER]-YY-XXXX
 */
export async function generateRevertSerial(
  existingRecords?: RevertRecordLike[]
): Promise<string> {
  // 1. Read Chapter Code from Environment
  const chapterCode = getChapterCode();

  // 2. Get current 2-digit year (e.g., "26" for 2026)
  const currentYearStr = new Date().getFullYear().toString().slice(-2);

  // 3. Find the latest record matching current year
  let nextSequence = 1;

  if (existingRecords && existingRecords.length > 0) {
    // Filter records containing -${currentYearStr}-
    const currentYearRecords = existingRecords.filter(r => 
      Boolean(r.serialNumber && r.serialNumber.includes(`-${currentYearStr}-`))
    );

    if (currentYearRecords.length > 0) {
      // Sort by createdAt / sequence descending
      currentYearRecords.sort((a, b) => {
        const seqA = extractSequence(a.serialNumber);
        const seqB = extractSequence(b.serialNumber);
        if (seqA !== seqB) return seqB - seqA;

        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      const latestRecord = currentYearRecords[0];
      const lastSerial = latestRecord.serialNumber || '';
      const lastSequence = extractSequence(lastSerial);

      if (lastSequence > 0) {
        nextSequence = lastSequence + 1;
      }
    }
  }

  // 4. Return formatted serial number: AAI-[CHAPTER]-YY-XXXX
  return `AAI-${chapterCode}-${currentYearStr}-${String(nextSequence).padStart(4, '0')}`;
}

/**
 * Pure Prisma / MySQL Implementation for Next.js Server Actions
 * Queries the isolated chapter database for the latest current-year record.
 * 
 * @param prisma PrismaClient instance
 * @returns Promise<string> e.g., "AAI-ILI-26-0001"
 */
export async function generateRevertSerialWithPrisma(prisma: any): Promise<string> {
  // 1. Read the chapter code from the environment
  const chapterCode = process.env.CHAPTER_CODE || 'UNKNOWN';

  // 2. Get the current 2-digit year
  const currentYearStr = new Date().getFullYear().toString().slice(-2);

  // 3. Database Query (Prisma/MySQL)
  // Isolated chapter DB query: grab the newest record in the current year
  const latestRecord = await prisma.revert.findFirst({
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
  let nextSequence = 1;

  if (latestRecord && latestRecord.serialNumber) {
    const lastSerial = latestRecord.serialNumber; // e.g., "AAI-ILI-26-0014"
    const lastSequence = parseInt(lastSerial.split('-').pop() || '0', 10);
    if (!isNaN(lastSequence) && lastSequence > 0) {
      nextSequence = lastSequence + 1;
    }
  }

  return `AAI-${chapterCode}-${currentYearStr}-${String(nextSequence).padStart(4, '0')}`;
}

/**
 * Helper to extract integer sequence from serial like "AAI-COT-26-0014"
 */
function extractSequence(serial?: string): number {
  if (!serial) return 0;
  const parts = serial.split('-');
  const seqStr = parts[parts.length - 1];
  const parsed = parseInt(seqStr, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Helper to parse a formatted serial into its constituent parts
 */
export function parseRevertSerial(serial: string) {
  const parts = serial.split('-');
  if (parts.length < 4) return null;
  return {
    prefix: parts[0],
    chapter: parts[1],
    year: parts[2],
    sequence: parseInt(parts[3], 10),
  };
}
