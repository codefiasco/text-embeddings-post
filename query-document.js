const OpenAI = require("openai");
const { Pinecone } = require("@pinecone-database/pinecone");

const openai = new OpenAI({
  apiKey: /* your OpenAI API key */,
});

const pinecone = new Pinecone({
  apiKey: /* your Pinecone API key */,
});

const index = pinecone.index("embeddings-post");

const question = "What is the moral of the story?";

async function execute() {
  const queryEmbedding = await getEmbedding(question);
  const result = await index.query({
    vector: queryEmbedding,
    topK: 5,
    includeMetadata: true,
  });

  const paragraphs = result.matches.map(({ metadata: { text } }) => text);

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `Answer the user's question using the following chunks:
        ${paragraphs.join("\n")}
        `,
      },
      { role: "user", content: question },
    ],
    model: "gpt-3.5-turbo",
  });

  console.log(completion.choices[0].message.content);
}

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

execute();
