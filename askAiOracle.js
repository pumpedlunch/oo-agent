const { ethers } = require("ethers");
const dotenv = require("dotenv");
const OpenAI = require("openai");
dotenv.config();

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CHATGPT_API_KEY = process.env.CHATGPT_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const openai = new OpenAI({
    apiKey: process.env.CHATGPT_API_KEY,
});

const OO_V3_ADDRESS = "0xFd9e2642a170aDD10F53Ee14a93FcF2F31924944"; //Ethereum Sepolia
const ABI = [
    "function assertTruthWithDefaults(bytes calldata claim, address asserter) external returns (bytes32)"
];

const questionString = process.argv[2];
if (!questionString) {
    console.error("Usage: node script.js '<assertion_string>'");
    process.exit(1);
}

async function queryOpenAI(questionString) {
    try {
        const response1 = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            store: true,
            messages: [
                { role: "system", content: "You are a prediction market assistant that determines if a market can be resolved." },
                {
                    role: "user", content: `Can the prediction market rules provided below be resolved? 
                    Respond with only word. Either "yes" if the there is finalzied data that can resolve the market, 
                    or "no" if the event described in the rules has not finished or the data required 
                    to resolve the rules is not yet finalized.
                    2arket rules: ${questionString}`
                }
            ]
        });

        const canBeResolved = response1.choices[0].message.content;
        console.log("Can the market be resolved?", canBeResolved);

        if (canBeResolved === "no") {
            console.error("AI has not found finalized data that can resolve this market");
        } else if (canBeResolved === "yes") {
            const response2 = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                store: true,
                messages: [
                    { role: "system", content: "You are a prediction market assistant that determines how a market should be resolved." },
                    {
                        role: "user", content: `Provide as concise of a resolution as possible to the following prediction market: ${questionString}`
                    }
                ]
            });
            const resolution = response2.choices[0].message.content;
            return resolution

        } else console.error("When asked if the market can be resolved, AI returned an invalid answer:", canBeResolved);
    } catch {
        console.error("Error querying AI:", error);
    }
}

async function queryPerplexity(questionString) {
    const baseURL = 'https://api.perplexity.ai';

    async function makeRequest(messages) {
        try {
            const response = await fetch(`${baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'sonar',
                    messages: messages
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Error making request to Perplexity API:", error);
            throw error;
        }
    }

    try {
        const response1 = await makeRequest([
            { role: "system", content: "You are a prediction market assistant that determines if a market can be resolved." },
            {
                role: "user", content: `Can the prediction market rules provided below be resolved? 
                Respond with only word. Either "yes" if the there is finalized data that can resolve the market, 
                or "no" if the event described in the rules has not finished or the data required 
                to resolve the rules is not yet finalized.
                Market rules: ${questionString}`
            }
        ]);

        const canBeResolved = response1.choices[0].message.content;
        console.log("Can the market be resolved?", canBeResolved);

        if (canBeResolved.toLowerCase().includes("no")) {
            console.error("AI has not found finalized data that can resolve this market");
        } else if (canBeResolved.toLowerCase().includes("yes")) {
            const response2 = await makeRequest([
                { role: "system", content: "You are a prediction market assistant that resolves prediction markets and provides no additional information or supporting references." },
                {
                    role: "user", content: `Provide a concise resolution with no additional information or supporting references to the following prediction market: ${questionString}`
                }
            ]);
            const resolution = response2.choices[0].message.content;
            return resolution;
        } else {
            console.error("When asked if the market can be resolved, AI returned an invalid answer:", canBeResolved);
        }
    } catch (error) {
        console.error("Error querying AI:", error);
    }
}


async function assertTruthWithDefualts(assertionString) {
    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        const contract = new ethers.Contract(OO_V3_ADDRESS, ABI, wallet);

        const claimBytes = ethers.toUtf8Bytes(assertionString);
        const tx = await contract.assertTruthWithDefaults(claimBytes, wallet.address);

        console.log("Transaction sent! Tx Hash:", tx.hash);
        await tx.wait();
        console.log(`Transaction confirmed. View assertion here: https://testnet.oracle.uma.xyz/?transactionHash=${tx.hash}&eventIndex=`);
    } catch (error) {
        console.error("Error calling assertTruthWithDefaults:", error);
    }
}

async function main(questionString) {
    // const answer = await queryOpenAI(questionString);
    const answer = await queryPerplexity(questionString);
    const assertionString = `Question: ${questionString}. AI Agent's Answer: ${answer}`

    console.log(assertionString);
    // assertTruthWithDefualts(assertionString);
}

main(questionString);
