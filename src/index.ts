import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { GoogleGenAI } from "@google/genai";

const execFileAsync = promisify(execFile);
const ai = new GoogleGenAI({}); 



async function generateCommitMessage(diff: string): Promise<string> {
  const prompt = `Read the diff and then create a summarized commit message
  the summary line should be under about 60 characters and then optionally a short body
  no quotes, no explanation only the message
  Diff: ${diff}`;
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
});
  return response.text;
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
        //return;
    }
        
}

main();