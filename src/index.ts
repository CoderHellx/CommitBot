import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { GoogleGenAI } from "@google/genai";

const execFileAsync = promisify(execFile);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    return (error as { status: number }).status;
  }
  return undefined;
}

async function generateCommitMessage(diff: string): Promise<string> {
  const prompt = `Read the diff and then create a summarized commit message
  the summary line should be under about 60 characters and then optionally a short body
  no quotes, no explanation only the message
  Diff: ${diff}`;
  const maxAttempts = 5;
  let seconds = 1;

  for(let attempt = 0; attempt < maxAttempts; attempt++) {
    try{
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
        });
        return response.text ?? "";
    }
    catch(error){
        const status = getStatus(error);
        const retryable = status === 503 || status === 429;
        const lastAttempt = attempt === maxAttempts - 1;
        if(!retryable || lastAttempt){
            throw(error);
        }
        console.log(
        `Model busy, retrying in ${seconds} seconds (attempt ${attempt + 1} of ${maxAttempts})...`
      );
      await sleep(seconds * 1000);
      seconds *= 2;

    }
  }
  throw new Error("Failed to generate a commit message.");
}

async function getStagedDiff(): Promise<string>{
    const { stdout } = await execFileAsync("git", ["diff", "--staged"]);
    return stdout;
}


async function main() {
    const diff = await getStagedDiff();
    if(diff.trim() === ""){
        console.log("No staged changes. Run 'git add' first.")
        return;
    }
        
    else{
        const msg = await generateCommitMessage(diff);
        console.log(msg);
    }
        
}

main();


//Suggestions:
//This bot currently generates a commit message but we would want it to be able to commit it itself
//This model can be automated with different scripts in the future