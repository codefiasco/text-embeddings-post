const fs = require("node:fs");
const OpenAI = require("openai");
const { Pinecone } = require("@pinecone-database/pinecone");

const openai = new OpenAI({
  apiKey: /* your OpenAI API key */,
});

const pinecone = new Pinecone({
  apiKey: /* your Pinecone API key */,
});

async function execute() {
  const text = fs.readFileSync("./little-red-riding-hood.txt", {
    encoding: "utf8",
    flag: "r",
  });
  const paragraphs = text.split("\n\n");

  const index = pinecone.index("little-red-riding-hood");

  for (let i = 0; i < paragraphs.length; i++) {
    const text = paragraphs[i];
    const embedding = await getEmbedding(text);

    await index.upsert([
      {
        id: i.toString(),
        values: embedding,
        metadata: {
          text,
        },
      },
    ]);
  }
};

execute();

async function getEmbedding(text) {
  const {
    data: [{ embedding }],
  } = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  return embedding;
}
