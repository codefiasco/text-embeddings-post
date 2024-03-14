# Text Embeddings: How to talk to your documents

Imagine you have a lot of extensive documents, and somewhere in them there's the answer to a question you really want to know. Sure, you can go through hundreds if not thousands of pages looking for it... Or you can leverage text embedding and chat completion models to help you with this task! Let's see an example.

I have a text file containing the story of the `Little Red Riding Hood` on my machine and I'd like to find out:

- What is the moral of the story?

As a late millennial, I'm not prepared to read through the entire text to find that out. It's much easier to create a small program that uses AI to tell me. So, let's do it!

## Storing our story's information

Since our text is quite big, it is not feasible to use its entirety as part of the context to query our chat completion model (gpt-3.5-turbo) for an answer. We'll first use an embeddings model (text-embedding-3-small) to create a numerical representation of the text and store it in a [vector database](https://www.pinecone.io/learn/vector-database/).
From OpenAI's documentation:

```
Embeddings are a numerical representation of text that can be used to measure the relatedness between two pieces of text. Embeddings are useful for search, clustering, recommendations, anomaly detection, and classification tasks.
```

Which is exactly what we need in order to find the relevant sections of information contained in the story that answer our question!

---

First, create an npm project inside the directory you'll use:

```sh
npm init
```

Next, install a couple of dependencies:

```sh
npm install openai @pinecone-database/pinecone
```

- `openai` - OpenAI's sdk, which makes it easier to use their API;
- `@pinecone-database/pinecone` - the database client we'll use to store the embeddings;

Ok, now that the project has been set up we can start programming!
Create a file called `parse-embeddings.js`. In it write:

```js
// parse-embeddings.js
const fs = require("node:fs");
const OpenAI = require("openai");
const Pinecone = require("@pinecone-database/pinecone");

async function execute() {
  const text = fs.readFileSync("./little-red-riding-hood.txt", {
    encoding: "utf8",
    flag: "r",
  });
  const paragraphs = text.split("\n\n");
}

execute();
```

Here we're loading our entire story and breaking it down into its paragraphs. This is so we can search for the more relevant parts to our question when we later query the database. This process is called **chunking** and there are [many strategies](https://www.pinecone.io/learn/chunking-strategies/) to do it, this is not the best solution but it'll serve our purpose for now.

Once our text has been split, we're going to ask an embeddings model to generate its vector representations. Let's create that function:

```js
// parse-embeddings.js
// ...
const openai = new OpenAI({
  apiKey: /* your OpenAI API key */,
});

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
```

:warning: Don't forget to paste your OpenAI key. To get one, go to [OpenAI's website](https://platform.openai.com/), create an account, navigate to the API key page and click "Create new secret key".

Next, sign up to [Pinecone](https://www.pinecone.io/). This service will provide a vector database to store the embeddings. Their free tier is enough for our purpose.
On your pinecone dashboard, create an index called `little-red-riding-hood` with 1536 dimensions (this is the size of the arrays the [embeddings model](https://platform.openai.com/docs/models/embeddings) we'll use generates).

To finish up, run the function previosuly created for each paragraph and store its result on Pinecone:

```js
// parse-embeddings.js
// ...
const pinecone = new Pinecone({
    apiKey: /* your Pinecone API key */,
});

async function execute() {
  // ...

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
}

// ...
```

:warning: Don't forget to grab your API key from Pinecone, it's in the API Keys tab of your dashboard.

> We're running the requests sequentially because OpenAI has small [rate limits on their free tier](https://platform.openai.com/docs/guides/rate-limits/usage-tiers?context=tier-free), this way their SDK will make sure we wait the appropriate amount of time between requests.

Notice that in the snippet above we're associating the original text as part of the metadata of each embedding. When we later fetch the records from Pinecone we'll only have access to the embeddings vector that was inserted, so we'll use this metadata to know what the original text was.

We're now ready to import the story into the db!

```sh
node parse-embeddings.js
```

> OpenAI's API is paid but, at the time of writing, there is a free 5$ credit on sign up. This is way more than enough for this example (I only spent 1 cent). You can see your spending on the [billing settings dashboard](https://platform.openai.com/account/billing/overview).

## Getting some answers

Now that our document has been parsed and stored in a vector database we can finally get some answers! We'll first need to retrieve the most relevant paragraphs from the document.
Create a new file called `query-document.js` and let's set it up:

```js
// query-document.js
const question = "What is the moral of the story?";

const OpenAI = require("openai");
const { Pinecone } = require("@pinecone-database/pinecone");

const openai = new OpenAI({
  apiKey: /* your OpenAI API key */,
});

const pinecone = new Pinecone({
  apiKey: /* your Pinecone API key */,
});

const index = pinecone.index("little-red-riding-hood");

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

async function execute() {
  // this is where we'll work
}

execute();
```

:warning: Remember to paste your OpenAI and Pinecone keys.

In the above snippet we're setting up OpenAI and Pinecone clients, defining the question we want to answer and have copied the `getEmbedding` function from the other script.

With that out of the way, let's continue:

```js
// query-document.js
// ...
async function execute() {
  const queryEmbedding = await getEmbedding(question);
  const result = await index.query({
    vector: queryEmbedding,
    topK: 5,
    includeMetadata: true,
  });

  const paragraphs = result.matches.map(({ metadata: { text } }) => text);
}

// ...
```

In the snippet above we first generate the embeddings representation of the question, then use it to fetch the 5 most relevant chunks from the db and finnaly extract their original text. The model that generated the stored embeddings has to be the same used for que question embeddings for this to work correctly (different models represent and understand data differently).

Now that we have the most relevant information, we can take it and ask `gpt-3.5-turbo` for an answer to our question:

```js
// query-document.js
// ...

async function execute() {
  // ...

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

// ...
```

And that's it! Let's see what we get:

```sh
node query-document.js
> The moral of the story of Little Red Riding Hood is to always listen to your elders, follow directions, and be cautious of strangers. It teaches the importance of staying on the right path, not trusting unfamiliar individuals, and being aware of potential dangers in the world.
```

That sounds interesting, I should give it a read!

You can play around with different questions and different prompts to see what results you get. Keep in mind that you only need to import the document into the db once.

## Conclusion

This has been a very simple and naive example of how you can parse your own documents and get answers to questions in them. There is a lot of information surrounding this topic and I hope your curiosity has been sparked! If you want to dive deeper, I suggest starting with [Pinecone's picks on core components articles](https://www.pinecone.io/learn/category/core-components/). They talk about what a vector db is, how it can help when working with LLMs and how different chunking statregies work. Have fun!

You can check the final code examples for the scripts in this article on [this repo](https://github.com/codefiasco/text-embeddings-post).
