import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

// Keep track of run status and process reference in-memory
let isRunning = false;
let childProcess: any = null;

export async function GET() {
  try {
    const reportsDir = path.resolve(process.cwd(), "../reports");
    const activeRunPath = path.join(reportsDir, "active_run.json");
    
    const content = await fs.readFile(activeRunPath, "utf-8");
    const activeRun = JSON.parse(content);
    
    if (activeRun.running) {
      isRunning = true;
      return NextResponse.json(activeRun);
    } else {
      isRunning = false;
    }
  } catch (e) {
    // If reading active_run.json fails, fallback to in-memory status
  }

  return NextResponse.json({ running: isRunning });
}

export async function POST(request: Request) {
  if (isRunning) {
    return NextResponse.json({ error: "Pipeline is already running" }, { status: 400 });
  }

  let command = "pytest tests/integration/test_api_users.py -v --tb=short";
  try {
    const body = await request.json();
    if (body.command && typeof body.command === "string") {
      command = body.command.trim();
    }
  } catch (e) {
    // Fallback to default if body is missing or malformed
  }

  isRunning = true;

  try {
    const projectRoot = path.resolve(process.cwd(), "..");
    
    // Check if .venv exists and use it, otherwise fallback to system python3
    const venvPython = path.join(projectRoot, ".venv", "bin", "python");
    let pythonExecutable = "python3";
    try {
      await fs.access(venvPython);
      pythonExecutable = venvPython;
    } catch (e) {}

    // Spawn the runner in the background using the dynamic command
    const child = spawn(
      pythonExecutable,
      ["regression_runner.py", "-c", command],
      {
        cwd: projectRoot,
        env: { ...process.env, PYTHONUNBUFFERED: "1" }
      }
    );

    childProcess = child;

    child.stdout.on("data", (data) => {
      console.log(`[runner-stdout] ${data.toString().trim()}`);
    });

    child.stderr.on("data", (data) => {
      console.error(`[runner-stderr] ${data.toString().trim()}`);
    });

    child.on("close", async (code) => {
      console.log(`[runner] Pipeline runner process exited with code ${code}`);
      isRunning = false;
      childProcess = null;
      
      try {
        const reportsDir = path.resolve(process.cwd(), "../reports");
        const activeRunPath = path.join(reportsDir, "active_run.json");
        if (code === 0) {
          await fs.writeFile(activeRunPath, JSON.stringify({ running: false, stage: "Completed", percentage: 100 }));
        } else {
          try {
            const content = await fs.readFile(activeRunPath, "utf-8");
            const data = JSON.parse(content);
            if (data.running) {
              await fs.writeFile(activeRunPath, JSON.stringify({ 
                running: false, 
                stage: "Stopped", 
                percentage: 100,
                message: `Pipeline exited with code ${code}.`
              }));
            }
          } catch (e) {
            await fs.writeFile(activeRunPath, JSON.stringify({ 
              running: false, 
              stage: "Stopped", 
              percentage: 100,
              message: `Pipeline stopped (exit code ${code}).` 
            }));
          }
        }
      } catch (err) {}
    });

    return NextResponse.json({ success: true, running: true });
  } catch (error: any) {
    isRunning = false;
    childProcess = null;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  if (!isRunning && !childProcess) {
    return NextResponse.json({ error: "No active pipeline to stop" }, { status: 400 });
  }

  try {
    if (childProcess) {
      childProcess.kill("SIGTERM");
      childProcess = null;
    }
    isRunning = false;

    // Update active_run.json status to indicate it was stopped
    try {
      const reportsDir = path.resolve(process.cwd(), "../reports");
      const activeRunPath = path.join(reportsDir, "active_run.json");
      await fs.writeFile(activeRunPath, JSON.stringify({ 
        running: false, 
        stage: "Stopped", 
        percentage: 0, 
        message: "Pipeline run manually stopped by user." 
      }));
    } catch (e) {}

    return NextResponse.json({ success: true, message: "Pipeline stopped successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
