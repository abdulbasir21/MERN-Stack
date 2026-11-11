# MongoDB Atlas Search & Vector Search Index Definitions

Path: `server/src/ai/indexes/`

These indexes must be configured in MongoDB Atlas on the `documentchunks` collection.

---

## 1. Vector Search Index (`vector_index`)

- **Database:** `scopesentry` (or your active database name)
- **Collection:** `documentchunks`
- **Index Name:** `vector_index`
- **Index Type:** Vector Search (JSON Editor)

### Definition:
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "ownerId"
    },
    {
      "type": "filter",
      "path": "projectId"
    },
    {
      "type": "filter",
      "path": "documentId"
    },
    {
      "type": "filter",
      "path": "documentCategory"
    }
  ]
}
```

---

## 2. Full-Text Search Index (`keyword_index`)

- **Database:** `scopesentry`
- **Collection:** `documentchunks`
- **Index Name:** `keyword_index`
- **Index Type:** Atlas Search (JSON Editor)

### Definition:
```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "text": {
        "type": "string",
        "analyzer": "lucene.standard",
        "searchAnalyzer": "lucene.standard"
      },
      "ownerId": {
        "type": "objectId"
      },
      "projectId": {
        "type": "objectId"
      },
      "documentId": {
        "type": "objectId"
      },
      "documentCategory": {
        "type": "token"
      }
    }
  }
}
```

---

## Creation Steps in Atlas Web UI:
1. Log in to MongoDB Atlas and navigate to **Atlas Search**.
2. Click **Create Search Index**.
3. For the vector index, select **Atlas Vector Search** > **JSON Editor**, select your database and `documentchunks` collection, paste the contents of `atlas-vector-index.json`, name it `vector_index`, and click **Create Vector Search Index**.
4. For the keyword index, select **Atlas Search** > **JSON Editor**, select the same `documentchunks` collection, paste the contents of `atlas-search-index.json`, name it `keyword_index`, and click **Create Search Index**.
