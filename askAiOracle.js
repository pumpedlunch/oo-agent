const { ethers } = require("ethers");
const dotenv = require("dotenv");
const OpenAI = require("openai");
dotenv.config();

const RPC_URL = process.env.RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const CHATGPT_API_KEY = process.env.CHATGPT_API_KEY || "";
const openai = new OpenAI({
    apiKey: "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",
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

async function queryAI(questionString) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            store: true,
            messages: [
                { role: "system", content: "You are an oracle assistant that helps posts concise answers to onchain queries." },
                { role: "user", content: `Provide as concise as an answer as possible to the following question: ${questionString}` }
            ]
        });

        const answer = response.choices[0].message.content;
        console.log("AI's Agent's Answer:", answer);
        return answer;
    } catch {
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
    const answer = await queryAI(questionString);
    const assertionString = `Question: ${questionString}
    AI Agent's Answer: ${answer}`
    assertTruthWithDefualts(assertionString);
}

main(questionString);
