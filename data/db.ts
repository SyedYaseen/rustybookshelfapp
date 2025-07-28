import * as SQLite from "expo-sqlite";

export type Audiobook = {
    id: number;
    author: string;
    series?: string | null;
    title: string;
    cover_art?: string | null;
    local_path?: string | null;
    metadata?: string | null;
    downloaded: number;
    created_at?: string | null;
};

export type FileRow = {
    id: number;
    book_id: number;
    file_name: string;
    file_path?: string | null;
    local_path?: string | null;
    duration?: number | null;
    channels?: number | null;
    sample_rate?: number | null;
    bitrate?: number | null;
};

export type ProgressRow = {
    book_id: number;
    file_id: number;
    progress_ms: number;
    last_updated?: string | null;
};

let db: SQLite.SQLiteDatabase | null = null;

/* =========================
 * Init / Accessor
 * =======================*/

export async function initDb() {
    if (db) return; // already initialized

    db = await SQLite.openDatabaseAsync("audiobooks_app.db");

    // Optional but nice for perf
    await db.execAsync("PRAGMA journal_mode = WAL;");

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS audiobooks (
      id INTEGER PRIMARY KEY,
      author TEXT NOT NULL,
      series TEXT,
      title TEXT NOT NULL,
      cover_art TEXT,
      local_path TEXT,
      metadata TEXT,
      downloaded INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY,
      book_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      local_path TEXT,
      duration INTEGER,
      channels INTEGER,
      sample_rate INTEGER,
      bitrate INTEGER,
      FOREIGN KEY (book_id) REFERENCES audiobooks (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      file_id INTEGER NOT NULL,
      progress_ms INTEGER NOT NULL DEFAULT 0,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES files (book_id) ON DELETE CASCADE,
      UNIQUE (file_id, book_id)
    );
  `);
}

export function getDb(): SQLite.SQLiteDatabase {
    if (!db) throw new Error("DB not initialized. Call await initDb() first.");
    return db;
}

/* =========================
 * Helpers
 * =======================*/

export async function upsertAudiobook(book: Audiobook) {
    const db = getDb();
    await db.runAsync(
        `INSERT OR REPLACE INTO audiobooks
      (id, author, series, title, cover_art, local_path, metadata, downloaded)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            book.id,
            book.author,
            book.series ?? null,
            book.title,
            book.cover_art ?? null,
            book.local_path ?? null,
            book.metadata ?? null,
            book.downloaded ?? 0,
        ]
    );
}

export async function upsertAudiobooks(books: Audiobook[]) {
    let db = getDb()
    if (!db) {
        initDb()
        db = getDb()
    }
    await db.withTransactionAsync(async () => {
        for (const b of books) {
            await db.runAsync(
                `INSERT OR REPLACE INTO audiobooks
          (id, author, series, title, cover_art, local_path, metadata, downloaded)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    b.id,
                    b.author,
                    b.series ?? null,
                    b.title,
                    b.cover_art ?? null,
                    b.local_path ?? null,
                    b.metadata ?? null,
                    b.downloaded ?? 0,
                ]
            );
        }
    });
}


export async function upsertFiles(files: FileRow[]) {
    const db = getDb();
    await db.withTransactionAsync(async () => {
        for (const f of files) {
            await db.runAsync(
                `INSERT OR REPLACE INTO files
          (id, book_id, file_name, local_path, duration, channels, sample_rate, bitrate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    f.id,
                    f.book_id,
                    "dummy name",
                    f.local_path ?? null,
                    f.duration ?? null,
                    f.channels ?? null,
                    f.sample_rate ?? null,
                    f.bitrate ?? null,
                ]
            );
        }
    });
}


export async function markBookDownloaded(bookId: number, localPath: string) {
    const db = getDb();
    await db.runAsync(
        `UPDATE audiobooks SET downloaded = 1, local_path = ? WHERE id = ?`,
        [localPath, bookId]
    );
}

export async function getAllBooks(): Promise<Audiobook[]> {
    const db = getDb();
    return db.getAllAsync<Audiobook>(`SELECT * FROM audiobooks ORDER BY title ASC`);
}

export async function getBook(bookId: number): Promise<Audiobook | null> {
    const db = getDb();
    const row = await db.getFirstAsync<Audiobook>(
        `SELECT * FROM audiobooks WHERE id = ? LIMIT 1`,
        [bookId]
    );
    return row ?? null;
}

export async function getFilesForBook(bookId: number): Promise<FileRow[]> {
    const db = getDb();
    return db.getAllAsync<FileRow>(
        `SELECT * FROM files WHERE book_id = ? ORDER BY file_name ASC`,
        [bookId]
    );
}

export async function getFile(fileId: number): Promise<FileRow | null> {
    const db = getDb();
    const row = await db.getFirstAsync<FileRow>(
        `SELECT * FROM files WHERE id = ? LIMIT 1`,
        [fileId]
    );
    return row ?? null;
}

export async function deleteBook(bookId: number) {
    const db = getDb();
    await db.runAsync(`DELETE FROM files where book_id = ?`, [bookId])
    await db.runAsync(`DELETE FROM audiobooks WHERE id = ?`, [bookId]);
    // files + progress are deleted via FK cascade
}

export async function searchBooks(query: string): Promise<Audiobook[]> {
    const db = getDb();
    const q = `%${query}%`;
    return db.getAllAsync<Audiobook>(
        `SELECT * FROM audiobooks
     WHERE title LIKE ? OR author LIKE ? OR series LIKE ?
     ORDER BY title ASC`,
        [q, q, q]
    );
}

/* ---------- Progress ---------- */

export async function getFileProgress(bookId: number, fileId: number): Promise<number> {
    const db = getDb();
    const row = await db.getFirstAsync<{ progress_ms: number }>(
        `SELECT progress_ms FROM progress WHERE book_id = ? AND file_id = ? LIMIT 1`,
        [bookId, fileId]
    );
    return row?.progress_ms ?? 0;
}

export async function setFileProgress(bookId: number, fileId: number, progressMs: number) {
    const db = getDb();
    try {
        await db.runAsync(
            `INSERT INTO progress (book_id, file_id, progress_ms, last_updated)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(file_id, book_id) DO UPDATE SET
       progress_ms = excluded.progress_ms,
       last_updated = CURRENT_TIMESTAMP`,
            [bookId, fileId, progressMs]
        );
    } catch (e) { console.error(e) }
}
export async function setFileProgressBatch(items: { bookId: number, fileId: number; progressMs: number }[]) {
    const db = getDb();
    await db.withTransactionAsync(async () => {
        for (const { bookId, fileId, progressMs } of items) {
            await db.runAsync(
                `INSERT INTO progress (book_id, file_id, progress_ms, last_updated)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(file_id) DO UPDATE SET
           progress_ms = excluded.progress_ms,
           last_updated = CURRENT_TIMESTAMP`,
                [bookId, fileId, progressMs]
            );
        }
    });
}

export async function getProgressForBook(bookId: number) {
    const db = getDb();
    return db.getAllAsync<
        { file_id: number; progress_ms: number; file_name: string; local_path: string | null }
    >(
        `SELECT p.file_id, p.progress_ms, f.file_name, f.local_path
     FROM progress p
     JOIN files f ON f.id = p.file_id
     WHERE f.book_id = ?`,
        [bookId]
    );
}

/* ---------- Utilities ---------- */

export async function resetDb() {
    const db = getDb();
    await db.execAsync(`
    DROP TABLE IF EXISTS progress;
    DROP TABLE IF EXISTS files;
    DROP TABLE IF EXISTS audiobooks;
  `);
    await initDb();
}
