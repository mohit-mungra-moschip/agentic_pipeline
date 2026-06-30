import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

async function getTestFiles(dir: string, baseDir: string): Promise<string[]> {
  let results: string[] = [];
  try {
    const list = await fs.readdir(dir, { withFileTypes: true });
    for (const file of list) {
      const resPath = path.resolve(dir, file.name);
      if (file.isDirectory()) {
        if (file.name !== "__pycache__" && file.name !== "node_modules") {
          const nested = await getTestFiles(resPath, baseDir);
          results = results.concat(nested);
        }
      } else if (file.isFile() && file.name.startsWith("test_") && file.name.endsWith(".py")) {
        results.push(path.relative(baseDir, resPath));
      }
    }
  } catch (e) {
    // Directory might not exist or be accessible
  }
  return results;
}

export async function GET() {
  try {
    const projectRoot = path.resolve(process.cwd(), "..");
    const testsDir = path.join(projectRoot, "tests");
    const testFiles = await getTestFiles(testsDir, projectRoot);
    return NextResponse.json({ tests: testFiles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
