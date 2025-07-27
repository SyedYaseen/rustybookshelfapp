import { BooksResponse } from "@/app/(tabs)/library";
import * as FileSystem from "expo-file-system";
import { unzip } from "react-native-zip-archive";

const API_URL = "http://192.168.1.3:3000/api";

export async function fetchBooks(): Promise<BooksResponse> {
    const res = await fetch(`${API_URL}/list_books`);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return await res.json();
}
export async function fetchBookFilesData(id: number) {
    const res = await fetch(`${API_URL}/file_metadata/${id}`);
    return await res.json();
}


const ROOT = FileSystem.documentDirectory + "audiobooks/";

export async function downloadAndUnzip(bookId: number) {
    const zipPath = `${ROOT}${bookId}.zip`;
    const destPath = `${ROOT}${bookId}/`;
    const url = `${API_URL}/download_book/${bookId}`

    // Ensure "books" directory exists
    await FileSystem.makeDirectoryAsync(ROOT, { intermediates: true });

    console.log("Downloading:", url, "->", zipPath);
    await FileSystem.downloadAsync(url, zipPath);

    console.log("Unzipping:", zipPath, "->", destPath);
    await unzip(zipPath, destPath);

    const files = await listFilesRecursively(destPath);
    console.log(files)
    return { dir: destPath, files };
}

export async function listFilesRecursively(path: string): Promise<string[]> {
    const entries = await FileSystem.readDirectoryAsync(path);
    const result: string[] = [];
    for (const entry of entries) {
        const fullPath = path + (path.endsWith("/") ? "" : "/") + entry;
        const info = await FileSystem.getInfoAsync(fullPath);
        if (info.isDirectory) {
            const sub = await listFilesRecursively(fullPath + "/");
            result.push(...sub);
        } else {
            result.push(fullPath);
        }
    }
    return result;
}

export async function removeLocalBook(bookId: number) {
    const destPath = `${ROOT}${bookId}`;
    await FileSystem.deleteAsync(destPath, { idempotent: false })
}

export async function saveProgress(userId: number, bookId: number, fileId: number, position: number) {
    await fetch(`${API_URL}/update_progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, book_id: bookId, fileId, position_ms: position }),
    });
}

export async function getProgress(userId: number, bookId: number, fileId: number) {
    const res = await fetch(
        `${API_URL}/get_progress/${userId}/${bookId}/${fileId}`
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return data.position_ms ?? 0;
}
