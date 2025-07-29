import { BooksResponse } from "@/app/(tabs)/library";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from "expo-file-system";
import { unzip } from "react-native-zip-archive";
import { deleteBook } from "./db";

const API_URL = "http://192.168.1.3:3000/api";


export async function api(path: string, options: RequestInit = {}) {
    const [token, serverUrl] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('serverUrl'),
    ]);

    const res = await fetch(`${serverUrl}${path}`, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (res.status === 401) {
        throw new Error('Unauthorized. Token expired?');
    }

    return res.json();
}

export async function logout(navigation: any) {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('serverUrl');
    navigation.replace('Login');
}


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
    await FileSystem.deleteAsync(zipPath, { idempotent: false })
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
    const destPath = `${ROOT}${bookId}/`;
    // await FileSystem.deleteAsync(ROOT, { idempotent: false })
    await FileSystem.deleteAsync(destPath, { idempotent: false })
    await deleteBook(bookId)
}

export async function saveProgress(userId: number, bookId: number, fileId: number, position: number) {
    await fetch(`${API_URL}/update_progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, book_id: bookId, file_id: fileId, progress_time_marker: position }),
    });
}

export async function getProgress(userId: number, bookId: number, fileId: number) {
    const res = await fetch(
        `${API_URL}/get_progress/${userId}/${bookId}/${fileId}`
    );
    if (!res.ok) return 0;

    const data = await res.json();
    return data.progress_time_marker ?? 0;
}
