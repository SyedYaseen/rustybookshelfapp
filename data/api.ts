import { BooksResponse } from "@/app/(tabs)/library";

const API_URL = "http://192.168.1.8:3000/api";

export async function fetchBooks(): Promise<BooksResponse> {
    const res = await fetch(`${API_URL}/list_books`);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return await res.json();
}
export async function fetchBookDetails(id: string) {
    const res = await fetch(`${API_URL}/books/${id}`);
    return await res.json();
}
