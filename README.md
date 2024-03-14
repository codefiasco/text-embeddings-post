# Text embeddings blog post

This repository holds the final code examples for the blog post [Text Embeddings: How to talk to your documents](link to post here).

## Loading a document

To parse a document's embeddings and store in a pinecone index:

```sh
OPEN_AI_KEY=<open-ai-key> PINECONE_KEY=<pinecone-key> INDEX_NAME=<pinecone-index> FILE_PATH=<path-to-file> node parse-embeddings.js
```

## Answering a question

To answer a question from a previously imported document:

```sh
OPEN_AI_KEY=<open-ai-key> PINECONE_KEY=<pinecone-key> INDEX_NAME=<pinecone-index> QUESTION=<question>  node parse-embeddings.js
```
