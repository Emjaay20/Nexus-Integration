import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { pipeline } from '@xenova/transformers';
import { helpDocs } from '@/lib/docsData';

// Singleton for the feature extraction pipeline
let extractor: any = null;

async function getExtractor() {
    if (!extractor) {
        // Load the model. Using all-MiniLM-L6-v2 for fast embeddings.
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            quantized: true,
        });
    }
    return extractor;
}

// Helper to compute cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Pre-compute embeddings for docs (In production, cache this or store in a vector DB)
let docEmbeddings: { id: string; embedding: number[]; content: string }[] = [];

async function initializeDocEmbeddings() {
    if (docEmbeddings.length > 0) return;
    const extract = await getExtractor();
    
    for (const doc of helpDocs) {
        const textToEmbed = `${doc.title}\n${doc.content}`;
        const output = await extract(textToEmbed, { pooling: 'mean', normalize: true });
        docEmbeddings.push({
            id: doc.id,
            embedding: Array.from(output.data),
            content: textToEmbed,
        });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { message } = await req.json();
        
        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // 1. Initialize embeddings if not done
        await initializeDocEmbeddings();

        // 2. Embed the user's query
        const extract = await getExtractor();
        const queryOutput = await extract(message, { pooling: 'mean', normalize: true });
        const queryEmbedding = Array.from(queryOutput.data) as number[];

        // 3. Find the most relevant document
        let bestMatch = null;
        let highestScore = -1;

        for (const doc of docEmbeddings) {
            const score = cosineSimilarity(queryEmbedding, doc.embedding);
            if (score > highestScore) {
                highestScore = score;
                bestMatch = doc;
            }
        }

        // Only use context if the similarity score is decent (e.g., > 0.3)
        const relevantContext = highestScore > 0.3 && bestMatch ? bestMatch.content : "No highly relevant documentation found.";

        // 4. Generate response using Gemini API
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            // Fallback if no API key is provided
            return NextResponse.json({ 
                reply: `(Simulated AI Response)\nBased on your query, here is relevant info:\n\n${relevantContext}` 
            });
        }

        const ai = new GoogleGenAI({ apiKey });
        
        const systemPrompt = `You are the Nexus support assistant. 
You help users with the Nexus Integration Hub. 
Answer the user's question concisely based ONLY on the provided context. 
If the context does not contain the answer, say you don't know and suggest they contact support.

Context:
${relevantContext}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.3,
            }
        });

        return NextResponse.json({ reply: response.text });

    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
